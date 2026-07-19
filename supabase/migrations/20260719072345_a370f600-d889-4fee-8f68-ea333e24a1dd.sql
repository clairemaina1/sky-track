
-- 1. Link crew to auth user (nullable — not every crew row is a platform user)
ALTER TABLE public.crew ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS crew_user_id_idx ON public.crew(user_id);

-- 2. Priority enum
DO $$ BEGIN
  CREATE TYPE public.notification_priority AS ENUM ('critical','high','normal','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- null = broadcast to org
  target_role app_role, -- null = any role
  priority public.notification_priority NOT NULL DEFAULT 'normal',
  category text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_org_created_idx ON public.notifications(org_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Read: mine, or org-broadcast to my role (or any role) if I'm in the org
CREATE POLICY "notifications_select_own_or_org_broadcast"
ON public.notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    user_id IS NULL
    AND public.user_in_org(auth.uid(), org_id)
    AND (
      target_role IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.org_id = notifications.org_id AND m.user_id = auth.uid()
          AND (notifications.target_role IS NULL OR m.role = notifications.target_role)
      )
    )
  )
  OR public.is_super_admin(auth.uid())
);

-- Update: only own row, only read_at flip
CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Insert: org admin or super admin (system inserts happen via SECURITY DEFINER triggers)
CREATE POLICY "notifications_insert_admin"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_org_role(auth.uid(), org_id, 'admin')
);

-- Delete: super admin only
CREATE POLICY "notifications_delete_super_admin"
ON public.notifications FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 4. Emit-notification helper (SECURITY DEFINER, restricted)
CREATE OR REPLACE FUNCTION public.emit_notification(
  _org_id uuid,
  _user_id uuid,
  _target_role app_role,
  _priority public.notification_priority,
  _category text,
  _title text,
  _body text,
  _action_url text,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.notifications (org_id, user_id, target_role, priority, category, title, body, action_url, metadata)
  VALUES (_org_id, _user_id, _target_role, _priority, _category, _title, _body, _action_url, _metadata)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

REVOKE ALL ON FUNCTION public.emit_notification(uuid,uuid,app_role,public.notification_priority,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

-- 5. Trigger: crew_assignments changes → push notifications
CREATE OR REPLACE FUNCTION public.notify_crew_assignment_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  crew_user uuid;
  flight_no text;
  crew_name text;
BEGIN
  SELECT c.user_id, c.full_name INTO crew_user, crew_name FROM public.crew c WHERE c.id = NEW.crew_id;
  SELECT f.flight_number INTO flight_no FROM public.flights f WHERE f.id = NEW.flight_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'offered' AND NEW.layer = 'pilot' AND crew_user IS NOT NULL THEN
    PERFORM public.emit_notification(
      NEW.org_id, crew_user, NULL, 'high', 'crew_offer',
      'Flight command offered: ' || COALESCE(flight_no,'—'),
      'You have until ' || to_char(NEW.expires_at AT TIME ZONE 'UTC', 'HH24:MI') || 'Z to accept or decline.',
      '/allocation',
      jsonb_build_object('assignment_id', NEW.id, 'expires_at', NEW.expires_at)
    );
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'auto_assigned' AND NEW.layer = 'cabin' AND crew_user IS NOT NULL THEN
    PERFORM public.emit_notification(
      NEW.org_id, crew_user, NULL, 'normal', 'crew_dispatch',
      'You have been dispatched to ' || COALESCE(flight_no,'a flight'),
      'Auto-assigned to cabin crew roster.',
      '/allocation',
      jsonb_build_object('assignment_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'offered' AND NEW.status <> OLD.status THEN
    -- Broadcast to org dispatchers/admins
    PERFORM public.emit_notification(
      NEW.org_id, NULL, 'dispatcher', 
      CASE WHEN NEW.status = 'accepted' THEN 'normal'
           WHEN NEW.status IN ('declined','expired','cascaded') THEN 'high'
           ELSE 'normal' END,
      'crew_response',
      COALESCE(crew_name,'A pilot') || ' — ' || NEW.status || ' on ' || COALESCE(flight_no,'flight'),
      NULL, '/allocation',
      jsonb_build_object('assignment_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_crew_assignment ON public.crew_assignments;
CREATE TRIGGER trg_notify_crew_assignment
  AFTER INSERT OR UPDATE ON public.crew_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_crew_assignment_event();

REVOKE ALL ON FUNCTION public.notify_crew_assignment_event() FROM PUBLIC, anon, authenticated;

-- 6. Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

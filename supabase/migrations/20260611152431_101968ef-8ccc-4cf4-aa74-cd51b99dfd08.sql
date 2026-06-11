
REVOKE EXECUTE ON FUNCTION public.create_organization_with_admin(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin(text, text) TO authenticated;

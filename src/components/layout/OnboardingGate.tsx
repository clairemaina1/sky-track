import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useMyOrgs } from "@/hooks/use-org";

/**
 * Redirects signed-in users with zero org memberships to the onboarding wizard.
 * Sits inside the auth-protected Shell so it only runs after the session check.
 */
export function OnboardingGate() {
  const { data: orgs, isLoading } = useMyOrgs();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (isLoading) return;
    if (!orgs) return;
    if (orgs.length === 0 && path !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [orgs, isLoading, path, navigate]);

  return null;
}

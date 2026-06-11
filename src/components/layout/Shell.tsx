import { Outlet, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { StatusStrip } from "./StatusStrip";
import { AlertToast } from "@/components/ui/AlertToast";
import { OnboardingGate } from "./OnboardingGate";
import { useUiStore } from "@/stores/uiStore";
import { SkyChat } from "@/components/ai/SkyChat";

export function Shell() {
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex flex-col bg-void">
      <OnboardingGate />
      <div className="flex-1 flex relative">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileNav(false)}
              aria-hidden
            />
            <div className="relative z-10 h-full">
              <Sidebar onNavigate={() => setMobileNav(false)} forceExpanded />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto p-3 sm:p-4">
            <div key={path} className="page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <StatusStrip />
      <AlertToast />
      <SkyChat />
    </div>
  );
}

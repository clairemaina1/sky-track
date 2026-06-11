import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { StatusStrip } from "./StatusStrip";
import { AlertToast } from "@/components/ui/AlertToast";
import { OnboardingGate } from "./OnboardingGate";

export function Shell() {
  return (
    <div className="min-h-screen flex flex-col bg-void">
      <OnboardingGate />
      <div className="flex-1 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
      <StatusStrip />
      <AlertToast />
    </div>
  );
}

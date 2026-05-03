import { create } from "zustand";
import type { Alert } from "@/lib/types";

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  setAll: (alerts: Alert[]) => void;
  push: (alert: Alert) => void;
  acknowledge: (id: string) => void;
  toastQueue: Alert[];
  pushToast: (a: Alert) => void;
  popToast: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  toastQueue: [],
  setAll: (alerts) =>
    set({ alerts, unreadCount: alerts.filter((a) => !a.acknowledged).length }),
  push: (alert) =>
    set((s) => {
      if (s.alerts.find((a) => a.id === alert.id)) return s;
      const next = [alert, ...s.alerts];
      return {
        alerts: next,
        unreadCount: next.filter((a) => !a.acknowledged).length,
      };
    }),
  acknowledge: (id) =>
    set((s) => {
      const next = s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
      return { alerts: next, unreadCount: next.filter((a) => !a.acknowledged).length };
    }),
  pushToast: (a) => set((s) => ({ toastQueue: [...s.toastQueue, a] })),
  popToast: () => set((s) => ({ toastQueue: s.toastQueue.slice(1) })),
}));

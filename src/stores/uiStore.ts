import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/lib/i18n";

export type Theme = "dark" | "light";
export type Lang = "en" | "fr";

interface UiState {
  theme: Theme;
  lang: Lang;
  mobileNavOpen: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  setMobileNav: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      lang: "en",
      mobileNavOpen: false,
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setLang: (l) => {
        set({ lang: l });
        if (typeof window !== "undefined") {
          void i18n.changeLanguage(l);
        }
      },
      setMobileNav: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: "skytrack.ui",
      partialize: (s) => ({ theme: s.theme, lang: s.lang }),
      onRehydrateStorage: () => (state) => {
        if (state?.lang && typeof window !== "undefined") {
          void i18n.changeLanguage(state.lang);
        }
      },
    },
  ),
);

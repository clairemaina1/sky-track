import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

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
          // Persist per-user so the pref follows the account across devices.
          void supabase.auth.updateUser({ data: { lang: l } }).catch(() => {});
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

// Hydrate lang from the signed-in user's metadata whenever auth state changes.
if (typeof window !== "undefined") {
  const applyFromUser = async () => {
    const { data } = await supabase.auth.getUser();
    const l = data.user?.user_metadata?.lang as Lang | undefined;
    if (l && (l === "en" || l === "fr") && l !== useUiStore.getState().lang) {
      useUiStore.setState({ lang: l });
      void i18n.changeLanguage(l);
    }
  };
  void applyFromUser();
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "USER_UPDATED") void applyFromUser();
  });
}


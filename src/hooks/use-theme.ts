import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import i18n from "@/lib/i18n";

/** Applies theme + language to <html> on mount and whenever they change. */
export function useThemeAndLangSync() {
  const theme = useUiStore((s) => s.theme);
  const lang = useUiStore((s) => s.lang);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [lang]);
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      nav: {
        dashboard: "Dashboard",
        fleet: "Fleet",
        mro: "Maintenance",
        crew: "Crew",
        cargo: "Cargo",
        routing: "Routing",
        disruption: "Disruption",
        carbon: "Carbon",
        settings: "Settings",
        admin: "Admin",
        signOut: "Sign out",
      },
      common: {
        export: "Export",
        exportPdf: "Export PDF",
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel",
        confirm: "Confirm",
        delete: "Delete",
        search: "Search",
        theme: "Theme",
        language: "Language",
        lightMode: "Light",
        darkMode: "Dark",
      },
      fleet: {
        title: "Fleet",
        subtitle: "Live aircraft registry from Lovable Cloud · auto-refresh every 30s.",
        strength: "Fleet Strength",
        airborne: "Active Airborne",
        aogCritical: "AOG / Critical",
        avgHealth: "Avg Health",
        alerts: "Health Alerts",
      },
    },
  },
  fr: {
    translation: {
      nav: {
        dashboard: "Tableau de bord",
        fleet: "Flotte",
        mro: "Maintenance",
        crew: "Équipage",
        cargo: "Cargaison",
        routing: "Routage",
        disruption: "Perturbation",
        carbon: "Carbone",
        settings: "Paramètres",
        admin: "Admin",
        signOut: "Déconnexion",
      },
      common: {
        export: "Exporter",
        exportPdf: "Exporter PDF",
        loading: "Chargement...",
        save: "Enregistrer",
        cancel: "Annuler",
        confirm: "Confirmer",
        delete: "Supprimer",
        search: "Rechercher",
        theme: "Thème",
        language: "Langue",
        lightMode: "Clair",
        darkMode: "Sombre",
      },
      fleet: {
        title: "Flotte",
        subtitle: "Registre des aéronefs en direct depuis Lovable Cloud · actualisation toutes les 30s.",
        strength: "Effectif de la flotte",
        airborne: "En vol",
        aogCritical: "AOG / Critique",
        avgHealth: "Santé moyenne",
        alerts: "Alertes santé",
      },
    },
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: typeof window !== "undefined"
      ? (JSON.parse(localStorage.getItem("skytrack.ui") || "{}")?.state?.lang ?? "en")
      : "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;

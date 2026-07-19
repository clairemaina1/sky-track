import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      nav: {
        command: "Command",
        fleet: "Fleet",
        mro: "MRO",
        crew: "Crew",
        routing: "Routing",
        cargo: "Cargo",
        disruption: "Disruption AI",
        carbon: "Carbon",
        training: "Training",
        scheduling: "Scheduling",
        settings: "Settings",
        admin: "Admin",
        allocation: "Allocation",
        logbook: "Logbook",
        approvals: "Approvals",
        integrations: "Integrations",
        superadmin: "Super Admin",
        signOut: "Sign out",
      },
      top: {
        commandCenter: "Command Center",
      },
      dash: {
        title: "Command Center",
        tagline: "Flight delay mitigation · Asset utilization · Compliance-ready carbon reporting.",
        fleet: "Fleet",
        fleetHealth: "Fleet Health",
        activeAlerts: "Active Alerts",
        operations: "Operations",
        recentAlerts: "Recent Alerts",
        noAlerts: "No active alerts.",
        tails: "TAILS",
        airborne: "airborne",
        avgScore: "avg score",
        unack: "unacknowledged",
        nominal: "NOMINAL",
        aog: "AOG",
        grounded: "grounded",
        allGo: "all systems go",
      },
      common: {
        save: "Save",
        cancel: "Cancel",
        loading: "Loading…",
      },
    },
  },
  fr: {
    translation: {
      nav: {
        command: "Commande",
        fleet: "Flotte",
        mro: "Maintenance",
        crew: "Équipage",
        routing: "Routage",
        cargo: "Cargaison",
        disruption: "IA Perturbations",
        carbon: "Carbone",
        training: "Formation",
        scheduling: "Planning",
        settings: "Paramètres",
        admin: "Admin",
        allocation: "Affectation",
        logbook: "Carnet de vol",
        approvals: "Approbations",
        integrations: "Intégrations",
        superadmin: "Super Admin",
        signOut: "Déconnexion",
      },
      top: {
        commandCenter: "Centre de commande",
      },
      dash: {
        title: "Centre de commande",
        tagline: "Réduction des retards · Utilisation des actifs · Rapports carbone conformes.",
        fleet: "Flotte",
        fleetHealth: "Santé de la flotte",
        activeAlerts: "Alertes actives",
        operations: "Opérations",
        recentAlerts: "Alertes récentes",
        noAlerts: "Aucune alerte active.",
        tails: "APPAREILS",
        airborne: "en vol",
        avgScore: "score moyen",
        unack: "non acquittées",
        nominal: "NOMINAL",
        aog: "AOG",
        grounded: "au sol",
        allGo: "tous systèmes prêts",
      },
      common: {
        save: "Enregistrer",
        cancel: "Annuler",
        loading: "Chargement…",
      },
    },
  },
};

const initialLang =
  typeof window !== "undefined"
    ? (JSON.parse(localStorage.getItem("skytrack.ui") || "{}")?.state?.lang ?? "en")
    : "en";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;

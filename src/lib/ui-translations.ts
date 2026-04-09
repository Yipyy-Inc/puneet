import type { AppLocale } from "@/lib/language-settings";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

type JsonNode =
  | string
  | number
  | boolean
  | null
  | JsonNode[]
  | { [key: string]: JsonNode };

function isObject(value: unknown): value is { [key: string]: JsonNode } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildLiteralMap(enNode: JsonNode, frNode: JsonNode, map: Map<string, string>) {
  if (typeof enNode === "string" && typeof frNode === "string") {
    map.set(enNode, frNode);
    return;
  }

  if (Array.isArray(enNode) && Array.isArray(frNode)) {
    const length = Math.min(enNode.length, frNode.length);
    for (let i = 0; i < length; i += 1) {
      buildLiteralMap(enNode[i], frNode[i], map);
    }
    return;
  }

  if (isObject(enNode) && isObject(frNode)) {
    for (const key of Object.keys(enNode)) {
      if (!(key in frNode)) continue;
      buildLiteralMap(enNode[key], frNode[key], map);
    }
  }
}

const EN_TO_FR_LITERAL_MAP = (() => {
  const map = new Map<string, string>();
  buildLiteralMap(enMessages as JsonNode, frMessages as JsonNode, map);

  const manual: Record<string, string> = {
    "Language": "Langue",
    "English": "Anglais",
    "French": "Francais",
    "Search...": "Rechercher...",
    "Searching...": "Recherche...",
    "Searching…": "Recherche...",
    "No results found": "Aucun resultat trouve",
    "No results found.": "Aucun resultat trouve.",
    "No data found": "Aucune donnee trouvee",
    "Showing": "Affichage",
    "of": "de",
    "results": "resultats",
    "Create": "Creer",
    "Edit": "Modifier",
    "Save": "Enregistrer",
    "Cancel": "Annuler",
    "Profile Settings": "Parametres du profil",
    "System Settings": "Parametres systeme",
    "Context Switcher": "Changement de contexte",
    "Switch to Facility Admin": "Passer en admin d'etablissement",
    "Switch to Customer": "Passer en client",
    "Switch to Super Admin": "Passer en super admin",
    "Switch to Admin": "Passer en admin",
    "Switch to Facility": "Passer a l'etablissement",
    "Notifications": "Notifications",
    "new": "nouvelles",
    "Mark all as read": "Tout marquer comme lu",
    "No notifications": "Aucune notification",
    "Super Admin": "Super admin",
    "User menu": "Menu utilisateur",
    "Customer Portal": "Portail client",
    "Customer Account": "Compte client",
    "Report Cards": "Bulletins",
    "Billing & Payments": "Facturation et paiements",
    "My Pets": "Mes animaux",
    "Log out": "Se deconnecter",
    "Logout": "Se deconnecter",
    "Yipyy. All rights reserved.": "Yipyy. Tous droits reserves.",
    "Pets / Customers": "Animaux / Clients",
    "Actions": "Actions",
    "View all results": "Voir tous les resultats",
    "Create customer": "Creer un client",
    "Bookings": "Reservations",
    "Estimates": "Estimations",
    "Invoices": "Factures",
    "Global search": "Recherche globale",
    "Search pets, customers, bookings, estimates, invoices...": "Rechercher animaux, clients, reservations, estimations, factures...",
    "Retail Sale": "Vente detail",
    "New Client": "Nouveau client",
    "New Booking": "Nouvelle reservation",
    "New Estimate": "Nouveau devis",
    "Quick Daycare Check-in": "Enregistrement rapide garderie",
    "Waitlist feature coming soon": "Fonction liste d'attente bientot disponible",
    "This feature is not yet implemented.": "Cette fonctionnalite n'est pas encore implementee.",
    "has been removed.": "a ete supprimee.",
    "New client has been added successfully.": "Le nouveau client a ete ajoute avec succes.",
    "New Facility Request": "Nouvelle demande d'etablissement",
    "HealthFirst Clinic has requested to join the platform": "HealthFirst Clinic a demande a rejoindre la plateforme",
    "Subscription Renewed": "Abonnement renouvele",
    "FitLife Gym subscription has been renewed": "L'abonnement FitLife Gym a ete renouvele",
    "SLA Warning": "Alerte SLA",
    "Ticket #TKT-003 is approaching SLA deadline": "Le ticket #TKT-003 approche l'echeance SLA",
    "System Update Complete": "Mise a jour systeme terminee",
    "Platform has been updated to version 2.1.0": "La plateforme a ete mise a jour vers la version 2.1.0",
    "New Booking Request": "Nouvelle demande de reservation",
    "Sarah Johnson requested an appointment for her dog Max": "Sarah Johnson a demande un rendez-vous pour son chien Max",
    "Staff Schedule Updated": "Horaire du personnel mis a jour",
    "Dr. Smith's schedule has been updated for tomorrow": "L'horaire du Dr Smith a ete mis a jour pour demain",
    "Inventory Alert": "Alerte inventaire",
    "Dog food inventory is running low (5 items remaining)": "Le stock de nourriture pour chiens est faible (5 articles restants)",
    "Customer Feedback": "Retour client",
    "New 5-star review from Happy Paws customer": "Nouvel avis 5 etoiles d'un client Happy Paws",
    "2 min ago": "il y a 2 min",
    "5 min ago": "il y a 5 min",
    "15 min ago": "il y a 15 min",
    "30 min ago": "il y a 30 min",
    "1 hour ago": "il y a 1 heure",
    "2 hours ago": "il y a 2 heures",
    "3 hours ago": "il y a 3 heures",
  };

  for (const [enText, frText] of Object.entries(manual)) {
    map.set(enText, frText);
  }

  return map;
})();

function translateWithWhitespace(rawText: string, locale: AppLocale): string {
  if (locale !== "fr") return rawText;

  if (EN_TO_FR_LITERAL_MAP.has(rawText)) {
    return EN_TO_FR_LITERAL_MAP.get(rawText) ?? rawText;
  }

  const leadingWhitespace = rawText.match(/^\s*/)?.[0] ?? "";
  const trailingWhitespace = rawText.match(/\s*$/)?.[0] ?? "";
  const core = rawText.slice(leadingWhitespace.length, rawText.length - trailingWhitespace.length);

  if (!core) return rawText;

  const translatedCore = EN_TO_FR_LITERAL_MAP.get(core);
  if (!translatedCore) return rawText;

  return `${leadingWhitespace}${translatedCore}${trailingWhitespace}`;
}

export function translateUiText(text: string, locale: AppLocale): string {
  return translateWithWhitespace(text, locale);
}

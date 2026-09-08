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

function buildLiteralMap(
  enNode: JsonNode,
  frNode: JsonNode,
  map: Map<string, string>,
) {
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
    Language: "Langue",
    English: "Anglais",
    French: "Français",
    "Search...": "Rechercher...",
    "Searching...": "Recherche...",
    "Searching…": "Recherche...",
    "No results found": "Aucun résultat trouvé",
    "No results found.": "Aucun résultat trouvé.",
    "No data found": "Aucune donnée trouvée",
    Showing: "Affichage",
    of: "de",
    results: "résultats",
    Create: "Créer",
    Edit: "Modifier",
    Save: "Enregistrer",
    Cancel: "Annuler",
    // The fallback when a settings save is refused and the refusal carries no
    // message of its own. It is the sentence a French user reads when RLS
    // declines their row, so it cannot be the only English left on the path.
    "Could not save changes.": "Impossible d’enregistrer les modifications.",
    // The sticky SaveBar — the one save model, so these three reach every
    // screen that adopts it. They had no translation at all while it lived in
    // the loyalty folder.
    "Save changes": "Enregistrer les modifications",
    Discard: "Abandonner",
    "You have unsaved changes": "Vous avez des modifications non enregistrées",
    "Profile Settings": "Paramètres du profil",
    "System Settings": "Paramètres système",
    "Context Switcher": "Changement de contexte",
    "Switch to Facility Admin": "Passer en admin d'établissement",
    "Switch to Customer": "Passer en client",
    "Switch to Super Admin": "Passer en super admin",
    "Switch to Admin": "Passer en admin",
    "Switch to Facility": "Passer à l'établissement",
    Notifications: "Notifications",
    new: "nouvelles",
    "Mark all as read": "Tout marquer comme lu",
    "No notifications": "Aucune notification",
    "Super Admin": "Super admin",
    "User menu": "Menu utilisateur",
    "Customer Portal": "Portail client",
    "Customer Account": "Compte client",
    "Report Cards": "Bulletins",
    "Billing & Payments": "Facturation et paiements",
    "My Pets": "Mes animaux",
    "Log out": "Se déconnecter",
    Logout: "Se déconnecter",
    "Yipyy. All rights reserved.": "Yipyy. Tous droits réservés.",
    "Pets / Customers": "Animaux / Clients",
    Actions: "Actions",
    "View all results": "Voir tous les résultats",
    "Create customer": "Créer un client",
    Bookings: "Réservations",
    Estimates: "Estimations",
    Invoices: "Factures",
    "Global search": "Recherche globale",
    "Search pets, customers, bookings, estimates, invoices...":
      "Rechercher animaux, clients, réservations, estimations, factures...",
    "Retail Sale": "Vente au détail",
    "New Client": "Nouveau client",
    "New Booking": "Nouvelle réservation",
    "New Estimate": "Nouveau devis",
    "Quick Daycare Check-in": "Enregistrement rapide garderie",
    "Waitlist feature coming soon":
      "Fonction liste d'attente bientôt disponible",
    "This feature is not yet implemented.":
      "Cette fonctionnalité n'est pas encore implémentée.",
    "has been removed.": "a été supprimée.",
    "New client has been added successfully.":
      "Le nouveau client a été ajouté avec succès.",
    "New Facility Request": "Nouvelle demande d'établissement",
    "HealthFirst Clinic has requested to join the platform":
      "HealthFirst Clinic a demandé à rejoindre la plateforme",
    "Subscription Renewed": "Abonnement renouvelé",
    "FitLife Gym subscription has been renewed":
      "L'abonnement FitLife Gym a été renouvelé",
    "SLA Warning": "Alerte SLA",
    "Ticket #TKT-003 is approaching SLA deadline":
      "Le ticket #TKT-003 approche l'échéance SLA",
    "System Update Complete": "Mise à jour système terminée",
    "Platform has been updated to version 2.1.0":
      "La plateforme a été mise à jour vers la version 2.1.0",
    "New Booking Request": "Nouvelle demande de réservation",
    "Sarah Johnson requested an appointment for her dog Max":
      "Sarah Johnson a demandé un rendez-vous pour son chien Max",
    "Staff Schedule Updated": "Horaire du personnel mis à jour",
    "Dr. Smith's schedule has been updated for tomorrow":
      "L'horaire du Dr Smith a été mis à jour pour demain",
    "Inventory Alert": "Alerte inventaire",
    "Dog food inventory is running low (5 items remaining)":
      "Le stock de nourriture pour chiens est faible (5 articles restants)",
    "Customer Feedback": "Retour client",
    "New 5-star review from Happy Paws customer":
      "Nouvel avis 5 étoiles d'un client Happy Paws",
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
  const core = rawText.slice(
    leadingWhitespace.length,
    rawText.length - trailingWhitespace.length,
  );

  if (!core) return rawText;

  const translatedCore = EN_TO_FR_LITERAL_MAP.get(core);
  if (!translatedCore) return rawText;

  return `${leadingWhitespace}${translatedCore}${trailingWhitespace}`;
}

export function translateUiText(text: string, locale: AppLocale): string {
  return translateWithWhitespace(text, locale);
}

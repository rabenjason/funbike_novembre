/** Existing home-page promotions and new arrivals. */
import type { HomepagePromotion } from "../types";
import { BIKES } from "./motorcycles";

export const HOME_PROMOTIONS: HomepagePromotion[] = [
  {
    id: "sherco-sef-250-factory-2026",
    badge: "Nouveauté 2026",
    eyebrow: "Sherco / Enduro",
    title: "SEF 250 Factory",
    description:
      "La nouvelle génération Factory arrive chez Funbike : suspensions KYB, châssis affûté et moteur 250 cc.",
    image: BIKES.find((bike) => bike.id === "sherco-sef-250-factory-2026")!.image,
    alt: "Sherco SEF 250 Factory 2026 sur piste",
    highlights: ["Suspensions KYB", "Deux cartographies", "Freinage Galfer"],
    price: "Sur devis",
    targetPage: "product",
    targetId: "sherco-sef-250-factory-2026",
  },
  {
    id: "tvs-200-4v",
    badge: "Arrivage",
    eyebrow: "TVS / Urbain sportif",
    title: "Apache 200 4V",
    description:
      "Une sportive urbaine pensée pour le quotidien : moteur 200 cc, ABS et plusieurs modes de conduite.",
    image: BIKES.find((bike) => bike.id === "tvs-200-4v")!.image,
    alt: "TVS Apache 200 4V",
    highlights: ["ABS", "Modes de conduite", "Tableau de bord digital"],
    price: "Sur devis",
    targetPage: "product",
    targetId: "tvs-200-4v",
  },
  {
    id: "tld",
    badge: "Collection 2026",
    eyebrow: "Troy Lee Designs / Pilote",
    title: "Casques GP Pro",
    description:
      "Les nouveaux graphismes Pulse, Slides et Segment viennent renouveler la gamme de casques pilote.",
    image: "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D2_GPPRO_PULSE_BLACK_01.jpg?v=1785777688&width=533",
    alt: "Casque Troy Lee Designs GP Pro Pulse Black",
    highlights: ["Coque légère", "Ventilation travaillée", "Graphismes inédits"],
    price: "Sur devis",
    targetPage: "equipements",
    targetId: "tld",
  },
];

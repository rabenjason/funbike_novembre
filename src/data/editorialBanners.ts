import { content } from "../constants";
import type { PublicHomepageEditorialBanner } from "../lib/graphqlClient";

/** Secours local historique, utilisé uniquement si l’API publique est indisponible. */
export const HOME_EDITORIAL_BANNERS: PublicHomepageEditorialBanner[] = [
  {
    id: "sherco-50cc",
    eyebrow: content.accueil.sherco.surTitre,
    titleLine1: content.accueil.sherco.titreLigne1,
    titleLine2: content.accueil.sherco.titreLigne2,
    description: content.accueil.sherco.description,
    image: "https://www.sherco.com/wp-content/uploads/SHERCO50ccV2-32.jpg",
    alt: content.accueil.sherco.imageAlt,
    buttonText: content.accueil.sherco.bouton,
    targetPage: "motos",
    targetId: "sherco",
    isActive: true,
    sortOrder: 0,
  },
];

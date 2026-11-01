/**
 * Point d'entrée unique des textes fixes de l'interface.
 * Les contenus administrables (motos, produits, bannières, revendeurs, partenaires)
 * sont typés et regroupés dans src/data.ts ; ils pourront être remplacés par l'API.
 */
import { accueil } from "./accueil";
import { accessoires, equipements } from "./equipements";
import { catalogue, motos } from "./motos";
import { blog, boutons, chat, cookies, footer, messages, navigation, sections, site, visionneuse } from "./navigation";
import { piecesDetachees } from "./pieces-detachees";
import { revendeurs } from "./revendeurs";
import { contact } from "./contact";

export * from "./accueil";
export * from "./contact";
export * from "./equipements";
export * from "./motos";
export * from "./navigation";
export * from "./pieces-detachees";
export * from "./revendeurs";
export { assistantCopy, recommendationCopy } from "./chat";

export const content = {
  site,
  navigation,
  sections,
  boutons,
  messages,
  accueil,
  catalogue,
  motos,
  equipements,
  piecesDetachees,
  accessoires,
  revendeurs,
  contact,
  blog,
  footer,
  cookies,
  visionneuse,
  chat,
} as const;

export type SiteContent = typeof content;

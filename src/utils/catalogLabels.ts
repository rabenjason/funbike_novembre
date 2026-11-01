import { ACCESSORY_BRANDS, type Part } from "../data";
import { content } from "../constants";

/** Libellés de catalogue dérivés des données, distincts du modèle métier. */
export function partBrandLabel(part: Part): string {
  const brand = ACCESSORY_BRANDS.find((item) => item.key === part.kind);
  if (brand) return brand.name;
  if (part.compatibleBrand && part.compatibleBrand !== "Universal") return part.compatibleBrand;
  return content.accessoires.fiche.universel;
}

export function partFamily(part: Part): string {
  return part.kind === "piece" ? content.piecesDetachees.famille : content.accessoires.fiche.equipementFamily;
}

export function partEyebrow(part: Part): string {
  if (part.kind === "tvs") {
    return `${partBrandLabel(part)} / ${part.category ?? content.accessoires.cartes.equipmentFallback}`;
  }
  if (part.kind !== "piece") return partBrandLabel(part);
  if (part.compatibleBrand && part.compatibleBrand !== "Universal") {
    return `${content.accessoires.cartes.pieceEyebrowPrefix} ${part.compatibleBrand}`;
  }
  return content.accessoires.fiche.piecePrefix;
}

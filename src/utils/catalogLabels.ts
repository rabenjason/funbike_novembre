import type { Part } from "../types";
import { content } from "../constants";

/** Libellés de catalogue dérivés des données, distincts du modèle métier. */
export function partBrandLabel(part: Part): string {
  if (part.brandName?.trim()) return part.brandName;
  const compatible = part.compatibleBrands?.[0] ?? part.compatibleBrand;
  if (compatible && compatible !== "Universal") return compatible;
  if (part.universalCompatibility || part.compatibleBrand === "Universal") return content.accessoires.fiche.universel;
  return content.accessoires.cartes.equipmentFallback;
}

export function partFamily(part: Part): string {
  if (part.family) return part.family;
  return part.kind === "piece" ? content.piecesDetachees.famille : content.accessoires.fiche.equipementFamily;
}

export function partEyebrow(part: Part): string {
  if (part.kind === "piece") {
    const compatible = part.universalCompatibility
      ? content.accessoires.fiche.toutesMotos
      : part.compatibleBrands?.join(", ") ?? part.compatibleBrand;
    const details = [part.productType ?? part.partType, compatible ? `compatible ${compatible}` : ""]
      .filter(Boolean)
      .join(" · ");
    return details || content.accessoires.fiche.piecePrefix;
  }

  if (part.productType || part.category) {
    return [partBrandLabel(part), part.productType ?? part.category].filter(Boolean).join(" · ");
  }
  return partBrandLabel(part);
}

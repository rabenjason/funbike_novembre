import type { PartType } from "../types";

/** Existing spare-part type filters; no product-to-subfamily relation is introduced. */
export const SPARE_PART_TYPES = [
  "Pneus",
  "Freinage",
  "Transmission",
  "Filtration",
  "Pièces moteur",
  "Consommables",
] as const satisfies readonly PartType[];

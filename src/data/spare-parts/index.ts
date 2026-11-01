import type { Part, PartType } from "../../types";
import { FANTIC_PARTS } from "./fantic";
import { PARTS } from "./generic";
import { SHERCO_PARTS } from "./sherco";
import { TVS_PARTS } from "./tvs";

export { FANTIC_PARTS } from "./fantic";
export { PARTS } from "./generic";
export { SHERCO_PARTS } from "./sherco";
export { TVS_PARTS } from "./tvs";

/** Existing type labels keyed by the current spare-part IDs. */
const SPARE_PART_TYPE_BY_ID: Record<string, PartType> = {
  // Pièces universelles
  p1: "Freinage",
  p2: "Filtration",
  p3: "Freinage",
  p4: "Consommables",
  p5: "Transmission",
  p6: "Pièces moteur",
  // TVS
  "tvs-part-tyre-front": "Pneus",
  "tvs-part-tyre-rear": "Pneus",
  "tvs-part-chain-kit": "Transmission",
  "tvs-part-brake-pads": "Freinage",
  "tvs-part-air-filter": "Filtration",
  "tvs-part-brake-disc": "Freinage",
  "tvs-part-clutch-cable": "Transmission",
  "tvs-part-service-kit": "Consommables",
  // Sherco
  "sherco-part-chain-kit": "Transmission",
  "sherco-part-brake-disc": "Freinage",
  "sherco-part-filter-kit": "Filtration",
  // Fantic
  "fantic-part-chain-kit": "Transmission",
  "fantic-part-brake-pads": "Freinage",
  "fantic-part-air-filter": "Filtration",
};

/** Toutes les pièces détachées et consommables, avec leur type. */
export const SPARE_PARTS: Part[] = [...PARTS, ...TVS_PARTS, ...SHERCO_PARTS, ...FANTIC_PARTS].map((part) => ({
  ...part,
  partType: SPARE_PART_TYPE_BY_ID[part.id],
}));

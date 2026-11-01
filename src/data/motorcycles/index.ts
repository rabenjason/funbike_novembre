import type { Bike } from "../../types";
import { FANTIC_BIKES } from "./fantic";
import { FUNBIKE_BIKES } from "./funbike";
import { SHERCO_BIKES } from "./sherco";
import { TVS_BIKES } from "./tvs";

export { FANTIC_BIKES } from "./fantic";
export { FUNBIKE_BIKES } from "./funbike";
export { SHERCO_BIKES } from "./sherco";
export { TVS_BIKES } from "./tvs";

/**
 * Historical catalogue order: the first five records interleave Sherco and
 * Fantic before the TVS and Funbike models. Keep this order for all consumers.
 */
export const BIKES: Bike[] = [
  SHERCO_BIKES[0],
  SHERCO_BIKES[1],
  FANTIC_BIKES[0],
  SHERCO_BIKES[2],
  FANTIC_BIKES[1],
  ...TVS_BIKES,
  ...FUNBIKE_BIKES,
];

import type { BikeFamily } from "../types";

/** Existing motorcycle-family filter values; this is not a family record model. */
export const BIKE_FAMILIES = ["Off-road", "Urbain", "3 roues"] as const satisfies readonly BikeFamily[];

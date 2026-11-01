import type { Part } from "../../types";
import { GAERNE } from "./gaerne";
import { MT_HELMETS } from "./mt";
import { TLD } from "./tld";
import { TVS_ACCESSORIES } from "./tvs";

export { GAERNE } from "./gaerne";
export { MT_HELMETS } from "./mt";
export { TLD } from "./tld";
export { TVS_ACCESSORIES } from "./tvs";

/** All existing pilot equipment, preserving its historical concatenation order. */
export const GEAR_ITEMS: Part[] = [...TVS_ACCESSORIES, ...TLD, ...GAERNE, ...MT_HELMETS];

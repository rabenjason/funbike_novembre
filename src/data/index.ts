import type { Part } from "../types";
import { GEAR_ITEMS } from "./equipment";
import { SPARE_PARTS } from "./spare-parts";

export type {
  AccessoryCategory,
  Bike,
  Brand,
  BrandSectionAssociation,
  BrandSectionId,
  Category,
  Dealer,
  FeaturedBanner,
  HomepagePromotion,
  Part,
  PartType,
} from "../types";
export type { BrandId } from "./brands";

export {
  BRANDS,
  LOGO,
  getBrandById,
  getBrandByName,
  getBrandLabel,
  getBrandSection,
  getBrandsForSection,
  getFooterFeaturedMotoBrands,
  getFooterMotoBrands,
  getHomeFeaturedBrands,
  getHomePartnerBrands,
} from "./brands";

export { BIKE_FAMILIES } from "./families";
export { SPARE_PART_TYPES } from "./subfamilies";
export { CATEGORIES } from "./categories";
export { FEATURED_BANNERS } from "./banners";
export { HOME_PROMOTIONS } from "./promotions";
export { DEALERS } from "./dealers";
export { BIKES, FANTIC_BIKES, FUNBIKE_BIKES, SHERCO_BIKES, TVS_BIKES } from "./motorcycles";
export { FANTIC_PARTS, PARTS, SHERCO_PARTS, SPARE_PARTS, TVS_PARTS } from "./spare-parts";
export { GAERNE, GEAR_ITEMS, MT_HELMETS, TLD, TVS_ACCESSORIES } from "./equipment";

/** All current parts and pilot equipment, de-duplicated by ID as before. */
export const ALL_PARTS: Part[] = (() => {
  const seen = new Set<string>();
  return [...SPARE_PARTS, ...GEAR_ITEMS].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
})();

export function findPart(id?: string): Part | undefined {
  if (!id) return undefined;
  return ALL_PARTS.find((p) => p.id === id);
}

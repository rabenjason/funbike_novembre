import type { Brand, BrandSectionAssociation, BrandSectionId } from "../types";

/** Display helpers for a brand record already loaded from GraphQL. */
export function getBrandSection(
  brand: Pick<Brand, "sections"> | undefined,
  section: BrandSectionId,
): BrandSectionAssociation | undefined {
  return brand?.sections.find((association) => association.section === section);
}

export function getBrandLabel(brand: Brand, section: BrandSectionId): string {
  return getBrandSection(brand, section)?.label ?? brand.name;
}

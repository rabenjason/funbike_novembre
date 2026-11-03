import type { Bike, Brand, BrandSectionId, Part } from "../types";
import type { PublicBrand, PublicProduct } from "./graphqlClient";

export function toBrand(brand: PublicBrand): Brand {
  return {
    id: brand.slug,
    name: brand.name,
    logo: brand.logo ?? "",
    logoAlt: brand.logoAlt ?? `Logo ${brand.name}`,
    description: brand.description ?? undefined,
    isActive: brand.isActive,
    sections: (brand.sections ?? []).map((section) => ({
      section: section.section as BrandSectionId,
      order: section.order,
      label: section.label ?? undefined,
      routeId: section.routeId ?? undefined,
      filterable: section.filterable ?? undefined,
      displayMode: section.displayMode as "catalogue" | "partner-info" | undefined,
      homeFeatured: section.homeFeatured ?? undefined,
      footerOrder: section.footerOrder ?? undefined,
      footerFeaturedOrder: section.footerFeaturedOrder ?? undefined,
    })),
  };
}

export function toBike(product: PublicProduct): Bike {
  const image = product.image ?? product.gallery?.[0] ?? "";
  return {
    id: product.id,
    name: product.name,
    brand: product.brand?.name ?? "",
    brandSlug: product.brand?.slug ?? undefined,
    reference: product.reference ?? undefined,
    family: product.family?.name ?? product.subfamily?.family?.name ?? "",
    price: product.price?.trim() || "Sur devis",
    tag: product.tag ?? undefined,
    alt: product.alt ?? product.name,
    image,
    gallery: product.gallery?.length ? product.gallery : [image].filter(Boolean),
    specs: product.specs?.map(({ label, value }) => ({ label, value })) ?? [],
    desc: product.desc ?? "",
    recommendation: product.recommendation ?? undefined,
    publishedAt: product.publishedAt ?? undefined,
  };
}

export function toPart(product: PublicProduct): Part {
  const isSparePart = product.__typename === "SparePart";
  const brandNames = product.compatibleBrands?.map((brand) => brand.name) ?? [];
  const brandSlugs = product.compatibleBrands?.map((brand) => brand.slug) ?? [];
  const image = product.image ?? product.gallery?.[0] ?? "";
  const productType = isSparePart
    ? product.partType?.name
    : product.__typename === "Equipment"
      ? product.equipmentType?.name
      : product.accessoryType?.name;

  return {
    id: product.id,
    name: product.name,
    reference: product.reference ?? undefined,
    price: product.price?.trim() || "Sur devis",
    image,
    gallery: product.gallery?.length ? product.gallery : [image].filter(Boolean),
    kind: isSparePart ? "piece" : product.brand?.slug ?? product.__typename.toLowerCase(),
    brandName: product.brand?.name ?? undefined,
    category: product.category?.name,
    compatibleBrand: product.universalCompatibility
      ? "Universal"
      : brandNames.length === 1
        ? brandNames[0]
        : undefined,
    compatibleBrands: brandNames,
    compatibleBrandSlugs: brandSlugs,
    usages: product.usages?.map((usage) => usage.name) ?? [],
    universalCompatibility: product.universalCompatibility,
    partType: productType,
    productType,
    family: isSparePart ? "Pièce détachée" : "Équipement pilote",
    sourceUrl: product.sourceUrl ?? undefined,
    desc: product.desc ?? undefined,
    specs: product.specs?.map(({ label, value }) => ({ label, value })) ?? [],
  };
}

export function liveBikes(products: PublicProduct[]): Bike[] {
  return products.filter((product) => product.__typename === "Motorcycle").map(toBike);
}

export function liveParts(products: PublicProduct[]): Part[] {
  return products
    .filter((product) => product.__typename !== "Motorcycle")
    .map(toPart);
}

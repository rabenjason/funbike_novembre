import type { Bike, Brand, BrandSectionId, HomepagePromotion, Part } from "../types";
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

const NEW_ARRIVAL_DESCRIPTION_LIMIT = 180;

function truncateDescription(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  if (value.length <= NEW_ARRIVAL_DESCRIPTION_LIMIT) return value;
  return `${value.slice(0, NEW_ARRIVAL_DESCRIPTION_LIMIT - 1).trimEnd()}…`;
}

/** Mappe un produit publié vers une carte « Nouveautés / Arrivages » de la page d’accueil. */
export function toNewArrival(product: PublicProduct): HomepagePromotion {
  const kindLabel = product.__typename === "Motorcycle"
    ? "Moto"
    : product.__typename === "SparePart"
      ? "Pièce détachée"
      : product.__typename === "Equipment"
        ? "Équipement pilote"
        : "Accessoire moto";
  const section = product.__typename === "Motorcycle"
    ? product.family?.name ?? product.subfamily?.family?.name ?? kindLabel
    : product.category?.name ?? kindLabel;
  const eyebrow = product.brand?.name ? `${product.brand.name} / ${section}` : section;
  const specHighlights = (product.specs ?? [])
    .filter((spec) => spec.value.trim())
    .slice(0, 3)
    .map((spec) => `${spec.label} : ${spec.value}`);
  const usageHighlights = (product.usages ?? []).slice(0, 3).map((usage) => usage.name);
  const highlights = specHighlights.length ? specHighlights : usageHighlights;
  const descriptionSource = product.__typename === "Motorcycle"
    ? product.recommendation || product.desc
    : product.desc;
  return {
    id: `new-arrival-${product.id}`,
    badge: product.tag || "Nouveauté",
    eyebrow,
    title: product.name,
    description: truncateDescription(descriptionSource),
    image: product.image ?? product.gallery?.[0] ?? "",
    alt: product.alt ?? product.name,
    highlights,
    price: product.price?.trim() || "Sur devis",
    targetPage: "product",
    targetId: product.id,
    publishedAt: product.publishedAt ?? null,
    startsAt: null,
    endsAt: null,
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

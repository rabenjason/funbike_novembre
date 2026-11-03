import type { Brand, BrandSectionId } from "../types";

/** Ancienne URL de logo conservée pour compatibilité ; l’interface utilise content.site.logoUrl. */
export const LOGO = "https://funbike.mg/wp-content/themes/funbike/images/logo-funbike.png";

/**
 * Anciennes données conservées pour référence uniquement. Elles ne sont pas
 * importées par le site public et ne doivent pas servir de repli ni de seed ;
 * les marques et associations affichées viennent de l’API GraphQL.
 */
export const BRANDS = [
  {
    id: "tvs",
    name: "TVS",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/tvs-logo.png",
    logoAlt: "Logo TVS",
    description: "Robustesse garantie",
    isActive: true,
    sections: [
      { section: "motos", order: 0, homeFeatured: true, footerOrder: 1, footerFeaturedOrder: 2 },
      { section: "equipements", order: 3 },
      { section: "pieces-detachees", order: 0, routeId: "spare-tvs" },
      { section: "partenaires", order: 0 },
    ],
  },
  {
    id: "fantic",
    name: "Fantic",
    logo: "https://funbike.mg/wp-content/themes/funbike/images/fantic.png",
    logoAlt: "Logo Fantic",
    description: "Performance italienne",
    isActive: true,
    sections: [
      { section: "motos", order: 1, homeFeatured: true, footerFeaturedOrder: 1 },
      { section: "pieces-detachees", order: 2, routeId: "spare-fantic" },
      { section: "partenaires", order: 1 },
    ],
  },
  {
    id: "sherco",
    name: "Sherco",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/sherco.png",
    logoAlt: "Logo Sherco",
    description: "ADN Compétition",
    isActive: true,
    sections: [
      { section: "motos", order: 2, homeFeatured: true, footerOrder: 0, footerFeaturedOrder: 0 },
      { section: "pieces-detachees", order: 1, routeId: "spare-sherco" },
      { section: "partenaires", order: 2 },
    ],
  },
  {
    id: "bihr",
    name: "Bihr",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/bihr-logo.jpg",
    logoAlt: "Logo Bihr",
    isActive: true,
    sections: [
      { section: "equipements", order: 4, label: "BIHR", displayMode: "partner-info" },
      {
        section: "pieces-detachees",
        order: 3,
        label: "BIHR",
        routeId: "spare-bihr",
        displayMode: "partner-info",
      },
      { section: "partenaires", order: 3 },
    ],
  },
  {
    id: "trace",
    name: "Trace",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/Trace-1.png",
    logoAlt: "Logo Trace",
    isActive: true,
    sections: [{ section: "partenaires", order: 4 }],
  },
  {
    id: "gaerne",
    name: "Gaerne",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/gaerne-logo.jpg",
    logoAlt: "Logo Gaerne",
    isActive: true,
    sections: [
      { section: "equipements", order: 1 },
      { section: "partenaires", order: 5 },
    ],
  },
  {
    id: "galfer",
    name: "Galfer",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/Galfer-logo.png",
    logoAlt: "Logo Galfer",
    isActive: true,
    sections: [
      { section: "pieces-detachees", order: 4, filterable: false },
      { section: "partenaires", order: 6 },
    ],
  },
  {
    id: "mt",
    name: "MT Helmets",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/mt.png",
    logoAlt: "Logo MT Helmets",
    isActive: true,
    sections: [
      { section: "equipements", order: 2 },
      { section: "partenaires", order: 7 },
    ],
  },
  {
    id: "tld",
    name: "Troy Lee Designs",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/sticker-troy-lee-designs-shield-logo-rouge-16cm.png",
    logoAlt: "Logo Troy Lee Designs",
    isActive: true,
    sections: [
      { section: "equipements", order: 0 },
      { section: "partenaires", order: 8 },
    ],
  },
  {
    id: "funbike",
    name: "Funbike",
    logo: LOGO,
    logoAlt: "Logo Funbike Madagascar",
    isActive: true,
    sections: [{ section: "motos", order: 3 }],
  },
] as const satisfies readonly Brand[];

/** Union d'identifiants dérivée du référentiel, sans seconde liste manuelle. */
export type BrandId = (typeof BRANDS)[number]["id"];

export function getBrandById(id: string | undefined): Brand | undefined {
  return BRANDS.find((brand) => brand.id === id);
}

export function getBrandByName(name: string | undefined): Brand | undefined {
  if (!name) return undefined;
  const normalizedName = name.trim().toLocaleLowerCase("fr");
  return BRANDS.find((brand) => brand.name.toLocaleLowerCase("fr") === normalizedName);
}

export function getBrandSection(
  brandOrId: Brand | string | undefined,
  section: BrandSectionId,
) {
  const brand = typeof brandOrId === "string" ? getBrandById(brandOrId) : brandOrId;
  return brand?.sections.find((association) => association.section === section);
}

export function getBrandLabel(brand: Brand | string, section: BrandSectionId): string {
  const record = typeof brand === "string" ? getBrandById(brand) : brand;
  if (!record) return typeof brand === "string" ? brand : "";
  return getBrandSection(record, section)?.label ?? record.name;
}

export function getBrandsForSection(
  section: BrandSectionId,
  options: { filterableOnly?: boolean } = {},
): Brand[] {
  return BRANDS.filter((brand) => {
    if (!brand.isActive) return false;
    const association = getBrandSection(brand, section);
    return Boolean(association && (!options.filterableOnly || association.filterable !== false));
  }).sort((left, right) => {
    const leftOrder = getBrandSection(left, section)?.order ?? 0;
    const rightOrder = getBrandSection(right, section)?.order ?? 0;
    return leftOrder - rightOrder;
  });
}

export function getHomePartnerBrands(): Brand[] {
  return getBrandsForSection("partenaires");
}

export function getHomeFeaturedBrands(): Brand[] {
  return getBrandsForSection("motos").filter(
    (brand) => getBrandSection(brand, "motos")?.homeFeatured === true,
  );
}

export function getFooterMotoBrands(): Brand[] {
  return getBrandsForSection("motos")
    .filter((brand) => getBrandSection(brand, "motos")?.footerOrder !== undefined)
    .sort(
      (left, right) =>
        (getBrandSection(left, "motos")?.footerOrder ?? 0) -
        (getBrandSection(right, "motos")?.footerOrder ?? 0),
    );
}

export function getFooterFeaturedMotoBrands(): Brand[] {
  return getBrandsForSection("motos")
    .filter((brand) => getBrandSection(brand, "motos")?.footerFeaturedOrder !== undefined)
    .sort(
      (left, right) =>
        (getBrandSection(left, "motos")?.footerFeaturedOrder ?? 0) -
        (getBrandSection(right, "motos")?.footerFeaturedOrder ?? 0),
    );
}

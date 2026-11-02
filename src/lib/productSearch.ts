export type AdminProductSearchable = {
  name: string;
  reference?: string | null;
  desc?: string | null;
  recommendation?: string | null;
  brand?: { name: string } | null;
  family?: { name: string } | null;
  subfamily?: { name: string } | null;
  partType?: { name: string } | null;
  equipmentType?: { name: string } | null;
  accessoryType?: { name: string } | null;
  category?: { name: string } | null;
  compatibleBrands?: Array<{ name: string }> | null;
};

export type ProductSearchPage<T> = { items: T[]; totalCount: number };

function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

export function normalizeAdminProductSearchTerms(value: unknown): string[] {
  const search = typeof value === "string" ? value.trim().slice(0, 160) : "";
  return search.split(/\s+/).filter(Boolean).slice(0, 8).map(foldSearchText);
}

export function searchAndPaginateAdminProducts<T extends AdminProductSearchable>(
  products: readonly T[],
  searchValue: unknown,
  pagination: { limit: number; offset: number },
): ProductSearchPage<T> {
  const terms = normalizeAdminProductSearchTerms(searchValue);
  const matchingProducts = terms.length === 0
    ? [...products]
    : products.filter((product) => {
      const searchableText = foldSearchText([
        product.name,
        product.reference,
        product.desc,
        product.recommendation,
        product.brand?.name,
        product.family?.name,
        product.subfamily?.name,
        product.partType?.name,
        product.equipmentType?.name,
        product.accessoryType?.name,
        product.category?.name,
        product.compatibleBrands?.map((brand) => brand.name).join(" "),
      ].filter((part): part is string => typeof part === "string").join(" "));
      return terms.every((term) => searchableText.includes(term));
    });

  return {
    items: matchingProducts.slice(pagination.offset, pagination.offset + pagination.limit),
    totalCount: matchingProducts.length,
  };
}

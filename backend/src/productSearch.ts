const SEARCHABLE_FIELDS = [
  "name",
  "reference",
  "description",
  "recommendation",
  "searchBrandName",
  "searchFamilyName",
  "searchSubfamilyName",
  "searchPartTypeName",
  "searchEquipmentTypeName",
  "searchAccessoryTypeName",
  "searchCategoryName",
  "searchCompatibleBrandNames",
] as const;

function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

export function normalizeProductSearchTerms(searchValue: unknown): string[] {
  const search = typeof searchValue === "string" ? searchValue.trim().slice(0, 160) : "";
  return search.split(/\s+/).filter(Boolean).slice(0, 8).map(foldSearchText);
}

/** Filter database-loaded product rows in application memory, not in SQL. */
export function filterProductsBySearch<T extends Record<string, unknown>>(
  rows: readonly T[],
  searchValue: unknown,
): T[] {
  const terms = normalizeProductSearchTerms(searchValue);
  if (terms.length === 0) return [...rows];

  return rows.filter((row) => {
    const searchableText = foldSearchText(
      SEARCHABLE_FIELDS
        .map((field) => row[field])
        .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
        .join(" "),
    );
    return terms.every((term) => searchableText.includes(term));
  });
}

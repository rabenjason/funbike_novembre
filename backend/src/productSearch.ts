export type ProductSearchConditions = {
  conditions: string[];
  values: string[];
};

/**
 * Build the shared search filter for catalogue products. Motorcycle copy lives
 * in `motorcycles`, not `products`, so it is searched through a correlated
 * EXISTS query instead of being treated as a products column.
 */
export function buildProductSearchConditions(searchValue: unknown): ProductSearchConditions {
  const search = typeof searchValue === "string" ? searchValue.trim().slice(0, 160) : "";
  const terms = search.split(/\s+/).filter(Boolean).slice(0, 8);
  const conditions: string[] = [];
  const values: string[] = [];

  for (const term of terms) {
    const pattern = `%${term}%`;
    conditions.push(`(
      CONCAT_WS(' ', p.name, p.reference, p.description, b.name, f.name, sf.name, pt.name, et.name, acc_type.name, cat.name) LIKE ?
      OR EXISTS (
        SELECT 1 FROM motorcycles mx_search
        WHERE mx_search.product_id = p.id AND mx_search.recommendation LIKE ?
      )
      OR EXISTS (
        SELECT 1 FROM spare_part_compatible_brands scb_search
        JOIN brands cb_search ON cb_search.id = scb_search.brand_id
        WHERE scb_search.product_id = p.id AND cb_search.name LIKE ?
      )
    )`);
    values.push(pattern, pattern, pattern);
  }

  return { conditions, values };
}

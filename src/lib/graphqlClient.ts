const endpoint = "/graphql";

type GraphQLError = {
  message: string;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  accessToken?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  let result: GraphQLResponse<T>;
  try {
    result = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new Error(`The GraphQL API returned an invalid response (${response.status}).`);
  }

  if (!response.ok || result.errors?.length || !result.data) {
    const detail = result.errors?.map((error) => error.message).join("; ");
    throw new Error(detail || `The GraphQL API request failed (${response.status}).`);
  }

  return result.data;
}

export type ApiHealth = {
  status: string;
  database: string;
};

export function getApiHealth(): Promise<{ health: ApiHealth }> {
  return graphqlRequest<{ health: ApiHealth }>(`
    query ApiHealth {
      health {
        status
        database
      }
    }
  `);
}

export type ProductKind = "Motorcycle" | "SparePart" | "Equipment" | "Accessory";

export type PublicBrandSection = {
  section: string;
  order: number;
  label: string | null;
  routeId: string | null;
  filterable: boolean | null;
  displayMode: string | null;
  homeFeatured: boolean | null;
  footerOrder: number | null;
  footerFeaturedOrder: number | null;
};

export type PublicBrand = {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  logoAlt: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number | null;
  sections?: PublicBrandSection[];
};

export type PublicLookup = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number | null;
  family?: { id: string; name: string } | null;
  unit?: string | null;
  applicableTo?: string | null;
};

export type PublicCategory = {
  id: string;
  title: string;
  desc: string;
  src: string;
  to: string;
  brand: string | null;
  isActive: boolean;
  sortOrder: number | null;
};

export type PublicProduct = {
  __typename: ProductKind;
  id: string;
  name: string;
  reference: string | null;
  brand: PublicBrand | null;
  subfamily: { id: string; name: string; family?: { id: string; name: string } | null } | null;
  price: string | null;
  image: string | null;
  gallery: string[] | null;
  desc: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  family?: { id: string; name: string } | null;
  tag?: string | null;
  alt?: string | null;
  recommendation?: string | null;
  partType?: PublicLookup | null;
  equipmentType?: PublicLookup | null;
  accessoryType?: PublicLookup | null;
  category?: PublicLookup | null;
  compatibleBrands?: PublicBrand[];
  universalCompatibility?: boolean | null;
  usages?: PublicLookup[];
  sourceUrl?: string | null;
  specs?: Array<{ label: string; value: string }>;
};

export type PublicCatalog = {
  products: PublicProduct[];
  brands: PublicBrand[];
  categories: PublicCategory[];
  families: PublicLookup[];
  subfamilies: PublicLookup[];
  partTypes: PublicLookup[];
  equipmentTypes: PublicLookup[];
  accessoryTypes: PublicLookup[];
  accessoryCategories: PublicLookup[];
  productUsages: PublicLookup[];
  characteristicDefinitions: PublicLookup[];
};

type ProductPage = { items: PublicProduct[]; totalCount: number };

const PUBLIC_PRODUCT_FIELDS = `
  __typename id name reference price desc image gallery status publishedAt
  brand { id slug name logo logoAlt description isActive sortOrder }
  subfamily { id name family { id name } }
  ... on Motorcycle {
    family { id name }
    tag alt recommendation
    specs { label value }
  }
  ... on SparePart {
    partType { id name isActive sortOrder }
    category { id name isActive sortOrder }
    compatibleBrands { id slug name logo logoAlt description isActive sortOrder }
    universalCompatibility sourceUrl
    specs { label value }
  }
  ... on Equipment {
    equipmentType { id name isActive sortOrder }
    category { id name isActive sortOrder }
    usages { id name isActive sortOrder }
    sourceUrl
    specs { label value }
  }
  ... on Accessory {
    accessoryType { id name isActive sortOrder }
    category { id name isActive sortOrder }
    usages { id name isActive sortOrder }
    sourceUrl
    specs { label value }
  }
`;

const PUBLIC_PRODUCT_PAGE_QUERY = `
  query PublicCatalogPage($limit: Int!, $offset: Int!) {
    catalogProductPage(limit: $limit, offset: $offset) {
      totalCount
      items { ${PUBLIC_PRODUCT_FIELDS} }
    }
  }
`;

const PUBLIC_CATALOG_REFERENCE_QUERY = `
  query PublicCatalogReferenceData {
    brands {
      id slug name logo logoAlt description isActive sortOrder
      sections { section order label routeId filterable displayMode homeFeatured footerOrder footerFeaturedOrder }
    }
    categories { id title desc src to brand isActive sortOrder }
    families { id name isActive sortOrder }
    subfamilies { id name family { id name } isActive sortOrder }
    partTypes { id name isActive sortOrder }
    equipmentTypes { id name isActive sortOrder }
    accessoryTypes { id name isActive sortOrder }
    accessoryCategories { id name isActive sortOrder }
    productUsages { id name isActive sortOrder }
    characteristicDefinitions { id name unit applicableTo isActive sortOrder }
  }
`;

const PUBLIC_PAGE_SIZE = 100;

export async function getPublicCatalog(): Promise<PublicCatalog> {
  type ReferenceData = Omit<PublicCatalog, "products">;
  const [referenceData, firstPage] = await Promise.all([
    graphqlRequest<ReferenceData>(PUBLIC_CATALOG_REFERENCE_QUERY),
    graphqlRequest<{ catalogProductPage: ProductPage }>(PUBLIC_PRODUCT_PAGE_QUERY, {
      limit: PUBLIC_PAGE_SIZE,
      offset: 0,
    }),
  ]);

  const pages: ProductPage[] = [firstPage.catalogProductPage];
  let offset = PUBLIC_PAGE_SIZE;
  while (offset < firstPage.catalogProductPage.totalCount) {
    const pageCount = Math.min(4, Math.ceil((firstPage.catalogProductPage.totalCount - offset) / PUBLIC_PAGE_SIZE));
    const nextPages = await Promise.all(
      Array.from({ length: pageCount }, (_, index) => {
        const pageOffset = offset + index * PUBLIC_PAGE_SIZE;
        return graphqlRequest<{ catalogProductPage: ProductPage }>(PUBLIC_PRODUCT_PAGE_QUERY, {
          limit: PUBLIC_PAGE_SIZE,
          offset: pageOffset,
        }).then(({ catalogProductPage }) => catalogProductPage);
      }),
    );
    pages.push(...nextPages);
    offset += pageCount * PUBLIC_PAGE_SIZE;
  }

  const products = [...new Map(pages.flatMap((page) => page.items).map((product) => [product.id, product])).values()];
  return { ...referenceData, products };
}

export function announcePublicCatalogChange(): void {
  try {
    localStorage.setItem("funbike-public-catalog-updated", String(Date.now()));
  } catch {
    // Storage may be disabled; the public site also refreshes on focus and on a timer.
  }
}

export type PublicProductPage = {
  items: PublicProduct[];
  totalCount: number;
};

export function getPublicProduct(id: string): Promise<{ product: PublicProduct | null }> {
  return graphqlRequest<{ product: PublicProduct | null }>(`
    query PublicProduct($id: ID!) {
      product(id: $id) { ${PUBLIC_PRODUCT_FIELDS} }
    }
  `, { id });
}

import { ApolloClient, InMemoryCache, gql, type OperationVariables } from "@apollo/client";
import { HttpLink } from "@apollo/client/link/http";
import { getOperationAST } from "graphql";

const endpoint = "/graphql";

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: endpoint }),
  cache: new InMemoryCache(),
});

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  accessToken?: string | null,
): Promise<T> {
  const document = gql(query);
  const operation = getOperationAST(document);
  if (!operation) throw new Error("La requête GraphQL ne contient pas d’opération valide.");
  const context = {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    fetchOptions: { cache: "no-store" as RequestCache },
  };
  const requestVariables = variables as OperationVariables | undefined;

  try {
    if (operation.operation === "mutation") {
      const result = await apolloClient.mutate<T, OperationVariables>({
        mutation: document,
        variables: requestVariables,
        context,
        errorPolicy: "none",
      });
      if (!result.data) throw new Error("The GraphQL API returned no data.");
      return result.data;
    }

    const result = await apolloClient.query<T, OperationVariables>({
      query: document,
      variables: requestVariables,
      context,
      fetchPolicy: "no-cache",
      errorPolicy: "none",
    });
    if (result.data === undefined) throw new Error("The GraphQL API returned no data.");
    return result.data;
  } catch (reason) {
    if (reason instanceof Error) throw reason;
    throw new Error("The GraphQL API request failed.");
  }
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

export type PublicFeaturedBanner = {
  id: string;
  short: string;
  brand: string;
  tag: string;
  image: string;
  alt: string;
  targetPage: string;
  targetId: string;
  isActive: boolean;
  sortOrder: number;
};

export type PublicHomepageHeroCopy = {
  id: string;
  localisation: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  sloganPrefix: string;
  usages: string[];
  catalogButton: string;
  featuredLabel: string;
  year: string;
  chooseModelLabel: string;
  displayModelLabel: string;
};

export type PublicHomepageEditorialBanner = {
  id: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  image: string;
  alt: string;
  buttonText: string;
  targetPage: string;
  targetId: string;
  isActive: boolean;
  sortOrder: number;
};

export type PublicHomepagePromotion = {
  id: string;
  badge: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  highlights: string[];
  price: string;
  targetPage: string;
  targetId: string;
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type PublicDealer = {
  key: string;
  city: string;
  name: string;
  kind: string;
  address: string;
  hours: string;
  phone: string;
  email: string;
  desc: string;
  assistantLabel: string | null;
  lat: number;
  lon: number;
  services: string[];
  isActive: boolean;
  sortOrder: number;
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
  featuredBanners: PublicFeaturedBanner[];
  homepageHeroCopy: PublicHomepageHeroCopy | null;
  homepageEditorialBanners: PublicHomepageEditorialBanner[];
  homepageEditorialBannersConfigured: boolean;
  homepagePromotions: PublicHomepagePromotion[];
  dealers: PublicDealer[];
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
    featuredBanners { id short brand tag image alt targetPage targetId isActive sortOrder }
    homepageHeroCopy {
      id localisation titleLine1 titleLine2 description sloganPrefix usages
      catalogButton featuredLabel year chooseModelLabel displayModelLabel
    }
    homepageEditorialBanners {
      id eyebrow titleLine1 titleLine2 description image alt buttonText
      targetPage targetId isActive sortOrder
    }
    homepageEditorialBannersConfigured
    homepagePromotions {
      id badge eyebrow title description image alt highlights price targetPage targetId
      publishedAt startsAt endsAt isActive sortOrder
    }
    dealers {
      key city name kind address hours phone email desc assistantLabel lat lon services
      isActive sortOrder
    }
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

  const products = [...new Map(pages.flatMap((page) => page.items).map((product) => [product.id, product])).values()]
    .filter((product) => product.status === "PUBLISHED");
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

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

export type PublicCatalog = {
  motorcycles: Array<{
    id: string;
    name: string;
    reference: string | null;
    brand: { id: string; name: string } | null;
    family: { id: string; name: string } | null;
    subfamily: { id: string; name: string } | null;
    price: string | null;
    image: string | null;
    gallery: string[] | null;
    desc: string | null;
    status: string;
    specs: Array<{ label: string; value: string }>;
  }>;
  spareParts: Array<{
    id: string;
    name: string;
    reference: string | null;
    brand: { id: string; name: string } | null;
    partType: { id: string; name: string } | null;
    category: { id: string; name: string } | null;
    compatibleBrands: Array<{ id: string; name: string }>;
    universalCompatibility: boolean | null;
    price: string | null;
    image: string | null;
    gallery: string[] | null;
    desc: string | null;
    status: string;
    specs: Array<{ label: string; value: string }>;
  }>;
  gearItems: Array<{
    id: string;
    name: string;
    reference: string | null;
    brand: { id: string; name: string } | null;
    equipmentType: { id: string; name: string } | null;
    category: { id: string; name: string } | null;
    usages: Array<{ id: string; name: string }>;
    price: string | null;
    image: string | null;
    gallery: string[] | null;
    desc: string | null;
    status: string;
    specs: Array<{ label: string; value: string }>;
  }>;
};

export function getPublicCatalog(): Promise<PublicCatalog> {
  return graphqlRequest<PublicCatalog>(`
    query PublicCatalog {
      motorcycles {
        id name reference brand { id name } family { id name } subfamily { id name }
        price image gallery desc status specs { label value }
      }
      spareParts {
        id name reference brand { id name } partType { id name } category { id name }
        compatibleBrands { id name } universalCompatibility price image gallery desc status
        specs { label value }
      }
      gearItems {
        id name reference brand { id name } equipmentType { id name } category { id name }
        usages { id name } price image gallery desc status specs { label value }
      }
    }
  `);
}

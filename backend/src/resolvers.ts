import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { GraphQLError } from "graphql";
import { changeEmail, changePassword, login, requireAdmin, type GraphQLContext } from "./auth.js";
import { queryRows, databaseHealth, getPool, withTransaction } from "./db.js";
import { siteContentResolvers } from "./siteContentResolvers.js";
import { placeIdAtPosition } from "./listOrdering.js";
import { filterProductsBySearch, normalizeProductSearchTerms, searchAndPaginateProducts } from "./productSearch.js";

type DbRow = RowDataPacket & Record<string, any>;
type Args = Record<string, any>;
type ProductImageInput = { url: string; alt?: string | null; isPrimary?: boolean | null; sortOrder?: number | null };
type ProductSpecInput = { characteristicId: string; value: string; sortOrder?: number | null };
type BrandSectionInput = {
  section: string;
  order?: number | null;
  label?: string | null;
  routeId?: string | null;
  filterable?: boolean | null;
  displayMode?: string | null;
  homeFeatured?: boolean | null;
  footerOrder?: number | null;
  footerFeaturedOrder?: number | null;
};
type NormalizedBrandSection = {
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
type NormalizedProductInput = {
  kind: string;
  name: string;
  reference: string | null;
  brandId: number | null;
  subfamilyId: number | null;
  price: string | null;
  description: string | null;
  familyId: number | null;
  tag: string | null;
  alt: string | null;
  recommendation: string | null;
  partTypeId: number | null;
  equipmentTypeId: number | null;
  accessoryTypeId: number | null;
  categoryId: number | null;
  sourceUrl: string | null;
  compatibleBrandIds: number[];
  universalCompatibility: boolean | null;
  usageIds: number[];
  images: ProductImageInput[];
  specs: Array<{ characteristicId: number; value: string; sortOrder: number }>;
};

const lookupTables = {
  FAMILY: { table: "families" },
  SUBFAMILY: { table: "subfamilies", hasFamily: true },
  PART_TYPE: { table: "part_types" },
  EQUIPMENT_TYPE: { table: "equipment_types" },
  ACCESSORY_TYPE: { table: "accessory_types" },
  CATEGORY: { table: "accessory_categories" },
  USAGE: { table: "product_usages" },
  CHARACTERISTIC: { table: "characteristic_definitions", hasCharacteristic: true },
} as const;

type LookupKindKey = keyof typeof lookupTables;

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function notFound(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "NOT_FOUND" } });
}

function numericId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function pageArgs(args: Args): { limit: number; offset: number } {
  const requestedLimit = numericId(args.limit) ?? 100;
  const requestedOffset = numericId(args.offset) ?? 0;
  return {
    limit: Math.max(1, Math.min(requestedLimit, 200)),
    offset: Math.max(0, requestedOffset),
  };
}

function productConditions(
  kind: string | string[] | undefined,
  args: Args,
  includeDrafts: boolean,
): { conditions: string[]; values: Array<string | number> } {
  const conditions = includeDrafts ? ["1 = 1"] : ["p.status = 'PUBLISHED'"];
  const values: Array<string | number> = [];

  if (includeDrafts && (args.status === "DRAFT" || args.status === "PUBLISHED")) {
    conditions.push("p.status = ?");
    values.push(args.status);
  }
  const requestedId = numericId(args.id);
  if (requestedId) {
    conditions.push("p.id = ?");
    values.push(requestedId);
  }
  if (typeof kind === "string") {
    conditions.push("p.product_kind = ?");
    values.push(kind);
  } else if (Array.isArray(kind) && kind.length > 0) {
    conditions.push(`p.product_kind IN (${kind.map(() => "?").join(", ")})`);
    values.push(...kind);
  }

  const filters: Array<[string, unknown]> = [
    ["p.brand_id", args.brandId],
    ["m.family_id", args.familyId],
    ["sp.part_type_id", args.partTypeId],
    ["e.equipment_type_id", args.equipmentTypeId],
    ["a.accessory_type_id", args.accessoryTypeId],
    ["COALESCE(sp.category_id, e.category_id, a.category_id)", args.categoryId],
  ];
  for (const [column, value] of filters) {
    const id = numericId(value);
    if (id) {
      conditions.push(`${column} = ?`);
      values.push(id);
    }
  }

  const compatibleBrandId = numericId(args.compatibleBrandId);
  if (compatibleBrandId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM spare_part_compatible_brands scb
      WHERE scb.product_id = p.id AND scb.brand_id = ?
    )`);
    values.push(compatibleBrandId);
  }
  const usageId = numericId(args.usageId);
  if (usageId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM product_usage_assignments pua
      WHERE pua.product_id = p.id AND pua.usage_id = ?
    )`);
    values.push(usageId);
  }

  return { conditions, values };
}

const productJoins = `
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN subfamilies sf ON sf.id = p.subfamily_id
     LEFT JOIN motorcycles m ON m.product_id = p.id
     LEFT JOIN families f ON f.id = m.family_id
     LEFT JOIN spare_parts sp ON sp.product_id = p.id
     LEFT JOIN part_types pt ON pt.id = sp.part_type_id
     LEFT JOIN equipment e ON e.product_id = p.id
     LEFT JOIN equipment_types et ON et.id = e.equipment_type_id
     LEFT JOIN accessories a ON a.product_id = p.id
     LEFT JOIN accessory_types acc_type ON acc_type.id = a.accessory_type_id
     LEFT JOIN accessory_categories cat
       ON cat.id = COALESCE(sp.category_id, e.category_id, a.category_id)`;

type ProductPagination = { limit: number; offset: number };

async function queryProducts(
  kind: string | string[] | undefined,
  args: Args,
  includeDrafts: boolean,
  pagination?: ProductPagination,
  includeSearchMetadata = false,
): Promise<DbRow[]> {
  const { conditions, values } = productConditions(kind, args, includeDrafts);
  const searchMetadataColumns = includeSearchMetadata ? `,
       b.name AS searchBrandName,
       f.name AS searchFamilyName,
       sf.name AS searchSubfamilyName,
       pt.name AS searchPartTypeName,
       et.name AS searchEquipmentTypeName,
       acc_type.name AS searchAccessoryTypeName,
       cat.name AS searchCategoryName,
       (SELECT GROUP_CONCAT(DISTINCT cb_search.name SEPARATOR ' ')
        FROM spare_part_compatible_brands scb_search
        JOIN brands cb_search ON cb_search.id = scb_search.brand_id
        WHERE scb_search.product_id = p.id) AS searchCompatibleBrandNames` : "";
  const paginationClause = pagination ? "\n     LIMIT ? OFFSET ?" : "";
  if (pagination) values.push(pagination.limit, pagination.offset);

  return queryRows<DbRow>(
    `SELECT
       p.id,
       p.product_kind AS productKind,
       p.name,
       p.reference,
       p.brand_id AS brandId,
       p.subfamily_id AS subfamilyId,
       p.price,
       p.description AS description,
       p.status,
       p.published_at AS publishedAt,
       m.family_id AS familyId,
       m.tag AS tag,
       m.alt AS alt,
       m.recommendation AS recommendation,
       sp.part_type_id AS partTypeId,
       sp.category_id AS spareCategoryId,
       sp.universal_compatibility AS universalCompatibility,
       sp.source_url AS spareSourceUrl,
       e.equipment_type_id AS equipmentTypeId,
       e.category_id AS equipmentCategoryId,
       e.source_url AS equipmentSourceUrl,
       a.accessory_type_id AS accessoryTypeId,
       a.category_id AS accessoryCategoryId,
       a.source_url AS accessorySourceUrl${searchMetadataColumns}
     FROM products p
     ${productJoins}
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.created_at DESC, p.id DESC${paginationClause}`,
    values,
  );
}

async function getProducts(
  kind: string | string[] | undefined,
  args: Args = {},
  includeDrafts = false,
): Promise<DbRow[]> {
  const { limit, offset } = pageArgs(args);
  if (normalizeProductSearchTerms(args.search).length > 0) {
    const rows = await queryProducts(kind, args, includeDrafts, undefined, true);
    return searchAndPaginateProducts(rows, args.search, { limit, offset }).items;
  }
  return queryProducts(kind, args, includeDrafts, { limit, offset });
}

async function getProductCount(
  kind: string | string[] | undefined,
  args: Args = {},
  includeDrafts = false,
): Promise<number> {
  if (normalizeProductSearchTerms(args.search).length > 0) {
    const rows = await queryProducts(kind, args, includeDrafts, undefined, true);
    return filterProductsBySearch(rows, args.search).length;
  }

  const { conditions, values } = productConditions(kind, args, includeDrafts);
  const rows = await queryRows<DbRow>(
    `SELECT COUNT(DISTINCT p.id) AS totalCount
     FROM products p
     ${productJoins}
     WHERE ${conditions.join(" AND ")}`,
    values,
  );
  return Number(rows[0]?.totalCount ?? 0);
}

async function getProductPage(
  kind: string | string[] | undefined,
  args: Args,
  includeDrafts: boolean,
): Promise<{ items: DbRow[]; totalCount: number }> {
  if (normalizeProductSearchTerms(args.search).length > 0) {
    const rows = await queryProducts(kind, args, includeDrafts, undefined, true);
    const { limit, offset } = pageArgs(args);
    return searchAndPaginateProducts(rows, args.search, { limit, offset });
  }

  const [items, totalCount] = await Promise.all([
    getProducts(kind, args, includeDrafts),
    getProductCount(kind, args, includeDrafts),
  ]);
  return { items, totalCount };
}

async function getBrand(id: unknown): Promise<DbRow | null> {
  const brandId = numericId(id);
  if (!brandId) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, slug, name, logo_url AS logo, logo_alt AS logoAlt, description,
            is_active AS isActive, sort_order AS sortOrder
     FROM brands WHERE id = ? LIMIT 1`,
    [brandId],
  );
  return rows[0] ?? null;
}

async function getFamily(id: unknown): Promise<DbRow | null> {
  const familyId = numericId(id);
  if (!familyId) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, name, is_active AS isActive, sort_order AS sortOrder
     FROM families WHERE id = ? LIMIT 1`,
    [familyId],
  );
  return rows[0] ?? null;
}

async function getSubfamily(id: unknown): Promise<DbRow | null> {
  const subfamilyId = numericId(id);
  if (!subfamilyId) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, name, family_id AS familyId, is_active AS isActive, sort_order AS sortOrder
     FROM subfamilies WHERE id = ? LIMIT 1`,
    [subfamilyId],
  );
  return rows[0] ?? null;
}

async function getAccessoryCategory(id: unknown): Promise<DbRow | null> {
  const categoryId = numericId(id);
  if (!categoryId) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, name, is_active AS isActive, sort_order AS sortOrder
     FROM accessory_categories WHERE id = ? LIMIT 1`,
    [categoryId],
  );
  return rows[0] ?? null;
}

async function getCharacteristic(id: unknown): Promise<DbRow | null> {
  const characteristicId = numericId(id);
  if (!characteristicId) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, name, unit, applicable_to AS applicableTo, is_active AS isActive
     FROM characteristic_definitions WHERE id = ? LIMIT 1`,
    [characteristicId],
  );
  return rows[0] ?? null;
}

function lookupKind(value: unknown): LookupKindKey {
  if (typeof value === "string" && Object.prototype.hasOwnProperty.call(lookupTables, value)) {
    return value as LookupKindKey;
  }
  return badInput("Unknown classification type.");
}

async function getLookupRecord(kindValue: unknown, idValue: unknown): Promise<DbRow | null> {
  const kind = lookupKind(kindValue);
  const id = numericId(idValue);
  if (!id) return null;
  const config = lookupTables[kind];
  const familyField = "hasFamily" in config ? "family_id AS familyId" : "NULL AS familyId";
  const unitField = "hasCharacteristic" in config ? "unit" : "NULL AS unit";
  const applicableField = "hasCharacteristic" in config ? "applicable_to AS applicableTo" : "NULL AS applicableTo";
  const rows = await queryRows<DbRow>(
    `SELECT id, name, ${familyField}, ${unitField}, ${applicableField},
            is_active AS isActive, sort_order AS sortOrder
     FROM ${config.table} WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

async function listLookupRecords(kindValue: unknown, includeInactive = false): Promise<DbRow[]> {
  const kind = lookupKind(kindValue);
  const config = lookupTables[kind];
  const familyField = "hasFamily" in config ? "family_id AS familyId" : "NULL AS familyId";
  const unitField = "hasCharacteristic" in config ? "unit" : "NULL AS unit";
  const applicableField = "hasCharacteristic" in config ? "applicable_to AS applicableTo" : "NULL AS applicableTo";
  return queryRows<DbRow>(
    `SELECT id, name, ${familyField}, ${unitField}, ${applicableField},
            is_active AS isActive, sort_order AS sortOrder
     FROM ${config.table}
     ${includeInactive ? "" : "WHERE is_active = TRUE"}
     ORDER BY sort_order ASC, name ASC, id ASC`,
  );
}

async function getLookupOrder(
  connection: PoolConnection,
  kind: LookupKindKey,
  familyId: number | null,
): Promise<number[]> {
  const config = lookupTables[kind];
  const hasFamily = "hasFamily" in config;
  if (hasFamily && !familyId) return badInput("A subfamily must belong to a family.");
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM ${config.table}
     ${hasFamily ? "WHERE family_id = ?" : ""}
     ORDER BY sort_order ASC, name ASC, id ASC
     FOR UPDATE`,
    hasFamily ? [familyId] : [],
  );
  return rows.map((row) => Number(row.id));
}

async function saveLookupOrder(
  connection: PoolConnection,
  kind: LookupKindKey,
  orderedIds: readonly number[],
): Promise<void> {
  const table = lookupTables[kind].table;
  for (const [index, id] of orderedIds.entries()) {
    await connection.execute(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [index, id]);
  }
}

async function getImages(productId: unknown): Promise<DbRow[]> {
  const id = numericId(productId);
  if (!id) return [];
  return queryRows<DbRow>(
    `SELECT id, image_url AS url, alt_text AS alt, is_primary AS isPrimary, sort_order AS sortOrder
     FROM product_images
     WHERE product_id = ?
     ORDER BY is_primary DESC, sort_order ASC, id ASC`,
    [id],
  );
}

async function getSpecs(productId: unknown): Promise<DbRow[]> {
  const id = numericId(productId);
  if (!id) return [];
  return queryRows<DbRow>(
    `SELECT pc.characteristic_id AS characteristicId,
            cd.name AS label,
            pc.value_text AS value,
            pc.sort_order AS sortOrder
     FROM product_characteristics pc
     INNER JOIN characteristic_definitions cd ON cd.id = pc.characteristic_id
     WHERE pc.product_id = ? AND cd.is_active = TRUE
     ORDER BY pc.sort_order ASC, pc.id ASC`,
    [id],
  );
}

async function getUsages(productId: unknown): Promise<DbRow[]> {
  const id = numericId(productId);
  if (!id) return [];
  return queryRows<DbRow>(
    `SELECT u.id, u.name, u.is_active AS isActive, u.sort_order AS sortOrder
     FROM product_usage_assignments pua
     INNER JOIN product_usages u ON u.id = pua.usage_id
     WHERE pua.product_id = ? AND u.is_active = TRUE
     ORDER BY u.sort_order ASC, u.name ASC`,
    [id],
  );
}

async function getCompatibleBrands(productId: unknown): Promise<DbRow[]> {
  const id = numericId(productId);
  if (!id) return [];
  return queryRows<DbRow>(
    `SELECT b.id, b.slug, b.name, b.logo_url AS logo, b.logo_alt AS logoAlt,
            b.description, b.is_active AS isActive, b.sort_order AS sortOrder
     FROM spare_part_compatible_brands scb
     INNER JOIN brands b ON b.id = scb.brand_id
     WHERE scb.product_id = ? AND b.is_active = TRUE
     ORDER BY b.sort_order ASC, b.name ASC`,
    [id],
  );
}

function gqlProductType(product: DbRow): string | null {
  switch (product.productKind) {
    case "MOTORCYCLE": return "Motorcycle";
    case "SPARE_PART": return "SparePart";
    case "EQUIPMENT": return "Equipment";
    case "ACCESSORY": return "Accessory";
    default: return null;
  }
}

const listLookup = (table: string) => async (): Promise<DbRow[]> =>
  queryRows<DbRow>(
    `SELECT id, name, is_active AS isActive, sort_order AS sortOrder
     FROM ${table}
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
  );

const sharedProductResolvers = {
  brand: (product: DbRow) => getBrand(product.brandId),
  subfamily: (product: DbRow) => getSubfamily(product.subfamilyId),
  image: async (product: DbRow) => {
    const images = await getImages(product.id);
    return images.find((image) => Boolean(image.isPrimary))?.url ?? images[0]?.url ?? null;
  },
  gallery: async (product: DbRow) => (await getImages(product.id)).map((image) => image.url),
  desc: (product: DbRow) => product.description ?? null,
  publishedAt: (product: DbRow) => {
    if (!product.publishedAt) return null;
    const value = product.publishedAt instanceof Date
      ? product.publishedAt
      : new Date(product.publishedAt);
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  },
};

const sharedSpecResolvers = {
  characteristic: (spec: DbRow) => getCharacteristic(spec.characteristicId),
};

async function listByRelation(kind: string, column: string, id: unknown): Promise<DbRow[]> {
  const relationId = numericId(id);
  if (!relationId) return [];
  return getProducts(kind, { [column]: relationId });
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") return badInput(`${label} is required.`);
  const text = value.trim();
  if (!text || text.length > maxLength) return badInput(`${label} must contain 1 to ${maxLength} characters.`);
  return text;
}

function optionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return badInput(`${label} must be text.`);
  if (value.length > maxLength) return badInput(`${label} must be no more than ${maxLength} characters.`);
  const text = value.trim();
  return text || null;
}

function optionalId(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const id = numericId(value);
  if (!id) return badInput(`${label} must be a valid positive ID.`);
  return id;
}

function sortOrder(value: unknown, fallback = 0): number {
  if (value === undefined || value === null) {
    return Number.isInteger(fallback) && fallback >= 0 && fallback <= 100000 ? fallback : 0;
  }
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100000) {
    return badInput("sortOrder must be a non-negative integer between 0 and 100000.");
  }
  return Number(value);
}

const BRAND_SECTION_IDS = new Set(["motos", "equipements", "pieces-detachees", "partenaires"]);

function normalizeBrandSections(value: unknown): NormalizedBrandSection[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) return badInput("A brand may have at most 20 section associations.");
  const sections = value.map((entry: BrandSectionInput, index) => {
    const section = requiredText(entry.section, "Brand section", 80);
    if (!BRAND_SECTION_IDS.has(section)) return badInput("Unknown brand section.");
    const displayMode = optionalText(entry.displayMode, "Brand display mode", 80);
    if (displayMode !== null && displayMode !== "catalogue" && displayMode !== "partner-info") {
      return badInput("Brand display mode must be catalogue or partner-info.");
    }
    const nullableOrder = (order: unknown, label: string) =>
      order === undefined || order === null ? null : sortOrder(order, index);
    return {
      section,
      order: sortOrder(entry.order, index),
      label: optionalText(entry.label, "Brand section label", 160),
      routeId: optionalText(entry.routeId, "Brand section route ID", 160),
      filterable: typeof entry.filterable === "boolean" ? entry.filterable : null,
      displayMode,
      homeFeatured: typeof entry.homeFeatured === "boolean" ? entry.homeFeatured : null,
      footerOrder: nullableOrder(entry.footerOrder, "Brand footer order"),
      footerFeaturedOrder: nullableOrder(entry.footerFeaturedOrder, "Brand featured footer order"),
    };
  });
  if (new Set(sections.map((section) => section.section)).size !== sections.length) {
    return badInput("A brand may only be associated with each section once.");
  }
  return sections;
}

async function getBrandSections(brandId: unknown): Promise<DbRow[]> {
  return queryRows<DbRow>(
    `SELECT section, sort_order AS \`order\`, label, route_id AS routeId,
            filterable, display_mode AS displayMode, home_featured AS homeFeatured,
            footer_order AS footerOrder, footer_featured_order AS footerFeaturedOrder
     FROM brand_sections WHERE brand_id = ? ORDER BY sort_order ASC, section ASC`,
    [numericId(brandId)],
  );
}

async function saveBrandSections(
  connection: import("mysql2/promise").PoolConnection,
  brandId: number,
  sections: NormalizedBrandSection[],
): Promise<void> {
  await connection.execute("DELETE FROM brand_sections WHERE brand_id = ?", [brandId]);
  for (const section of sections) {
    await connection.execute(
      `INSERT INTO brand_sections
       (brand_id, section, sort_order, label, route_id, filterable, display_mode, home_featured, footer_order, footer_featured_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [brandId, section.section, section.order, section.label, section.routeId, section.filterable,
        section.displayMode, section.homeFeatured, section.footerOrder, section.footerFeaturedOrder],
    );
  }
}

function normalizeBrandInput(input: Args, current?: DbRow) {
  const slug = requiredText(input.slug, "Brand slug", 120).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return badInput("Brand slug may contain lowercase letters, numbers, and hyphens.");
  }
  return {
    slug,
    name: requiredText(input.name, "Brand name", 160),
    logo: input.logo === undefined ? (current?.logo ?? null) : optionalText(input.logo, "Brand logo", 2048),
    logoAlt: input.logoAlt === undefined ? (current?.logoAlt ?? null) : optionalText(input.logoAlt, "Brand logo alt text", 255),
    description: input.description === undefined ? (current?.description ?? null) : optionalText(input.description, "Brand description", 10000),
    isActive: typeof input.isActive === "boolean" ? input.isActive : Boolean(current?.isActive ?? true),
    sortOrder: sortOrder(input.sortOrder, Number(current?.sortOrder ?? 0)),
    sections: input.sections === undefined
      ? (current?.sections as NormalizedBrandSection[] | undefined) ?? []
      : normalizeBrandSections(input.sections),
  };
}

async function getCategory(idValue: unknown): Promise<DbRow | null> {
  const id = numericId(idValue);
  if (!id) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, title, description AS \`desc\`, image_url AS src, route AS \`to\`,
            brand, sort_order AS sortOrder, is_active AS isActive
     FROM categories WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

function normalizeCategoryInput(input: Args, current?: DbRow) {
  return {
    title: requiredText(input.title, "Category title", 200),
    description: requiredText(input.desc, "Category description", 10000),
    imageUrl: requiredText(input.src, "Category image URL", 2048),
    route: requiredText(input.to, "Category route", 200),
    brand: input.brand === undefined ? (current?.brand ?? null) : optionalText(input.brand, "Category brand", 120),
    sortOrder: sortOrder(input.sortOrder, Number(current?.sortOrder ?? 0)),
    isActive: typeof input.isActive === "boolean" ? input.isActive : Boolean(current?.isActive ?? true),
  };
}

function normalizeLookupInput(input: Args, kindValue: unknown, current?: DbRow) {
  const kind = lookupKind(kindValue);
  const config = lookupTables[kind];
  const name = requiredText(input.name, "Classification name", 160);
  const familyId = "hasFamily" in config
    ? optionalId(input.familyId === undefined ? current?.familyId : input.familyId, "Family ID")
    : null;
  if ("hasFamily" in config && !familyId) return badInput("A subfamily must belong to a family.");
  return {
    kind,
    name,
    familyId,
    unit: "hasCharacteristic" in config
      ? optionalText(input.unit === undefined ? current?.unit : input.unit, "Characteristic unit", 80)
      : null,
    applicableTo: "hasCharacteristic" in config
      ? optionalText(input.applicableTo === undefined ? current?.applicableTo : input.applicableTo, "Characteristic scope", 40)
      : null,
    isActive: typeof input.isActive === "boolean" ? input.isActive : Boolean(current?.isActive ?? true),
    sortOrder: sortOrder(input.sortOrder, Number(current?.sortOrder ?? 0)),
  };
}

function normalizeIdList(value: unknown, label: string): number[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return badInput(`${label} must be a list of IDs.`);
  const ids = value.map((entry) => optionalId(entry, label));
  if (ids.some((id) => id === null)) return badInput(`${label} contains an invalid ID.`);
  const numbers = ids as number[];
  if (new Set(numbers).size !== numbers.length) return badInput(`${label} cannot contain duplicates.`);
  return numbers;
}

function normalizeProductInput(input: Args): NormalizedProductInput {
  const allowedKinds = ["MOTORCYCLE", "SPARE_PART", "EQUIPMENT", "ACCESSORY"];
  if (typeof input.kind !== "string" || !allowedKinds.includes(input.kind)) {
    return badInput("Unknown product kind.");
  }
  const kind = input.kind;
  const categoryId = optionalId(input.categoryId, "Category ID");
  const familyId = optionalId(input.familyId, "Family ID");
  const partTypeId = optionalId(input.partTypeId, "Part type ID");
  const equipmentTypeId = optionalId(input.equipmentTypeId, "Equipment type ID");
  const accessoryTypeId = optionalId(input.accessoryTypeId, "Accessory type ID");
  const compatibleBrandIds = normalizeIdList(input.compatibleBrandIds, "Compatible brand IDs");
  const usageIds = normalizeIdList(input.usageIds, "Usage IDs");
  const universalCompatibility = input.universalCompatibility === undefined || input.universalCompatibility === null
    ? null
    : Boolean(input.universalCompatibility);

  if (kind !== "MOTORCYCLE" && (familyId || input.tag || input.alt || input.recommendation)) {
    return badInput("Motorcycle-only fields cannot be used for this product kind.");
  }
  if (kind !== "SPARE_PART" && (partTypeId || compatibleBrandIds.length || universalCompatibility !== null)) {
    return badInput("Spare-part-only fields cannot be used for this product kind.");
  }
  if (kind !== "EQUIPMENT" && equipmentTypeId) {
    return badInput("Equipment type can only be set on equipment.");
  }
  if (kind !== "ACCESSORY" && accessoryTypeId) {
    return badInput("Accessory type can only be set on an accessory.");
  }
  if (kind !== "EQUIPMENT" && kind !== "ACCESSORY" && usageIds.length) {
    return badInput("Usage labels can only be assigned to equipment or accessories.");
  }
  if (kind === "MOTORCYCLE" && (categoryId || input.sourceUrl)) {
    return badInput("Product category and source URL are not motorcycle fields.");
  }

  const imagesValue = input.images ?? [];
  if (!Array.isArray(imagesValue) || imagesValue.length > 30) {
    return badInput("A product may have at most 30 images.");
  }
  const images = imagesValue.map((image: Args, index: number) => ({
    url: requiredText(image.url, "Image URL", 2048),
    alt: optionalText(image.alt, "Image alt text", 255),
    isPrimary: image.isPrimary === true,
    sortOrder: sortOrder(image.sortOrder, index),
  }));
  const primaryImages = images.filter((image: ProductImageInput) => image.isPrimary);
  if (primaryImages.length > 1) return badInput("Only one product image may be primary.");
  if (images.length > 0 && primaryImages.length === 0) images[0].isPrimary = true;

  const specsValue = input.specs ?? [];
  if (!Array.isArray(specsValue) || specsValue.length > 100) {
    return badInput("A product may have at most 100 specifications.");
  }
  const specs = specsValue.map((spec: Args, index: number) => ({
    characteristicId: optionalId(spec.characteristicId, "Characteristic ID") as number,
    value: requiredText(spec.value, "Specification value", 5000),
    sortOrder: sortOrder(spec.sortOrder, index),
  }));
  if (new Set(specs.map((spec: { characteristicId: number }) => spec.characteristicId)).size !== specs.length) {
    return badInput("A characteristic may only be listed once per product.");
  }

  return {
    kind,
    name: requiredText(input.name, "Product name", 255),
    reference: optionalText(input.reference, "Commercial reference", 160),
    brandId: optionalId(input.brandId, "Brand ID"),
    subfamilyId: optionalId(input.subfamilyId, "Subfamily ID"),
    price: optionalText(input.price, "Price", 255),
    description: optionalText(input.desc, "Product description", 20000),
    familyId,
    tag: optionalText(input.tag, "Motorcycle tag", 160),
    alt: optionalText(input.alt, "Image description", 255),
    recommendation: optionalText(input.recommendation, "Recommendation", 10000),
    partTypeId,
    equipmentTypeId,
    accessoryTypeId,
    categoryId,
    sourceUrl: optionalText(input.sourceUrl, "Source URL", 2048),
    compatibleBrandIds,
    universalCompatibility,
    usageIds,
    images,
    specs,
  };
}

async function assertIdsExist(
  connection: import("mysql2/promise").PoolConnection,
  table: string,
  ids: Array<number | null>,
  label: string,
): Promise<void> {
  const uniqueIds = [...new Set(ids.filter((id): id is number => id !== null))];
  if (!uniqueIds.length) return;
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM ${table} WHERE id IN (${uniqueIds.map(() => "?").join(", ")})`,
    uniqueIds,
  );
  if (rows.length !== uniqueIds.length) return badInput(`${label} refers to a record that does not exist.`);
}

async function validateProductRelations(
  connection: import("mysql2/promise").PoolConnection,
  input: NormalizedProductInput,
): Promise<void> {
  await assertIdsExist(connection, "brands", [input.brandId, ...input.compatibleBrandIds], "Brand");
  await assertIdsExist(connection, "subfamilies", [input.subfamilyId], "Subfamily");
  await assertIdsExist(connection, "families", [input.familyId], "Family");
  await assertIdsExist(connection, "part_types", [input.partTypeId], "Part type");
  await assertIdsExist(connection, "equipment_types", [input.equipmentTypeId], "Equipment type");
  await assertIdsExist(connection, "accessory_types", [input.accessoryTypeId], "Accessory type");
  await assertIdsExist(connection, "accessory_categories", [input.categoryId], "Product category");
  await assertIdsExist(connection, "product_usages", input.usageIds, "Usage");
  await assertIdsExist(
    connection,
    "characteristic_definitions",
    input.specs.map((spec) => spec.characteristicId),
    "Characteristic",
  );
  if (input.familyId && input.subfamilyId) {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM subfamilies WHERE id = ? AND family_id = ? LIMIT 1",
      [input.subfamilyId, input.familyId],
    );
    if (!rows.length) return badInput("The selected subfamily does not belong to the selected family.");
  }
}

async function saveProductRelations(
  connection: import("mysql2/promise").PoolConnection,
  productId: number,
  input: NormalizedProductInput,
): Promise<void> {
  await connection.execute("DELETE FROM motorcycles WHERE product_id = ?", [productId]);
  await connection.execute("DELETE FROM spare_parts WHERE product_id = ?", [productId]);
  await connection.execute("DELETE FROM equipment WHERE product_id = ?", [productId]);
  await connection.execute("DELETE FROM accessories WHERE product_id = ?", [productId]);

  if (input.kind === "MOTORCYCLE") {
    await connection.execute(
      "INSERT INTO motorcycles (product_id, family_id, tag, alt, recommendation) VALUES (?, ?, ?, ?, ?)",
      [productId, input.familyId, input.tag, input.alt, input.recommendation],
    );
  } else if (input.kind === "SPARE_PART") {
    await connection.execute(
      `INSERT INTO spare_parts
       (product_id, part_type_id, category_id, universal_compatibility, source_url)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, input.partTypeId, input.categoryId, input.universalCompatibility, input.sourceUrl],
    );
  } else if (input.kind === "EQUIPMENT") {
    await connection.execute(
      "INSERT INTO equipment (product_id, equipment_type_id, category_id, source_url) VALUES (?, ?, ?, ?)",
      [productId, input.equipmentTypeId, input.categoryId, input.sourceUrl],
    );
  } else {
    await connection.execute(
      "INSERT INTO accessories (product_id, accessory_type_id, category_id, source_url) VALUES (?, ?, ?, ?)",
      [productId, input.accessoryTypeId, input.categoryId, input.sourceUrl],
    );
  }

  await connection.execute("DELETE FROM product_images WHERE product_id = ?", [productId]);
  for (const image of input.images) {
    await connection.execute(
      `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, image.url, image.alt ?? null, image.isPrimary ?? false, image.sortOrder ?? 0],
    );
  }

  await connection.execute("DELETE FROM product_characteristics WHERE product_id = ?", [productId]);
  for (const spec of input.specs) {
    await connection.execute(
      `INSERT INTO product_characteristics (product_id, characteristic_id, value_text, sort_order)
       VALUES (?, ?, ?, ?)`,
      [productId, spec.characteristicId, spec.value, spec.sortOrder],
    );
  }

  await connection.execute("DELETE FROM product_usage_assignments WHERE product_id = ?", [productId]);
  for (const usageId of input.usageIds) {
    await connection.execute(
      "INSERT INTO product_usage_assignments (product_id, usage_id) VALUES (?, ?)",
      [productId, usageId],
    );
  }

  await connection.execute("DELETE FROM spare_part_compatible_brands WHERE product_id = ?", [productId]);
  for (const brandId of input.compatibleBrandIds) {
    await connection.execute(
      "INSERT INTO spare_part_compatible_brands (product_id, brand_id) VALUES (?, ?)",
      [productId, brandId],
    );
  }
}

async function getAdminProduct(id: unknown): Promise<DbRow | null> {
  const productId = numericId(id);
  if (!productId) return null;
  const rows = await getProducts(undefined, { id: productId, limit: 1, offset: 0 }, true);
  return rows[0] ?? null;
}

function productNotFound(id: unknown): never {
  return notFound(`Product ${String(id)} was not found.`);
}

function logAdminProductPageError(error: unknown, args: Args, context: GraphQLContext): void {
  const errorRecord = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  console.error("[adminProductPage] catalogue query failed", {
    requestId: context.requestId ?? "unavailable",
    kind: args.kind ?? "ALL",
    status: args.status ?? "ALL",
    hasSearch: typeof args.search === "string" && args.search.trim().length > 0,
    error: {
      name: normalizedError.name,
      message: normalizedError.message,
      code: typeof errorRecord.code === "string" ? errorRecord.code : undefined,
      errno: typeof errorRecord.errno === "number" ? errorRecord.errno : undefined,
      sqlState: typeof errorRecord.sqlState === "string" ? errorRecord.sqlState : undefined,
      stack: normalizedError.stack,
    },
  });
}

export const resolvers: Record<string, any> = {
  Query: {
    ...siteContentResolvers.Query,
    health: async () => ({ status: "ok", database: await databaseHealth() }),
    me: (_parent: unknown, _args: Args, context: GraphQLContext) => context.user,
    brands: () => queryRows<DbRow>(
      `SELECT id, slug, name, logo_url AS logo, logo_alt AS logoAlt, description,
              is_active AS isActive, sort_order AS sortOrder
       FROM brands WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`,
    ),
    adminBrands: (_parent: unknown, _args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      return queryRows<DbRow>(
        `SELECT id, slug, name, logo_url AS logo, logo_alt AS logoAlt, description,
                is_active AS isActive, sort_order AS sortOrder
         FROM brands ORDER BY sort_order ASC, name ASC`,
      );
    },
    categories: () => queryRows<DbRow>(
      `SELECT id, title, description AS \`desc\`, image_url AS src, route AS \`to\`,
              brand, sort_order AS sortOrder, is_active AS isActive
       FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC`,
    ),
    adminCategories: (_parent: unknown, _args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      return queryRows<DbRow>(
        `SELECT id, title, description AS \`desc\`, image_url AS src, route AS \`to\`,
                brand, sort_order AS sortOrder, is_active AS isActive
         FROM categories ORDER BY sort_order ASC, id ASC`,
      );
    },
    adminLookups: (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      return listLookupRecords(args.kind, true);
    },
    families: () => queryRows<DbRow>(
      `SELECT id, name, is_active AS isActive, sort_order AS sortOrder
       FROM families WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`,
    ),
    subfamilies: () => queryRows<DbRow>(
      `SELECT id, name, family_id AS familyId, is_active AS isActive, sort_order AS sortOrder
       FROM subfamilies WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`,
    ),
    partTypes: listLookup("part_types"),
    equipmentTypes: listLookup("equipment_types"),
    accessoryTypes: listLookup("accessory_types"),
    accessoryCategories: listLookup("accessory_categories"),
    productUsages: listLookup("product_usages"),
    characteristicDefinitions: () => queryRows<DbRow>(
      `SELECT id, name, unit, applicable_to AS applicableTo, is_active AS isActive,
              sort_order AS sortOrder
       FROM characteristic_definitions
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, name ASC`,
    ),
    motorcycles: (_: unknown, args: Args) => getProducts("MOTORCYCLE", args),
    spareParts: (_: unknown, args: Args) => getProducts("SPARE_PART", args),
    equipment: (_: unknown, args: Args) => getProducts("EQUIPMENT", args),
    gearItems: (_: unknown, args: Args) => getProducts("EQUIPMENT", args),
    accessories: (_: unknown, args: Args) => getProducts("ACCESSORY", args),
    product: async (_: unknown, args: Args) => (await getProducts(undefined, { id: args.id, limit: 1 }, false))[0] ?? null,
    products: (_: unknown, args: Args) => getProducts(undefined, args),
    catalogProductPage: (_: unknown, args: Args) => getProductPage(undefined, args, false),
    allParts: (_: unknown, args: Args) => getProducts(["SPARE_PART", "EQUIPMENT", "ACCESSORY"], args),
    adminProducts: (_: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      return getProducts(args.kind, args, true);
    },
    adminProductPage: async (_: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      try {
        return await getProductPage(args.kind, args, true);
      } catch (error) {
        // Do not include search text, credentials, or SQL parameters in logs.
        logAdminProductPageError(error, args, context);
        throw error;
      }
    },
  },
  Mutation: {
    ...siteContentResolvers.Mutation,
    login: (_parent: unknown, args: Args) => login(args.email, args.password),
    changeMyEmail: (_parent: unknown, args: Args, context: GraphQLContext) =>
      changeEmail(context, args.currentPassword, args.newEmail),
    changeMyPassword: (_parent: unknown, args: Args, context: GraphQLContext) =>
      changePassword(context, args.currentPassword, args.newPassword),

    createBrand: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const input = normalizeBrandInput(args.input);
      const id = await withTransaction(async (connection) => {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO brands (slug, name, logo_url, logo_alt, description, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [input.slug, input.name, input.logo, input.logoAlt, input.description, input.isActive, input.sortOrder],
        );
        await saveBrandSections(connection, result.insertId, input.sections);
        return result.insertId;
      });
      const brand = await getBrand(id);
      if (!brand) return notFound("Created brand could not be loaded.");
      return brand;
    },
    updateBrand: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Brand ID");
      if (!id) return badInput("Brand ID is required.");
      const current = await getBrand(id);
      if (!current) return notFound("Brand was not found.");
      current.sections = await getBrandSections(id);
      const input = normalizeBrandInput(args.input, current);
      await withTransaction(async (connection) => {
        await connection.execute(
          `UPDATE brands SET slug = ?, name = ?, logo_url = ?, logo_alt = ?, description = ?,
                  is_active = ?, sort_order = ? WHERE id = ?`,
          [input.slug, input.name, input.logo, input.logoAlt, input.description, input.isActive, input.sortOrder, id],
        );
        await saveBrandSections(connection, id, input.sections);
      });
      return (await getBrand(id)) ?? notFound("Updated brand could not be loaded.");
    },
    deleteBrand: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Brand ID");
      if (!id) return badInput("Brand ID is required.");
      const [result] = await getPool().execute<ResultSetHeader>(
        "UPDATE brands SET is_active = FALSE WHERE id = ?",
        [id],
      );
      return result.affectedRows > 0;
    },

    createCategory: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const input = normalizeCategoryInput(args.input);
      const id = await withTransaction(async (connection) => {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO categories (title, description, image_url, route, brand, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [input.title, input.description, input.imageUrl, input.route, input.brand, input.sortOrder, input.isActive],
        );
        return result.insertId;
      });
      return (await getCategory(id)) ?? notFound("Created category could not be loaded.");
    },
    updateCategory: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Category ID");
      if (!id) return badInput("Category ID is required.");
      const current = await getCategory(id);
      if (!current) return notFound("Category was not found.");
      const input = normalizeCategoryInput(args.input, current);
      await getPool().execute<ResultSetHeader>(
        `UPDATE categories SET title = ?, description = ?, image_url = ?, route = ?, brand = ?,
                sort_order = ?, is_active = ? WHERE id = ?`,
        [input.title, input.description, input.imageUrl, input.route, input.brand, input.sortOrder, input.isActive, id],
      );
      return (await getCategory(id)) ?? notFound("Updated category could not be loaded.");
    },
    deleteCategory: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Category ID");
      if (!id) return badInput("Category ID is required.");
      const [result] = await getPool().execute<ResultSetHeader>(
        "UPDATE categories SET is_active = FALSE WHERE id = ?",
        [id],
      );
      return result.affectedRows > 0;
    },

    createLookup: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const input = normalizeLookupInput(args.input, args.kind);
      const config = lookupTables[input.kind];
      const columns = ["name", "is_active", "sort_order"];
      const values: unknown[] = [input.name, input.isActive, input.sortOrder];
      if ("hasFamily" in config) {
        columns.push("family_id");
        values.push(input.familyId);
      }
      if ("hasCharacteristic" in config) {
        columns.push("unit", "applicable_to");
        values.push(input.unit, input.applicableTo);
      }
      const id = await withTransaction(async (connection) => {
        if (input.familyId) await assertIdsExist(connection, "families", [input.familyId], "Family");
        const currentOrder = await getLookupOrder(connection, input.kind, input.familyId);
        const requestedPosition = args.input?.sortOrder === undefined || args.input?.sortOrder === null
          ? currentOrder.length
          : input.sortOrder;
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
          values as never[],
        );
        const nextOrder = placeIdAtPosition(currentOrder, result.insertId, requestedPosition);
        await saveLookupOrder(connection, input.kind, nextOrder);
        return result.insertId;
      });
      return (await getLookupRecord(input.kind, id)) ?? notFound("Created classification could not be loaded.");
    },
    updateLookup: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const kind = lookupKind(args.kind);
      const id = optionalId(args.id, "Classification ID");
      if (!id) return badInput("Classification ID is required.");
      const current = await getLookupRecord(kind, id);
      if (!current) return notFound("Classification was not found.");
      const input = normalizeLookupInput(args.input, kind, current);
      const config = lookupTables[kind];
      const assignments = ["name = ?", "is_active = ?", "sort_order = ?"];
      const values: unknown[] = [input.name, input.isActive, input.sortOrder];
      if ("hasFamily" in config) {
        assignments.push("family_id = ?");
        values.push(input.familyId);
      }
      if ("hasCharacteristic" in config) {
        assignments.push("unit = ?", "applicable_to = ?");
        values.push(input.unit, input.applicableTo);
      }
      values.push(id);
      const oldFamilyId = kind === "SUBFAMILY" ? Number(current.familyId) : null;
      const newFamilyId = kind === "SUBFAMILY" ? input.familyId : null;
      await withTransaction(async (connection) => {
        if (input.familyId) await assertIdsExist(connection, "families", [input.familyId], "Family");
        const oldOrder = await getLookupOrder(connection, kind, oldFamilyId);
        const sameList = oldFamilyId === newFamilyId;
        const destinationOrder = sameList
          ? oldOrder
          : await getLookupOrder(connection, kind, newFamilyId);
        const previousPosition = Math.max(0, oldOrder.indexOf(id));
        const requestedPosition = args.input?.sortOrder === undefined || args.input?.sortOrder === null
          ? (sameList ? previousPosition : destinationOrder.length)
          : input.sortOrder;
        const nextOrder = placeIdAtPosition(destinationOrder, id, requestedPosition);
        await connection.execute(
          `UPDATE ${config.table} SET ${assignments.join(", ")} WHERE id = ?`,
          values as never[],
        );
        if (!sameList) {
          await saveLookupOrder(connection, kind, oldOrder.filter((orderedId) => orderedId !== id));
        }
        await saveLookupOrder(connection, kind, nextOrder);
      });
      return (await getLookupRecord(kind, id)) ?? notFound("Updated classification could not be loaded.");
    },
    deleteLookup: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const kind = lookupKind(args.kind);
      const id = optionalId(args.id, "Classification ID");
      if (!id) return badInput("Classification ID is required.");
      const [result] = await getPool().execute<ResultSetHeader>(
        `UPDATE ${lookupTables[kind].table} SET is_active = FALSE WHERE id = ?`,
        [id],
      );
      return result.affectedRows > 0;
    },

    createProduct: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const input = normalizeProductInput(args.input);
      const id = await withTransaction(async (connection) => {
        await validateProductRelations(connection, input);
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO products (product_kind, name, reference, brand_id, subfamily_id, price, description, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
          [input.kind, input.name, input.reference, input.brandId, input.subfamilyId, input.price, input.description],
        );
        await saveProductRelations(connection, result.insertId, input);
        return result.insertId;
      });
      return (await getAdminProduct(id)) ?? productNotFound(id);
    },
    updateProduct: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Product ID");
      if (!id) return badInput("Product ID is required.");
      const input = normalizeProductInput(args.input);
      await withTransaction(async (connection) => {
        const [rows] = await connection.query<RowDataPacket[]>(
          "SELECT product_kind AS productKind FROM products WHERE id = ? FOR UPDATE",
          [id],
        );
        if (!rows[0]) return productNotFound(id);
        if (rows[0].productKind !== input.kind) {
          return badInput("A product's kind cannot be changed after creation.");
        }
        await validateProductRelations(connection, input);
        await connection.execute(
          `UPDATE products SET name = ?, reference = ?, brand_id = ?, subfamily_id = ?, price = ?, description = ?
           WHERE id = ?`,
          [input.name, input.reference, input.brandId, input.subfamilyId, input.price, input.description, id],
        );
        await saveProductRelations(connection, id, input);
      });
      return (await getAdminProduct(id)) ?? productNotFound(id);
    },
    publishProduct: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Product ID");
      if (!id) return badInput("Product ID is required.");
      await withTransaction(async (connection) => {
        const [result] = await connection.execute<ResultSetHeader>(
          `UPDATE products SET status = 'PUBLISHED',
                  published_at = COALESCE(published_at, CURRENT_TIMESTAMP)
           WHERE id = ?`,
          [id],
        );
        if (result.affectedRows === 0) {
          const [rows] = await connection.query<RowDataPacket[]>("SELECT id FROM products WHERE id = ?", [id]);
          if (!rows.length) return productNotFound(id);
        }
      });
      return (await getAdminProduct(id)) ?? productNotFound(id);
    },
    unpublishProduct: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Product ID");
      if (!id) return badInput("Product ID is required.");
      await withTransaction(async (connection) => {
        const [result] = await connection.execute<ResultSetHeader>(
          "UPDATE products SET status = 'DRAFT', published_at = NULL WHERE id = ?",
          [id],
        );
        if (result.affectedRows === 0) {
          const [rows] = await connection.query<RowDataPacket[]>("SELECT id FROM products WHERE id = ?", [id]);
          if (!rows.length) return productNotFound(id);
        }
      });
      return (await getAdminProduct(id)) ?? productNotFound(id);
    },
    deleteProduct: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = optionalId(args.id, "Product ID");
      if (!id) return badInput("Product ID is required.");
      const [result] = await getPool().execute<ResultSetHeader>(
        "DELETE FROM products WHERE id = ?",
        [id],
      );
      return result.affectedRows > 0;
    },
  },
  FeaturedBanner: siteContentResolvers.FeaturedBanner,
  HomepageHeroCopy: siteContentResolvers.HomepageHeroCopy,
  HomepageEditorialBanner: siteContentResolvers.HomepageEditorialBanner,
  HomepagePromotion: siteContentResolvers.HomepagePromotion,
  Dealer: siteContentResolvers.Dealer,
  CatalogProduct: {
    __resolveType: gqlProductType,
    ...sharedProductResolvers,
  },
  ProductDetail: {
    __resolveType: gqlProductType,
  },
  LookupRecord: {
    family: (record: DbRow) => getFamily(record.familyId),
  },
  Brand: {
    sections: (brand: DbRow) => getBrandSections(brand.id),
  },
  Family: {
    subfamilies: (family: DbRow) => queryRows<DbRow>(
      `SELECT id, name, family_id AS familyId, is_active AS isActive, sort_order AS sortOrder
       FROM subfamilies WHERE family_id = ? AND is_active = TRUE
       ORDER BY sort_order ASC, name ASC`,
      [numericId(family.id)],
    ),
  },
  Subfamily: {
    family: (subfamily: DbRow) => getFamily(subfamily.familyId),
  },
  Motorcycle: {
    ...sharedProductResolvers,
    family: (product: DbRow) => getFamily(product.familyId),
    specs: (product: DbRow) => getSpecs(product.id),
  },
  SparePart: {
    ...sharedProductResolvers,
    partType: async (product: DbRow) => {
      const id = numericId(product.partTypeId);
      if (!id) return null;
      const rows = await queryRows<DbRow>(
        `SELECT id, name, is_active AS isActive, sort_order AS sortOrder
         FROM part_types WHERE id = ? LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    },
    category: (product: DbRow) => getAccessoryCategory(product.spareCategoryId),
    compatibleBrands: (product: DbRow) => getCompatibleBrands(product.id),
    universalCompatibility: (product: DbRow) => product.universalCompatibility ?? null,
    sourceUrl: (product: DbRow) => product.spareSourceUrl ?? null,
    specs: (product: DbRow) => getSpecs(product.id),
  },
  Equipment: {
    ...sharedProductResolvers,
    equipmentType: async (product: DbRow) => {
      const id = numericId(product.equipmentTypeId);
      if (!id) return null;
      const rows = await queryRows<DbRow>(
        `SELECT id, name, is_active AS isActive, sort_order AS sortOrder
         FROM equipment_types WHERE id = ? LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    },
    category: (product: DbRow) => getAccessoryCategory(product.equipmentCategoryId),
    usages: (product: DbRow) => getUsages(product.id),
    sourceUrl: (product: DbRow) => product.equipmentSourceUrl ?? null,
    specs: (product: DbRow) => getSpecs(product.id),
  },
  Accessory: {
    ...sharedProductResolvers,
    accessoryType: async (product: DbRow) => {
      const id = numericId(product.accessoryTypeId);
      if (!id) return null;
      const rows = await queryRows<DbRow>(
        `SELECT id, name, is_active AS isActive, sort_order AS sortOrder
         FROM accessory_types WHERE id = ? LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    },
    category: (product: DbRow) => getAccessoryCategory(product.accessoryCategoryId),
    usages: (product: DbRow) => getUsages(product.id),
    sourceUrl: (product: DbRow) => product.accessorySourceUrl ?? null,
    specs: (product: DbRow) => getSpecs(product.id),
  },
  BikeSpec: sharedSpecResolvers,
  ProductSpec: sharedSpecResolvers,
  PartType: {
    spareParts: (partType: DbRow) => listByRelation("SPARE_PART", "partTypeId", partType.id),
  },
  EquipmentType: {
    equipment: (equipmentType: DbRow) => listByRelation("EQUIPMENT", "equipmentTypeId", equipmentType.id),
  },
  AccessoryType: {
    accessories: (accessoryType: DbRow) => listByRelation("ACCESSORY", "accessoryTypeId", accessoryType.id),
  },
};

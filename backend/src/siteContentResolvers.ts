import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { GraphQLError } from "graphql";
import { requireAdmin, type GraphQLContext } from "./auth.js";
import { getPool, queryRows, withTransaction } from "./db.js";

type DbRow = RowDataPacket & Record<string, any>;
type Args = Record<string, any>;

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function notFound(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "NOT_FOUND" } });
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") return badInput(`${label} is required.`);
  const text = value.trim();
  if (!text || text.length > maxLength) return badInput(`${label} must contain 1 to ${maxLength} characters.`);
  return text;
}

function requiredKey(value: unknown, label: string, maxLength: number): string {
  const key = requiredText(value, label, maxLength).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
    return badInput(`${label} may contain lowercase letters, numbers, and hyphens.`);
  }
  return key;
}

function requiredImage(value: unknown, label: string): string {
  const image = requiredText(value, label, 2048);
  if (/^https?:\/\//i.test(image) || /^\/uploads\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif|avif)$/.test(image)) {
    return image;
  }
  return badInput(`${label} must be an http(s) image URL or an uploaded Funbike image path.`);
}

function optionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return badInput(`${label} must be text.`);
  if (value.length > maxLength) return badInput(`${label} must be no more than ${maxLength} characters.`);
  const text = value.trim();
  return text || null;
}

function displayOrder(value: unknown, fallback = 0): number {
  if (value === undefined || value === null) {
    return Number.isInteger(fallback) && fallback >= 0 && fallback <= 100000 ? fallback : 0;
  }
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100000) {
    return badInput("sortOrder must be a non-negative integer between 0 and 100000.");
  }
  return Number(value);
}

function boolValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === "0") return false;
  if (value === 1 || value === "1") return true;
  return fallback;
}

function stringList(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) {
    return badInput(`${label} must contain no more than ${maxItems} entries.`);
  }
  return value.map((entry, index) => requiredText(entry, `${label} ${index + 1}`, maxLength));
}

function dateInput(value: unknown, label: string, fallback?: unknown): Date | null {
  const candidate = value === undefined ? fallback : value;
  if (candidate === undefined || candidate === null || candidate === "") return null;
  if (typeof candidate !== "string" && !(candidate instanceof Date)) return badInput(`${label} must be a valid date.`);
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(date.getTime())) return badInput(`${label} must be a valid date.`);
  return date;
}

function dateOutput(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date
    ? value
    : new Date(typeof value === "string" && !value.includes("T") ? `${value.replace(" ", "T")}Z` : String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function booleanField(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function normalizeFeaturedBanner(input: Args, current?: DbRow) {
  return {
    id: requiredKey(input.id, "Banner ID", 160),
    short: requiredText(input.short, "Banner short title", 160),
    brand: requiredText(input.brand, "Banner brand", 160),
    tag: requiredText(input.tag, "Banner tag", 160),
    image: requiredImage(input.image, "Banner image"),
    alt: requiredText(input.alt, "Banner image description", 255),
    targetPage: requiredText(input.targetPage, "Banner destination page", 120),
    targetId: requiredText(input.targetId, "Banner destination ID", 160),
    isActive: typeof input.isActive === "boolean" ? input.isActive : boolValue(current?.isActive, true),
    sortOrder: displayOrder(input.sortOrder, Number(current?.sortOrder ?? 0)),
  };
}

function normalizePromotion(input: Args, current?: DbRow) {
  const startsAt = dateInput(input.startsAt, "Promotion start date", current?.startsAt);
  const endsAt = dateInput(input.endsAt, "Promotion end date", current?.endsAt);
  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
    return badInput("The promotion start date must be before its end date.");
  }
  return {
    id: requiredKey(input.id, "Promotion ID", 160),
    badge: requiredText(input.badge, "Promotion badge", 160),
    eyebrow: requiredText(input.eyebrow, "Promotion eyebrow", 200),
    title: requiredText(input.title, "Promotion title", 255),
    description: requiredText(input.description, "Promotion description", 10000),
    image: requiredImage(input.image, "Promotion image"),
    alt: requiredText(input.alt, "Promotion image description", 255),
    highlights: stringList(input.highlights, "Promotion highlights", 30, 255),
    price: requiredText(input.price, "Promotion price", 255),
    targetPage: requiredText(input.targetPage, "Promotion destination page", 120),
    targetId: requiredText(input.targetId, "Promotion destination ID", 160),
    publishedAt: dateInput(input.publishedAt, "Promotion publication date", current?.publishedAt),
    startsAt,
    endsAt,
    isActive: typeof input.isActive === "boolean" ? input.isActive : boolValue(current?.isActive, true),
    sortOrder: displayOrder(input.sortOrder, Number(current?.sortOrder ?? 0)),
  };
}

function normalizeDealer(input: Args, current?: DbRow) {
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return badInput("Dealer latitude must be between -90 and 90.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return badInput("Dealer longitude must be between -180 and 180.");
  const email = requiredText(input.email, "Dealer email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badInput("Enter a valid dealer email address.");
  return {
    key: requiredKey(input.key, "Dealer key", 120),
    city: requiredText(input.city, "Dealer city", 160),
    name: requiredText(input.name, "Dealer name", 200),
    kind: requiredText(input.kind, "Dealer type", 160),
    address: requiredText(input.address, "Dealer address", 255),
    hours: requiredText(input.hours, "Dealer opening hours", 255),
    phone: requiredText(input.phone, "Dealer phone", 80),
    email,
    description: requiredText(input.desc, "Dealer description", 10000),
    assistantLabel: optionalText(input.assistantLabel, "Dealer assistant label", 255),
    lat,
    lon,
    services: stringList(input.services, "Dealer services", 50, 160),
    isActive: typeof input.isActive === "boolean" ? input.isActive : boolValue(current?.isActive, true),
    sortOrder: displayOrder(input.sortOrder, Number(current?.sortOrder ?? 0)),
  };
}

async function getFeaturedBanner(idValue: unknown): Promise<DbRow | null> {
  const id = typeof idValue === "string" ? idValue : "";
  if (!id) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, short, brand, tag, image_url AS image, alt_text AS alt,
            target_page AS targetPage, target_id AS targetId,
            is_active AS isActive, sort_order AS sortOrder
     FROM featured_banners WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

async function getPromotion(idValue: unknown): Promise<DbRow | null> {
  const id = typeof idValue === "string" ? idValue : "";
  if (!id) return null;
  const rows = await queryRows<DbRow>(
    `SELECT id, badge, eyebrow, title, description, image_url AS image, alt_text AS alt,
            price, target_page AS targetPage, target_id AS targetId,
            published_at AS publishedAt, starts_at AS startsAt, ends_at AS endsAt,
            is_active AS isActive, sort_order AS sortOrder
     FROM homepage_promotions WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

async function getDealer(keyValue: unknown): Promise<DbRow | null> {
  const key = typeof keyValue === "string" ? keyValue : "";
  if (!key) return null;
  const rows = await queryRows<DbRow>(
    `SELECT dealer_key AS \`key\`, city, name, kind, address, hours, phone, email,
            description AS \`desc\`, assistant_label AS assistantLabel,
            latitude AS lat, longitude AS lon, is_active AS isActive, sort_order AS sortOrder
     FROM dealers WHERE dealer_key = ? LIMIT 1`,
    [key],
  );
  return rows[0] ?? null;
}

async function savePromotionHighlights(
  connection: import("mysql2/promise").PoolConnection,
  promotionId: string,
  highlights: string[],
): Promise<void> {
  await connection.execute("DELETE FROM homepage_promotion_highlights WHERE promotion_id = ?", [promotionId]);
  for (const [index, highlight] of highlights.entries()) {
    await connection.execute(
      "INSERT INTO homepage_promotion_highlights (promotion_id, sort_order, highlight) VALUES (?, ?, ?)",
      [promotionId, index, highlight],
    );
  }
}

async function saveDealerServices(
  connection: import("mysql2/promise").PoolConnection,
  dealerKey: string,
  services: string[],
): Promise<void> {
  await connection.execute("DELETE FROM dealer_services WHERE dealer_key = ?", [dealerKey]);
  for (const [index, service] of services.entries()) {
    await connection.execute(
      "INSERT INTO dealer_services (dealer_key, sort_order, service) VALUES (?, ?, ?)",
      [dealerKey, index, service],
    );
  }
}

export const siteContentResolvers: Record<string, Record<string, (...args: any[]) => any>> = {
  Query: {
    featuredBanners: () => queryRows<DbRow>(
      `SELECT id, short, brand, tag, image_url AS image, alt_text AS alt,
              target_page AS targetPage, target_id AS targetId,
              is_active AS isActive, sort_order AS sortOrder
       FROM featured_banners WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC`,
    ),
    adminFeaturedBanners: (_parent: unknown, _args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      return queryRows<DbRow>(
        `SELECT id, short, brand, tag, image_url AS image, alt_text AS alt,
                target_page AS targetPage, target_id AS targetId,
                is_active AS isActive, sort_order AS sortOrder
         FROM featured_banners ORDER BY sort_order ASC, id ASC`,
      );
    },
    homepagePromotions: () => queryRows<DbRow>(
      `SELECT id, badge, eyebrow, title, description, image_url AS image, alt_text AS alt,
              price, target_page AS targetPage, target_id AS targetId,
              published_at AS publishedAt, starts_at AS startsAt, ends_at AS endsAt,
              is_active AS isActive, sort_order AS sortOrder
       FROM homepage_promotions
       WHERE is_active = TRUE
         AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
         AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
       ORDER BY sort_order ASC, id ASC`,
    ),
    adminHomepagePromotions: (_parent: unknown, _args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      return queryRows<DbRow>(
        `SELECT id, badge, eyebrow, title, description, image_url AS image, alt_text AS alt,
                price, target_page AS targetPage, target_id AS targetId,
                published_at AS publishedAt, starts_at AS startsAt, ends_at AS endsAt,
                is_active AS isActive, sort_order AS sortOrder
         FROM homepage_promotions ORDER BY sort_order ASC, id ASC`,
      );
    },
    dealers: () => queryRows<DbRow>(
      `SELECT dealer_key AS \`key\`, city, name, kind, address, hours, phone, email,
              description AS \`desc\`, assistant_label AS assistantLabel,
              latitude AS lat, longitude AS lon, is_active AS isActive, sort_order AS sortOrder
       FROM dealers WHERE is_active = TRUE ORDER BY sort_order ASC, city ASC`,
    ),
    adminDealers: (_parent: unknown, _args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      return queryRows<DbRow>(
        `SELECT dealer_key AS \`key\`, city, name, kind, address, hours, phone, email,
                description AS \`desc\`, assistant_label AS assistantLabel,
                latitude AS lat, longitude AS lon, is_active AS isActive, sort_order AS sortOrder
         FROM dealers ORDER BY sort_order ASC, city ASC`,
      );
    },
  },
  Mutation: {
    createFeaturedBanner: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const input = normalizeFeaturedBanner(args.input);
      await getPool().execute<ResultSetHeader>(
        `INSERT INTO featured_banners
         (id, short, brand, tag, image_url, alt_text, target_page, target_id, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.id, input.short, input.brand, input.tag, input.image, input.alt, input.targetPage, input.targetId, input.isActive, input.sortOrder],
      );
      return (await getFeaturedBanner(input.id)) ?? notFound("Created banner could not be loaded.");
    },
    updateFeaturedBanner: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = requiredKey(args.id, "Banner ID", 160);
      const current = await getFeaturedBanner(id);
      if (!current) return notFound("Banner was not found.");
      const input = normalizeFeaturedBanner(args.input, current);
      if (input.id !== id) return badInput("A banner's stable ID cannot be changed.");
      await getPool().execute(
        `UPDATE featured_banners SET short = ?, brand = ?, tag = ?, image_url = ?, alt_text = ?,
                target_page = ?, target_id = ?, is_active = ?, sort_order = ? WHERE id = ?`,
        [input.short, input.brand, input.tag, input.image, input.alt, input.targetPage, input.targetId, input.isActive, input.sortOrder, id],
      );
      return (await getFeaturedBanner(id)) ?? notFound("Updated banner could not be loaded.");
    },
    deleteFeaturedBanner: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = requiredKey(args.id, "Banner ID", 160);
      const [result] = await getPool().execute<ResultSetHeader>(
        "UPDATE featured_banners SET is_active = FALSE WHERE id = ?",
        [id],
      );
      return result.affectedRows > 0;
    },
    createHomepagePromotion: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const input = normalizePromotion(args.input);
      await withTransaction(async (connection) => {
        await connection.execute(
          `INSERT INTO homepage_promotions
           (id, badge, eyebrow, title, description, image_url, alt_text, price, target_page, target_id,
            published_at, starts_at, ends_at, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [input.id, input.badge, input.eyebrow, input.title, input.description, input.image, input.alt, input.price,
            input.targetPage, input.targetId, input.publishedAt, input.startsAt, input.endsAt, input.isActive, input.sortOrder],
        );
        await savePromotionHighlights(connection, input.id, input.highlights);
      });
      return (await getPromotion(input.id)) ?? notFound("Created promotion could not be loaded.");
    },
    updateHomepagePromotion: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = requiredKey(args.id, "Promotion ID", 160);
      const current = await getPromotion(id);
      if (!current) return notFound("Promotion was not found.");
      const input = normalizePromotion(args.input, current);
      if (input.id !== id) return badInput("A promotion's stable ID cannot be changed.");
      await withTransaction(async (connection) => {
        await connection.execute(
          `UPDATE homepage_promotions SET badge = ?, eyebrow = ?, title = ?, description = ?, image_url = ?,
                  alt_text = ?, price = ?, target_page = ?, target_id = ?, published_at = ?, starts_at = ?,
                  ends_at = ?, is_active = ?, sort_order = ? WHERE id = ?`,
          [input.badge, input.eyebrow, input.title, input.description, input.image, input.alt, input.price,
            input.targetPage, input.targetId, input.publishedAt, input.startsAt, input.endsAt, input.isActive, input.sortOrder, id],
        );
        await savePromotionHighlights(connection, id, input.highlights);
      });
      return (await getPromotion(id)) ?? notFound("Updated promotion could not be loaded.");
    },
    deleteHomepagePromotion: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const id = requiredKey(args.id, "Promotion ID", 160);
      const [result] = await getPool().execute<ResultSetHeader>(
        "UPDATE homepage_promotions SET is_active = FALSE WHERE id = ?",
        [id],
      );
      return result.affectedRows > 0;
    },
    createDealer: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const input = normalizeDealer(args.input);
      await withTransaction(async (connection) => {
        await connection.execute(
          `INSERT INTO dealers
           (dealer_key, city, name, kind, address, hours, phone, email, description, assistant_label,
            latitude, longitude, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [input.key, input.city, input.name, input.kind, input.address, input.hours, input.phone, input.email,
            input.description, input.assistantLabel, input.lat, input.lon, input.isActive, input.sortOrder],
        );
        await saveDealerServices(connection, input.key, input.services);
      });
      return (await getDealer(input.key)) ?? notFound("Created dealer could not be loaded.");
    },
    updateDealer: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const key = requiredKey(args.key, "Dealer key", 120);
      const current = await getDealer(key);
      if (!current) return notFound("Dealer was not found.");
      const input = normalizeDealer(args.input, current);
      if (input.key !== key) return badInput("A dealer's stable key cannot be changed.");
      await withTransaction(async (connection) => {
        await connection.execute(
          `UPDATE dealers SET city = ?, name = ?, kind = ?, address = ?, hours = ?, phone = ?, email = ?,
                  description = ?, assistant_label = ?, latitude = ?, longitude = ?, is_active = ?, sort_order = ?
           WHERE dealer_key = ?`,
          [input.city, input.name, input.kind, input.address, input.hours, input.phone, input.email,
            input.description, input.assistantLabel, input.lat, input.lon, input.isActive, input.sortOrder, key],
        );
        await saveDealerServices(connection, key, input.services);
      });
      return (await getDealer(key)) ?? notFound("Updated dealer could not be loaded.");
    },
    deleteDealer: async (_parent: unknown, args: Args, context: GraphQLContext) => {
      requireAdmin(context);
      const key = requiredKey(args.key, "Dealer key", 120);
      const [result] = await getPool().execute<ResultSetHeader>(
        "UPDATE dealers SET is_active = FALSE WHERE dealer_key = ?",
        [key],
      );
      return result.affectedRows > 0;
    },
  },
  HomepagePromotion: {
    highlights: (promotion: DbRow) => queryRows<DbRow>(
      `SELECT highlight FROM homepage_promotion_highlights
       WHERE promotion_id = ? ORDER BY sort_order ASC`,
      [promotion.id],
    ).then((rows) => rows.map((row) => row.highlight)),
    publishedAt: (promotion: DbRow) => dateOutput(promotion.publishedAt),
    startsAt: (promotion: DbRow) => dateOutput(promotion.startsAt),
    endsAt: (promotion: DbRow) => dateOutput(promotion.endsAt),
    isActive: (promotion: DbRow) => boolValue(promotion.isActive, true),
  },
  Dealer: {
    lat: (dealer: DbRow) => Number(dealer.lat),
    lon: (dealer: DbRow) => Number(dealer.lon),
    services: (dealer: DbRow) => queryRows<DbRow>(
      `SELECT service FROM dealer_services WHERE dealer_key = ? ORDER BY sort_order ASC`,
      [dealer.key],
    ).then((rows) => rows.map((row) => row.service)),
    isActive: (dealer: DbRow) => boolValue(dealer.isActive, true),
  },
  FeaturedBanner: {
    isActive: (banner: DbRow) => boolValue(banner.isActive, true),
  },
};

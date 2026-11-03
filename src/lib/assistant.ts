import type { Bike, Brand, Dealer, Part } from "../types";
import { getBrandSection } from "../utils/brandLabels";
import { assistantCopy } from "../constants";
import { runRecommender, isSpecificModelRequest, detectBrandText, type NeedProfile } from "./recommender";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ChatActionIcon = "catalog" | "contact" | "parts" | "phone" | "product" | "gear";

export type ChatAction = { label: string; page: string; id?: string; icon?: ChatActionIcon };

export type BotReply = {
  text: string;
  productIds?: string[];
  reasons?: Record<string, string>;
  compare?: [string, string];
  actions?: ChatAction[];
  quick?: string[];
};

export type Memory = {
  name?: string;
  /** Bikes mentioned in the last answer, most relevant first */
  lastIds: string[];
  /** Consecutive answers where the question was not understood */
  misses: number;
  /** In-progress need profile for the recommendation flow */
  need?: NeedProfile | null;
  /** True once a recommendation has been delivered for the current need */
  needComplete?: boolean;
};

export const EMPTY_MEMORY: Memory = { lastIds: [], misses: 0 };

export type AssistantCatalogStatus = "loading" | "ready" | "error";

/* ------------------------------------------------------------------ */
/*  Text helpers                                                       */
/* ------------------------------------------------------------------ */

export function norm(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const wordsOf = (t: string) => t.split(" ").filter(Boolean);

/**
 * Stem match: "casq" matches "casque", "casques".
 * "cher$" = exact word only (so "chercher" does not match).
 * Multi-word stems ("tout terrain") use a word-aligned substring.
 */
function hasAny(t: string, stems: string[]): boolean {
  const ws = wordsOf(t);
  return stems.some((s) => {
    if (s.endsWith("$")) return ws.includes(s.slice(0, -1));
    if (s.includes(" ")) return ` ${t} `.includes(` ${s}`);
    return ws.some((w) => w.startsWith(s));
  });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const byId = (id: string, bikes: Bike[] = []) => bikes.find((bike) => bike.id === id);

/* ------------------------------------------------------------------ */
/*  Catalogue understanding                                            */
/* ------------------------------------------------------------------ */

function detectFamily(t: string, bikes: Bike[] = []): string | undefined {
  const compactInput = t.replace(/\s+/g, "");
  return [...new Set(bikes.map((bike) => bike.family).filter(Boolean))]
    .sort((left, right) => right.length - left.length)
    .find((family) => {
      const normalizedFamily = norm(family);
      return t.includes(normalizedFamily) || compactInput.includes(normalizedFamily.replace(/\s+/g, ""));
    });
}

function indexBikes(bikes: Bike[]) {
  return bikes.map((bike) => ({
    bike,
    name: norm(bike.name),
    hay: norm(`${bike.name} ${bike.brand} ${bike.family} ${bike.desc} ${bike.specs.map((spec) => `${spec.label} ${spec.value}`).join(" ")}`),
  }));
}

function detectBrand(t: string, bikes: Bike[] = []): string | undefined {
  return detectBrandText(t, bikes);
}

const STOP = new Set(["moto", "motos", "pour", "avec", "vous", "avez", "est", "quel", "quelle", "quels", "une", "des", "les", "la", "le", "de", "du", "et", "je", "veux", "voudrais", "cherche", "recherche", "bonjour", "salut", "svp", "merci", "plus", "tres", "bien", "cette", "celle", "prix", "tarif", "combien", "cout", "coute", "piece", "pieces", "equipement", "equipements", "accessoire", "accessoires"]);

function searchParts(t: string, parts: Part[]): Part[] {
  const tokens = wordsOf(t).filter((word) => word.length >= 3 && !STOP.has(word));
  if (!tokens.length) return [];
  const scorePart = (part: Part) => {
    const hay = norm([
      part.name,
      part.brandName ?? "",
      part.category ?? "",
      part.compatibleBrands?.join(" ") ?? part.compatibleBrand ?? "",
      part.productType ?? part.partType ?? "",
      part.usages?.join(" ") ?? "",
      part.reference ?? "",
    ].join(" "));
    return tokens.reduce((score, word) => score + (hay.includes(word) ? (norm(part.name).includes(word) ? 3 : 1) : 0), 0);
  };
  return parts
    .map((part) => ({ part, score: scorePart(part) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((match) => match.part);
}

function findBrandMention(t: string, brands: Brand[]): Brand | undefined {
  return [...brands]
    .filter((brand) => brand.isActive)
    .sort((left, right) => right.name.length - left.name.length)
    .find((brand) => {
      const name = norm(brand.name);
      const slug = norm(brand.id);
      return (name.length >= 3 && t.includes(name)) || (slug.length >= 3 && hasAny(t, [slug]));
    });
}

/** Scores every bike against the question, best match first. */
export function searchBikes(t: string, bikes: Bike[] = []): Bike[] {
  const family = detectFamily(t, bikes);
  const brand = detectBrand(t, bikes);
  // "250", "125cc", "300 cm3"…
  const numbers = Array.from(t.matchAll(/(?:^|\s)(\d{2,3})(?:cc|cm3)?(?=\s|$)/g))
    .map((m) => m[1])
    .filter((n) => Number(n) >= 50 && Number(n) <= 500);
  const tokens = wordsOf(t).filter((w) => w.length >= 4 && !STOP.has(w));

  const scored = indexBikes(bikes).map(({ bike, name, hay }) => {
    let score = 0;
    if (brand && bike.brand === brand) score += 5;
    wordsOf(name).filter((word) => word.length >= 3 && !STOP.has(word)).forEach((word) => {
      if (hasAny(t, [word])) score += 4;
    });
    if (family && bike.family === family) score += 3;
    numbers.forEach((n) => {
      if (new RegExp(`\\b${n}\\b`).test(name)) score += 7;
      else if (hay.includes(`${n} cc`)) score += 4;
    });
    tokens.forEach((w) => {
      if (name.includes(w)) score += 2;
      else if (hay.includes(w)) score += 1;
    });
    return { bike, score };
  });

  return scored
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.bike);
}

/** "la première", "la 2e", "celle-ci" … resolved against the last answer. */
function resolveReference(t: string, mem: Memory, bikes: Bike[] = []): Bike | undefined {
  if (!mem.lastIds.length) return undefined;
  const ordinals: [RegExp, number][] = [
    [/\b(premiere|1ere|1re|premier|1er)\b/, 0],
    [/\b(deuxieme|2eme|2e|seconde|second)\b/, 1],
    [/\b(troisieme|3eme|3e)\b/, 2],
    [/\b(quatrieme|4eme|4e)\b/, 3],
  ];
  for (const [re, idx] of ordinals) if (re.test(t) && mem.lastIds[idx]) return byId(mem.lastIds[idx], bikes);
  if (/\b(derniere|dernier)\b/.test(t)) return byId(mem.lastIds[mem.lastIds.length - 1], bikes);
  if (/\b(celle ci|celle la|cette moto|ce modele|elle|la meme|celui ci|celui la)\b/.test(t)) return byId(mem.lastIds[0], bikes);
  return undefined;
}

const SPEC_KEYS: { stems: string[]; label: string }[] = [
  { stems: ["poids", "lourd", "leger", "kg"], label: "poids" },
  { stems: ["cylindr", "moteur", "cc", "temps", "puissan"], label: "cylindr" },
  { stems: ["frein", "abs"], label: "frein" },
  { stems: ["suspens", "fourche", "amorti"], label: "suspension" },
  { stems: ["refroid"], label: "refroid" },
  { stems: ["cartograph", "mapping", "mode"], label: "cartograph" },
  { stems: ["boite", "vitesse", "rapport"], label: "boite" },
  { stems: ["place", "passager"], label: "places" },
  { stems: ["couleur", "coloris"], label: "coloris" },
  { stems: ["consomm", "econom", "litre"], label: "consommation" },
];

function specAnswer(bike: Bike, t: string): string | undefined {
  for (const key of SPEC_KEYS) {
    if (!hasAny(t, key.stems)) continue;
    const spec = bike.specs.find((s) => norm(s.label).includes(key.label));
    if (spec) return assistantCopy.spec.answer(bike.name, spec.label, spec.value);
    return assistantCopy.spec.unknown(bike.name);
  }
  return undefined;
}

function specList(bike: Bike): string {
  return `${assistantCopy.spec.listTitle(bike.name)}\n${bike.specs.map((s) => assistantCopy.spec.listItem(s.label, s.value)).join("\n")}`;
}

/* ------------------------------------------------------------------ */
/*  Intents                                                            */
/* ------------------------------------------------------------------ */

const I = {
  greet: ["bonjour", "salut", "hello", "coucou", "bonsoir", "hey$", "slt$", "bjr$", "salama", "manao ahoana"],
  thanks: ["merci", "misaotra", "thanks"],
  thanksShort: ["top$", "super$", "parfait", "genial", "cool$", "ok$", "d accord"],
  bye: ["au revoir", "bye$", "a plus", "a bientot", "veloma", "bonne journee", "bonne soiree", "ciao"],
  human: ["conseiller", "humain", "quelqu un", "vendeur", "commercial", "whatsapp", "appeler", "telephone", "numero", "joindre", "parler a"],
  hours: ["horaire", "heure", "ouvert", "ouvre", "fermez", "fermeture", "ferme$", "adresse", "ou etes", "situe", "localis", "vous trouver", "showroom", "magasin", "boutique", "venir chez", "plan$"],
  dealers: ["revendeur", "point de vente", "points de vente"],
  price: ["prix", "tarif", "combien", "cout$", "coute", "cher$", "chere$", "budget", "ariary", "devis", "promo", "remise", "reduction"],
  credit: ["credit", "facilite", "echelon", "mensualit", "plusieurs fois", "financement", "leasing"],
  test: ["essai", "essayer", "tester", "test ride", "rouler avec"],
  service: ["entretien", "revision", "repar", "atelier", "vidange", "panne", "sav$", "garantie", "mecanicien", "diagnostic"],
  parts: ["piece", "frein", "plaquette", "disque", "chaine", "filtre", "huile", "pneu", "kit$", "consommable", "bougie", "embrayage"],
  gear: ["casque", "tenue", "gant", "botte", "blouson", "veste", "jacket", "maillot", "protection", "equipement", "accessoire", "lunette", "pantalon"],
  size: ["taille", "pointure", "mesure", "size$"],
  compare: ["compar", "difference", "vs$", "versus", "entre la", "ou bien", "mieux entre"],
  recommend: ["conseil", "recommand", "propos", "quelle moto", "choisir", "meilleur", "ideal", "adapte", "pour moi", "suggest", "hesit", "laquelle"],
  specs: ["fiche", "caracter", "spec", "detail", "technique", "poids", "cylindr", "moteur", "frein", "suspens", "refroid", "boite", "vitesse", "coloris", "couleur", "consomm", "places"],
  open: ["voir", "ouvr", "montre", "affiche", "lien", "page"],
  catalog: ["moto", "catalogue", "gamme", "modele", "vous avez quoi", "vendez", "dispo", "stock", "nouveaute"],
};

const DEFAULT_QUICK = [...assistantCopy.quick.defaults];

const CONTACT_ACTION: ChatAction = { label: assistantCopy.contact.askQuote, page: "contact", icon: "contact" };

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

export function greetingText(name?: string): string {
  const hour = new Date().getHours();
  const hello = hour >= 18 || hour < 5 ? assistantCopy.greeting.evening : assistantCopy.greeting.morning;
  return assistantCopy.greeting.firstVisit(hello, name ? ` ${name}` : "");
}

export function initialQuick(): string[] {
  return [...DEFAULT_QUICK];
}

function withBikes(reply: BotReply, bikes: Bike[], mem: Memory, max = 4): BotReply {
  const list = bikes.slice(0, max);
  mem.lastIds = list.map((b) => b.id);
  return { ...reply, productIds: list.map((b) => b.id) };
}

export function respond(
  raw: string,
  memIn: Memory,
  bikes: Bike[] = [],
  parts: Part[] = [],
  dealers: Dealer[] = [],
  brands: Brand[] = [],
  catalogStatus: AssistantCatalogStatus = "ready",
): { reply: BotReply; memory: Memory } {
  const mem: Memory = { ...memIn, lastIds: [...memIn.lastIds] };
  const t = norm(raw);
  const ws = wordsOf(t);
  const you = mem.name ? ` ${mem.name}` : "";

  const done = (reply: BotReply) => {
    mem.misses = 0;
    return { reply, memory: mem };
  };
  const getCatalogBrand = (name: string) => {
    const normalized = norm(name);
    return brands.find((brand) => brand.isActive && (norm(brand.id) === normalized || norm(brand.name) === normalized || norm(brand.name).includes(normalized)));
  };
  const equipmentBrandId = (name: string) => getCatalogBrand(name)?.id;
  const spareBrandId = (name: string) => {
    const brand = getCatalogBrand(name);
    return brand ? getBrandSection(brand, "pieces-detachees")?.routeId ?? brand.id : undefined;
  };
  const mentionedBrand = findBrandMention(t, brands);
  const matchingParts = searchParts(t, parts);
  const matchingDealer = dealers.find((dealer) => {
    const labels = [dealer.city, dealer.key, dealer.name, dealer.assistantLabel ?? ""]
      .map((value) => norm(value))
      .filter(Boolean);
    return labels.some((label) => t.includes(label) || wordsOf(label).some((word) => word.length >= 4 && hasAny(t, [word])));
  });

  if (!t) return done({ text: assistantCopy.emptyInput, quick: [...DEFAULT_QUICK] });

  /* --- Name ---------------------------------------------------------- */
  const nameMatch = raw.match(/(?:je m'?\s?appelle|mon (?:nom|prénom|prenom) (?:est|c'est)|moi c'?\s?est)\s+([A-Za-zÀ-ÿ-]{2,20})/i);
  if (nameMatch) {
    mem.name = capitalize(nameMatch[1]);
    return done({
      text: assistantCopy.nameResponse(mem.name),
      quick: [...assistantCopy.quick.name],
    });
  }

  /* --- Small talk ---------------------------------------------------- */
  if (hasAny(t, I.greet) && ws.length <= 4) {
    const malagasy = hasAny(t, ["salama", "manao ahoana"]);
    return done({
      text: malagasy
        ? assistantCopy.greeting.malagasy(you)
        : assistantCopy.greeting.friendly(pick([...assistantCopy.greeting.options]), you),
      quick: [...DEFAULT_QUICK],
    });
  }
  if (hasAny(t, I.bye)) return done({ text: assistantCopy.goodbye(you) });
  if ((hasAny(t, I.thanks) && ws.length <= 5) || (hasAny(t, I.thanksShort) && ws.length <= 2))
    return done({ text: pick(assistantCopy.thanks.options(you)) + assistantCopy.thanks.followUp, quick: [...DEFAULT_QUICK] });

  /* --- Human / contact ---------------------------------------------- */
  if (hasAny(t, I.human)) {
    return done({
      text: assistantCopy.contact.team(),
      actions: [{ label: assistantCopy.contact.writeTeam, page: "contact", icon: "contact" }],
    });
  }

  const needsCatalog = hasAny(t, I.dealers) || matchingDealer !== undefined || mentionedBrand !== undefined ||
    hasAny(t, I.catalog) || hasAny(t, I.parts) || hasAny(t, I.gear) || hasAny(t, I.recommend) ||
    hasAny(t, I.price) || hasAny(t, I.compare) || hasAny(t, I.specs) || hasAny(t, I.open) || hasAny(t, I.test) || hasAny(t, I.hours);
  if (catalogStatus !== "ready" && needsCatalog) {
    return done({
      text: assistantCopy.fallback.catalogUnavailable,
      actions: [
        { label: assistantCopy.catalog.seeCatalog, page: "catalogue", icon: "catalog" },
        { label: assistantCopy.contact.writeTeam, page: "contact", icon: "contact" },
      ],
    });
  }

  /* --- Dealers ----------------------------------------------------- */
  if (hasAny(t, I.dealers) || matchingDealer) {
    const dealerNames = dealers.map((dealer) => `**${dealer.assistantLabel?.trim() || dealer.city}**`).filter(Boolean);
    const dealerId = matchingDealer?.key;
    return done({
      text: matchingDealer
        ? assistantCopy.dealers.selected(matchingDealer.assistantLabel?.trim() || matchingDealer.city)
        : dealers.length
          ? assistantCopy.dealers.overview(dealers.length, dealerNames.join(", "))
          : assistantCopy.dealers.unavailable,
      actions: [{
        label: assistantCopy.dealers.seeDealers,
        page: "revendeurs",
        ...(dealerId ? { id: dealerId } : {}),
        icon: "contact",
      }],
      quick: [...assistantCopy.quick.showroom],
    });
  }

  /* --- Hours & location -------------------------------------------- */
  if (hasAny(t, I.hours)) {
    const primaryDealer = dealers[0];
    return done({
      text: primaryDealer
        ? assistantCopy.showroom.hours(primaryDealer.city, primaryDealer.hours)
        : assistantCopy.dealers.unavailable,
      actions: [
        { label: assistantCopy.dealers.allDealers, page: "revendeurs", icon: "contact" },
        { label: assistantCopy.dealers.contactUs, page: "contact", icon: "contact" },
      ],
      quick: [...assistantCopy.quick.showroomAndBikes],
    });
  }

  /* --- Intelligent bike recommendation (Piston) --------------------- */
  // Never recommend at random: understand the need first, ask the minimum
  // of questions, build a profile, then match it to the catalogue.
  {
    const isPartsOrGear = hasAny(t, I.parts) || hasAny(t, I.gear);
    const isPriceIntent = hasAny(t, I.price);
    const isSpecificModel = isSpecificModelRequest(t, bikes);
    const brandMention = detectBrandText(t, bikes);
    const inSession = Boolean(mem.need) && !mem.needComplete;
    const genericSeek =
      (hasAny(t, I.recommend) ||
        /cherche|achet|prend|veux|voudrais|besoin|quel(le)?\s+moto|une\s+moto|une\s+motocyc/i.test(t) ||
        (Boolean(brandMention) && /une|veux|achet|cherch|besoin/i.test(t))) &&
      !isSpecificModel &&
      !isPartsOrGear &&
      !isPriceIntent;
    const sessionBlocked =
      isPartsOrGear || isPriceIntent || isSpecificModel || hasAny(t, I.hours) || hasAny(t, I.compare) || hasAny(t, I.human);

    if ((inSession && !sessionBlocked) || (genericSeek && !inSession)) {
      if (genericSeek && !inSession && mem.needComplete) {
        // A brand new request: start a clean consultation.
        mem.need = undefined;
        mem.needComplete = false;
      }
      const { reply } = runRecommender(t, mem, bikes);
      return { reply, memory: mem };
    }
  }

  const found = searchBikes(t, bikes);
  const ref = resolveReference(t, mem, bikes);
  // Short follow-ups ("Prix", "Voir la fiche", "son poids ?") refer to the bike just discussed
  const followUp =
    mem.lastIds.length > 0 && hasAny(t, [...I.price, ...I.specs, ...I.open, ...I.test]) ? byId(mem.lastIds[0], bikes) : undefined;
  const target = found[0] ?? ref ?? followUp;

  /* --- Price (read from the GraphQL product record) ----------------- */
  if (hasAny(t, I.price)) {
    if ((hasAny(t, I.gear) || hasAny(t, I.parts)) && matchingParts.length > 0) {
      const part = matchingParts[0];
      return done({
        text: assistantCopy.price.forProduct(part.name, part.price),
        actions: [
          { label: assistantCopy.contact.openSheet, page: "accessory", id: part.id, icon: "product" },
          CONTACT_ACTION,
        ],
        quick: [...assistantCopy.quick.search],
      });
    }
    const text = target
      ? assistantCopy.price.forBike(target.name, target.price)
      : hasAny(t, I.gear) || hasAny(t, I.parts)
        ? assistantCopy.price.productNotFound
        : assistantCopy.price.general;
    const reply: BotReply = {
      text,
      actions: [CONTACT_ACTION],
      quick: target ? [assistantCopy.price.seeSheet, assistantCopy.price.reserveTest] : [...assistantCopy.quick.search],
    };
    return done(target ? withBikes(reply, [target], mem, 1) : reply);
  }

  /* --- Financing ----------------------------------------------------- */
  if (hasAny(t, I.credit)) {
    return done({
      text: assistantCopy.financing,
      actions: [CONTACT_ACTION],
    });
  }

  /* --- Test ride ----------------------------------------------------- */
  if (hasAny(t, I.test)) {
    return done({
      text: assistantCopy.testRide(you, target?.name ?? ""),
      actions: [{ label: assistantCopy.showroom.reserveTest, page: "contact", icon: "contact" }],
    });
  }

  /* --- Workshop ------------------------------------------------------ */
  if (hasAny(t, I.service)) {
    return done({
      text: assistantCopy.workshop(target?.name ?? ""),
      actions: [{ label: assistantCopy.contact.contactWorkshop, page: "contact", icon: "contact" }],
      quick: [...assistantCopy.quick.workshop],
    });
  }

  /* --- Compare ------------------------------------------------------- */
  if (hasAny(t, I.compare)) {
    const pool = [...found];
    mem.lastIds.forEach((id) => {
      const b = byId(id, bikes);
      if (b && !pool.includes(b)) pool.push(b);
    });
    if (pool.length >= 2) {
      const [a, b] = pool;
      mem.lastIds = [a.id, b.id];
      return done({
        text: assistantCopy.compare.title(a.name, b.name),
        compare: [a.id, b.id],
        quick: [assistantCopy.compare.firstSheet(a.name.split(" ").slice(0, 3).join(" ")), assistantCopy.compare.beginner],
      });
    }
    return done({ text: assistantCopy.compare.askModels, quick: [assistantCopy.compare.example] });
  }

  /* --- Spec follow-up ------------------------------------------------ */
  if (hasAny(t, I.specs) && target) {
    const answer = specAnswer(target, t) ?? specList(target);
    return done(withBikes({ text: answer, quick: [...assistantCopy.quick.spec] }, [target], mem, 1));
  }

  /* --- Open a product ------------------------------------------------ */
  if (hasAny(t, I.open) && target) {
    return done(
      withBikes(
        {
          text: assistantCopy.openProduct(target.name),
          actions: [{ label: assistantCopy.contact.openSheet, page: "product", id: target.id, icon: "product" }],
        },
        [target],
        mem,
        1,
      ),
    );
  }

  /* --- Sizing -------------------------------------------------------- */
  if (hasAny(t, I.size)) {
    return done({
      text: assistantCopy.sizing,
      actions: [{ label: assistantCopy.gear.seeAll, page: "equipements", icon: "gear" }],
    });
  }

  /* --- Gear ---------------------------------------------------------- */
  if (hasAny(t, I.gear)) {
    const equipmentItems = parts.filter((part) => part.kind !== "piece");
    if (mentionedBrand) {
      const brandItems = equipmentItems.filter((part) =>
        part.kind === mentionedBrand.id || part.brandName?.toLocaleLowerCase("fr") === mentionedBrand.name.toLocaleLowerCase("fr"),
      );
      return done({
        text: assistantCopy.gear.brand(mentionedBrand.name, brandItems.length),
        actions: [{ label: assistantCopy.gear.seeBrand(mentionedBrand.name), page: "equipements", id: equipmentBrandId(mentionedBrand.id), icon: "gear" }],
        quick: [...assistantCopy.quick.gearSizing],
      });
    }
    const names = [...new Set(equipmentItems.map((part) => part.brandName).filter((name): name is string => Boolean(name)))];
    const boots = hasAny(t, ["botte", "chaussure"]);
    return done({
      text: boots ? assistantCopy.gear.boots : assistantCopy.gear.overview(equipmentItems.length, names),
      actions: [
        { label: assistantCopy.gear.seeAll, page: "equipements", icon: "gear" },
        ...(matchingParts[0] ? [{ label: assistantCopy.contact.openSheet, page: "accessory", id: matchingParts[0].id, icon: "product" as const }] : []),
      ],
      quick: [...assistantCopy.quick.gearSizing],
    });
  }

  /* --- Parts --------------------------------------------------------- */
  if (hasAny(t, I.parts)) {
    const spareItems = parts.filter((part) => part.kind === "piece");
    if (mentionedBrand) {
      const compatibleItems = spareItems.filter((part) =>
        part.brandName?.toLocaleLowerCase("fr") === mentionedBrand.name.toLocaleLowerCase("fr") ||
        part.compatibleBrandSlugs?.includes(mentionedBrand.id) ||
        part.compatibleBrands?.some((name) => name.toLocaleLowerCase("fr") === mentionedBrand.name.toLocaleLowerCase("fr")) ||
        part.universalCompatibility === true,
      );
      return done({
        text: assistantCopy.parts.brand(mentionedBrand.name, compatibleItems.length),
        actions: [{ label: assistantCopy.parts.seeBrand(mentionedBrand.name), page: "spares", id: spareBrandId(mentionedBrand.id), icon: "parts" }],
        quick: [...assistantCopy.quick.parts],
      });
    }
    if (matchingParts.length > 0) {
      const part = matchingParts[0];
      return done({
        text: assistantCopy.parts.matches(matchingParts.slice(0, 3).map((item) => item.name)),
        actions: [
          { label: assistantCopy.contact.openSheet, page: "accessory", id: part.id, icon: "product" },
          { label: assistantCopy.parts.seeParts, page: "spares", icon: "parts" },
        ],
        quick: [...assistantCopy.quick.parts],
      });
    }
    return done({
      text: assistantCopy.parts.overview(spareItems.length, target?.name ?? ""),
      actions: [{ label: assistantCopy.parts.seeParts, page: "spares", icon: "parts" }],
      quick: [...assistantCopy.quick.parts],
    });
  }

  /* --- Catalogue search --------------------------------------------- */
  if (found.length) {
    const brand = detectBrand(t, bikes);
    const family = detectFamily(t, bikes);
    const label = brand ? assistantCopy.search.brand(brand) : family ? assistantCopy.search.family(family) : assistantCopy.search.found;
    return done(
      withBikes(
        {
          text: assistantCopy.search.resultTitle(label, Math.min(found.length, 4), found.length),
          quick: [...assistantCopy.quick.search],
          actions: [{ label: assistantCopy.search.seeCatalog, page: "motos", icon: "catalog" }],
        },
        found,
        mem,
      ),
    );
  }

  /* --- Catalogue overview ------------------------------------------ */
  if (hasAny(t, I.catalog)) {
    const familyCounts = [...bikes.reduce((counts, bike) => counts.set(bike.family, (counts.get(bike.family) ?? 0) + 1), new Map<string, number>())]
      .map(([family, count]) => `${family} (${count})`);
    return done({
      text: assistantCopy.catalog.overview(bikes.length, familyCounts),
      quick: [...assistantCopy.quick.catalog],
      actions: [{ label: assistantCopy.catalog.seeCatalog, page: "motos", icon: "catalog" }],
    });
  }

  /* --- Fallback ------------------------------------------------------ */
  mem.misses += 1;
  if (mem.misses >= 2) {
    return {
      reply: {
        text: assistantCopy.fallback.counselor(you),
        actions: [{ label: assistantCopy.contact.contactCounselor, page: "contact", icon: "phone" }],
        quick: [...DEFAULT_QUICK],
      },
      memory: mem,
    };
  }
  return {
    reply: {
      text: assistantCopy.fallback.unclear,
      quick: [...DEFAULT_QUICK],
    },
    memory: mem,
  };
}

/** Human-like typing time, proportional to the answer length. */
export function typingDelay(reply: BotReply): number {
  const base = 450 + reply.text.length * 11 + (reply.productIds?.length ?? 0) * 120 + (reply.compare ? 300 : 0);
  return Math.min(2300, Math.max(650, base));
}

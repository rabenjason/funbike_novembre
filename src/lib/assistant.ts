import type { Bike, Dealer, Part } from "../types";
import { assistantCopy, content } from "../constants";
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
/*  Shop facts (single source of truth for the assistant)              */
/* ------------------------------------------------------------------ */

export const SHOP = {
  phone: content.site.telephoneAffiche,
  email: content.site.email,
  city: content.site.ville,
  hours: assistantCopy.shopStatus.hours,
};

/** Opening status computed in Madagascar time (UTC+3). */
export function shopStatus(now = new Date()): { open: boolean; text: string } {
  let weekday = "";
  let minutes = 0;
  try {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Indian/Antananarivo",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    weekday = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    minutes = h * 60 + m;
  } catch {
    weekday = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][now.getDay()];
    minutes = now.getHours() * 60 + now.getMinutes();
  }

  const OPEN = 8 * 60;
  const CLOSE = 17 * 60 + 30;
  const sunday = weekday.startsWith("dim");
  const saturday = weekday.startsWith("sam");

  if (!sunday && minutes >= OPEN && minutes < CLOSE) {
    const left = CLOSE - minutes;
    const soon = left <= 60 ? assistantCopy.shopStatus.closingSoon(left) : assistantCopy.shopStatus.openUntil;
    return { open: true, text: assistantCopy.shopStatus.openNow(soon) };
  }
  if (!sunday && minutes < OPEN) return { open: false, text: assistantCopy.shopStatus.beforeOpening };
  if (sunday) return { open: false, text: assistantCopy.shopStatus.closedSunday };
  if (saturday) return { open: false, text: assistantCopy.shopStatus.closedSaturday };
  return { open: false, text: assistantCopy.shopStatus.closedTomorrow };
}

/* ------------------------------------------------------------------ */
/*  Catalogue understanding                                            */
/* ------------------------------------------------------------------ */

const FAMILY_WORDS: Record<Bike["family"], string[]> = {
  "Off-road": ["enduro", "cross", "motocross", "offroad", "off road", "tout terrain", "piste", "trail", "rallye", "competition", "boue", "terre", "hors piste", "sentier"],
  Urbain: ["ville", "urbain", "urbaine", "quotidien", "trajet", "bureau", "route", "econom", "consomm", "deplacement", "citadin", "roadster", "sportive urbaine"],
  "3 roues": ["tuktuk", "tuk", "3 roues", "trois roues", "taxi", "bajaj", "tricycle"],
};

function indexBikes(bikes: Bike[]) {
  return bikes.map((bike) => ({
    bike,
    name: norm(bike.name),
    hay: norm(`${bike.name} ${bike.brand} ${bike.family} ${bike.desc} ${bike.specs.map((spec) => `${spec.label} ${spec.value}`).join(" ")}`),
  }));
}

function detectFamily(t: string): Bike["family"] | undefined {
  return (Object.keys(FAMILY_WORDS) as Bike["family"][]).find((f) => hasAny(t, FAMILY_WORDS[f]));
}

function detectBrand(t: string, bikes: Bike[] = []): string | undefined {
  return detectBrandText(t, bikes);
}

const STOP = new Set(["moto", "motos", "pour", "avec", "vous", "avez", "est", "quel", "quelle", "quels", "une", "des", "les", "la", "le", "de", "du", "et", "je", "veux", "voudrais", "cherche", "recherche", "bonjour", "salut", "svp", "merci", "plus", "tres", "bien", "cette", "celle"]);

/** Scores every bike against the question, best match first. */
const MODEL_WORDS = ["apache", "raider", "hlx", "king", "tuktuk", "trail", "xx", "sef", "factory", "sport", "edition"];

export function searchBikes(t: string, bikes: Bike[] = []): Bike[] {
  const family = detectFamily(t);
  const brand = detectBrand(t, bikes);
  // "250", "125cc", "300 cm3"…
  const numbers = Array.from(t.matchAll(/(?:^|\s)(\d{2,3})(?:cc|cm3)?(?=\s|$)/g))
    .map((m) => m[1])
    .filter((n) => Number(n) >= 50 && Number(n) <= 500);
  const tokens = wordsOf(t).filter((w) => w.length >= 4 && !STOP.has(w));

  const scored = indexBikes(bikes).map(({ bike, name, hay }) => {
    let score = 0;
    if (brand && bike.brand === brand) score += 5;
    MODEL_WORDS.forEach((kw) => {
      if (hasAny(t, [kw]) && new RegExp(`\\b${kw}`).test(name)) score += 6;
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
  dealers: ["revendeur", "point de vente", "points de vente", "toamasina", "tamatave", "mahajanga", "majunga", "fianar", "antsirabe", "diego", "tulear", "tana$"],
  price: ["prix", "tarif", "combien", "cout$", "coute", "cher$", "chere$", "budget", "ariary", "devis", "promo", "remise", "reduction"],
  credit: ["credit", "facilite", "echelon", "mensualit", "plusieurs fois", "financement", "leasing"],
  test: ["essai", "essayer", "tester", "test ride", "rouler avec"],
  service: ["entretien", "revision", "repar", "atelier", "vidange", "panne", "sav$", "garantie", "mecanicien", "diagnostic"],
  parts: ["piece", "frein", "plaquette", "disque", "chaine", "filtre", "huile", "pneu", "kit$", "consommable", "bougie", "embrayage", "galfer", "bihr"],
  gear: ["casque", "tenue", "gant", "botte", "blouson", "veste", "jacket", "maillot", "protection", "equipement", "accessoire", "troy", "tld$", "gaerne", "mt helmet", "mt$", "lunette", "pantalon"],
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

export function respond(raw: string, memIn: Memory, bikes: Bike[] = [], parts: Part[] = [], dealers: Dealer[] = []): { reply: BotReply; memory: Memory } {
  const mem: Memory = { ...memIn, lastIds: [...memIn.lastIds] };
  const t = norm(raw);
  const ws = wordsOf(t);
  const you = mem.name ? ` ${mem.name}` : "";

  const done = (reply: BotReply) => {
    mem.misses = 0;
    return { reply, memory: mem };
  };
  const equipmentBrandId = (name: string, fallback: string) =>
    parts.find((part) => part.kind !== "piece" && part.brandName?.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))?.kind ?? fallback;
  const spareBrandId = (name: string, fallback: string) => {
    const part = parts.find((item) => item.kind === "piece" && item.compatibleBrands?.some((brand) => brand.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr")));
    return part?.compatibleBrandSlugs?.[part.compatibleBrands?.findIndex((brand) => brand.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr")) ?? -1] ?? fallback;
  };

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
      text: assistantCopy.contact.team(SHOP.phone, SHOP.email, shopStatus().text),
      actions: [{ label: assistantCopy.contact.writeTeam, page: "contact", icon: "contact" }],
    });
  }

  /* --- Dealers ----------------------------------------------------- */
  if (hasAny(t, I.dealers)) {
    const cityAliases: Record<string, string[]> = {
      antananarivo: ["antananarivo", "tana"],
      toamasina: ["toamasina", "tamatave"],
      mahajanga: ["mahajanga", "majunga"],
      fianarantsoa: ["fianarantsoa", "fianar"],
    };
    const requestedCity = Object.entries(cityAliases).find(([, aliases]) => aliases.some((alias) => hasAny(t, [alias])))?.[0];
    const dealer = dealers.find((item) =>
      (requestedCity !== undefined && (norm(item.key) === requestedCity || norm(item.city) === requestedCity)) ||
      hasAny(t, [norm(item.city)]),
    );
    const dealerList = dealers.map((item) => `**${item.city}**`).join(", ");
    return done({
      text: dealers.length === 0
        ? assistantCopy.dealers.unavailable
        : dealer
          ? assistantCopy.dealers.selected(dealer.assistantLabel?.trim() || `${dealer.city} (${dealer.kind})`)
          : assistantCopy.dealers.overview(dealers.length, dealerList),
      actions: [
        {
          label: assistantCopy.dealers.seeDealers,
          page: "revendeurs",
          ...(dealer ? { id: dealer.key } : {}),
          icon: "contact",
        },
      ],
      quick: [...assistantCopy.quick.showroom],
    });
  }

  /* --- Hours & location -------------------------------------------- */
  if (hasAny(t, I.hours)) {
    return done({
      text: assistantCopy.showroom.hours(SHOP.city, SHOP.hours, shopStatus().text),
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

  /* --- Price (never invented) --------------------------------------- */
  if (hasAny(t, I.price)) {
    if (hasAny(t, I.gear) && hasAny(t, ["tvs", "apache", "raider"])) {
      return done({
        text: assistantCopy.price.gearTvs,
        actions: [{ label: assistantCopy.gear.seeTvs, page: "equipements", id: equipmentBrandId("TVS", "tvs"), icon: "gear" }],
      });
    }
    const text = target ? assistantCopy.price.forBike(target.name) : assistantCopy.price.general;
    const reply: BotReply = {
      text,
      actions: [CONTACT_ACTION],
      quick: target
        ? [assistantCopy.price.seeSheet, assistantCopy.price.reserveTest]
        : [assistantCopy.price.bikesSherco, assistantCopy.price.bikesTvs],
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
      text: assistantCopy.testRide(you, target?.name ?? "", shopStatus().text),
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
      actions: [
        { label: assistantCopy.gear.seeTroyLee, page: "equipements", id: equipmentBrandId("TLD", "tld"), icon: "gear" },
        { label: assistantCopy.gear.seeGaerneBoots, page: "equipements", id: equipmentBrandId("Gaerne", "gaerne"), icon: "gear" },
      ],
    });
  }

  /* --- Gear ---------------------------------------------------------- */
  if (hasAny(t, I.gear)) {
    if (hasAny(t, ["tvs", "apache", "raider"])) {
      return done({
        text: assistantCopy.gear.tvs,
        actions: [{ label: assistantCopy.gear.seeTvsGear, page: "equipements", id: equipmentBrandId("TVS", "tvs"), icon: "gear" }],
        quick: [...assistantCopy.quick.gear],
      });
    }
    const boots = hasAny(t, ["botte", "gaerne", "chaussure"]);
    const mt = hasAny(t, ["mt helmet", "mt$"]);
    return done({
      text: boots ? assistantCopy.gear.boots : assistantCopy.gear.overview(parts.filter((part) => part.kind !== "piece").length),
      actions: [
        { label: boots ? assistantCopy.gear.seeGaerne : mt ? assistantCopy.gear.seeMt : assistantCopy.gear.seeTroyLee, page: "equipements", id: boots ? equipmentBrandId("Gaerne", "gaerne") : mt ? equipmentBrandId("MT", "mt") : equipmentBrandId("TLD", "tld"), icon: "gear" },
        ...(boots ? [] : [{ label: assistantCopy.gear.seeTvs, page: "equipements", id: equipmentBrandId("TVS", "tvs"), icon: "gear" as const }]),
      ],
      quick: [...assistantCopy.quick.gearSizing],
    });
  }

  /* --- Parts --------------------------------------------------------- */
  if (hasAny(t, I.parts)) {
    const requestedBrand = detectBrandText(t, bikes);
    if (requestedBrand === "TVS") {
      return done({
        text: assistantCopy.parts.tvs(parts.filter((part) => part.kind === "piece" && (part.brandName?.toLocaleLowerCase("fr") === "tvs" || part.universalCompatibility || part.compatibleBrandSlugs?.includes("tvs") || part.compatibleBrands?.some((name) => name.toLocaleLowerCase("fr") === "tvs"))).length),
        actions: [{ label: assistantCopy.parts.seeTvs, page: "spares", id: spareBrandId("TVS", "spare-tvs"), icon: "parts" }],
        quick: [...assistantCopy.quick.partsTvs],
      });
    }
    return done({
      text: assistantCopy.parts.general(target?.name ?? ""),
      actions: [{ label: assistantCopy.parts.seeParts, page: "spares", icon: "parts" }],
      quick: [...assistantCopy.quick.parts],
    });
  }

  /* --- Catalogue search --------------------------------------------- */
  if (found.length) {
    const brand = detectBrand(t, bikes);
    const family = detectFamily(t);
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
    const count = (family: Bike["family"]) => bikes.filter((bike) => bike.family === family).length;
    return done({
      text: assistantCopy.catalog.overview(bikes.length, count("Off-road"), count("Urbain"), count("3 roues")),
      quick: [...assistantCopy.quick.catalog],
      actions: [{ label: assistantCopy.catalog.seeCatalog, page: "motos", icon: "catalog" }],
    });
  }

  /* --- Fallback ------------------------------------------------------ */
  mem.misses += 1;
  if (mem.misses >= 2) {
    return {
      reply: {
        text: assistantCopy.fallback.counselor(you, SHOP.phone),
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

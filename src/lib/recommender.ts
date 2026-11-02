import type { Bike } from "../types";
import { recommendationCopy } from "../constants";
import type { ChatAction } from "./assistant";

/* ------------------------------------------------------------------ */
/*  Piston – Intelligent recommendation                                */
/*  Understands the real need BEFORE recommending, asks the minimum    */
/*  of questions, builds a need profile and matches it to the bike     */
/*  catalogue. Never recommends at random.                             */
/* ------------------------------------------------------------------ */

export type Usage =
  | "ville"
  | "travail"
  | "voyage"
  | "cross"
  | "enduro"
  | "tout-terrain"
  | "loisir"
  | "sport"
  | "transport"
  | "polyvalent";

export type Terrain = "route" | "piste" | "tout-terrain" | "mixte";
export type Distance = "courte" | "moyenne" | "longue";
export type Experience = "debutant" | "intermediaire" | "experimente";
export type Priority = "economie" | "confort" | "puissance" | "performance" | "maniable" | "autonomie";
export type Transport = "passager" | "marchandise";

export type NeedProfile = {
  usage: Usage | null;
  terrain: Terrain | null;
  distance: Distance | null;
  experience: Experience | null;
  priority: Priority | null;
  transport: Transport | null;
};

export type MemoryLike = {
  need?: NeedProfile | null;
  needComplete?: boolean;
  lastIds: string[];
  misses: number;
  name?: string;
};

type ReplyLike = {
  text: string;
  productIds?: string[];
  reasons?: Record<string, string>;
  quick?: string[];
  actions?: ChatAction[];
};

const emptyNeed = (): NeedProfile => ({
  usage: null,
  terrain: null,
  distance: null,
  experience: null,
  priority: null,
  transport: null,
});

/* ------------------------------------------------------------------ */
/*  Text helpers                                                       */
/* ------------------------------------------------------------------ */

const wordsOf = (t: string) => t.split(" ").filter(Boolean);

function hasAny(t: string, stems: string[]): boolean {
  const ws = wordsOf(t);
  return stems.some((s) => {
    if (s.endsWith("$")) return ws.includes(s.slice(0, -1));
    if (s.includes(" ")) return ` ${t} `.includes(` ${s}`);
    return ws.some((w) => w.startsWith(s));
  });
}

const hasNumber = (t: string) => /(?:^|\s)\d{2,3}(?:cc|cm3)?(?=\s|$)/.test(t);

/* Brand detection (self-contained to avoid a circular import). */
const BRAND_WORDS: Record<string, string[]> = {
  Sherco: ["sherco", "sef"],
  Fantic: ["fantic", "xx"],
  TVS: ["tvs", "apache", "raider", "hlx", "king"],
  Funbike: ["edition speciale", "serie limitee"],
};

export function detectBrandText(t: string, bikes: Bike[] = []): string | undefined {
  const dynamicBrand = [...new Set(bikes.map((bike) => bike.brand).filter(Boolean))]
    .sort((left, right) => right.length - left.length)
    .find((brand) => {
      const terms = brand.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
      return terms.some((term) => term.length >= 3 && hasAny(t, [term]));
    });
  return dynamicBrand ?? Object.keys(BRAND_WORDS).find((brand) => hasAny(t, BRAND_WORDS[brand]));
}

const MODEL_WORDS = ["apache", "raider", "hlx", "king", "tuktuk", "trail", "xx", "sef", "factory", "sport", "edition"];

export function isSpecificModelRequest(t: string, bikes: Bike[] = []): boolean {
  const brand = detectBrandText(t, bikes);
  if (!brand) return false;
  const hasModel = MODEL_WORDS.some((kw) => hasAny(t, [kw]));
  return hasModel || hasNumber(t);
}

/* ------------------------------------------------------------------ */
/*  Extraction                                                         */
/* ------------------------------------------------------------------ */

export function extractNeed(t: string): NeedProfile {
  const p = emptyNeed();

  // usage – most specific first
  if (hasAny(t, ["cross", "motocross", "piste"])) p.usage = "cross";
  else if (hasAny(t, ["enduro", "rallye", "raid"])) p.usage = "enduro";
  else if (hasAny(t, ["transport", "passager", "passagers", "taxi", "marchandise", "marchandises", "charge", "charges", "famille", "epouse", "personne", "personnes"])) p.usage = "transport";
  else if (hasAny(t, ["travail", "travailler", "livraison", "livrer", "coursier", "delivery", "boulot", "client", "boulot"])) p.usage = "travail";
  else if (hasAny(t, ["voyage", "voyager", "long trajet", "longs trajets", "routier", "vacances", "tourisme", "tour"])) p.usage = "voyage";
  else if (hasAny(t, ["tout terrain", "tout-terrain", "off road", "offroad", "terre", "boue", "sentier", "champ", "foret", "foret"])) p.usage = "tout-terrain";
  else if (hasAny(t, ["ville", "urbain", "urbaine", "centre ville", "centre-ville"])) p.usage = "ville";
  else if (hasAny(t, ["loisir", "balade", "balades", "plaisir", "fun", "divertissement"])) p.usage = "loisir";
  else if (hasAny(t, ["sport", "sportif", "sportive", "racing"])) p.usage = "sport";
  else if (hasAny(t, ["polyvalent", "polyvalente", "mixte", "partout", "tout type", "toutes"])) p.usage = "polyvalent";

  // terrain
  if (hasAny(t, ["mixte", "polyvalent", "partout", "route et terre", "et terre", "tout type"])) p.terrain = "mixte";
  else if (hasAny(t, ["piste", "motocross", "cross"])) p.terrain = "piste";
  else if (hasAny(t, ["terre", "tout terrain", "off road", "offroad", "boue", "piste"])) p.terrain = "tout-terrain";
  else if (hasAny(t, ["route", "bitume", "asphalte", "ville", "urbain"])) p.terrain = "route";

  // distance
  if (hasAny(t, ["long", "longs", "longue", "longues", "long trajet", "longs trajets", "voyage", "voyager", "routier", "grande distance"])) p.distance = "longue";
  else if (hasAny(t, ["moyen", "moyenne", "moyens", "moyennes", "trajets moyens"])) p.distance = "moyenne";
  else if (hasAny(t, ["court", "courts", "courte", "courtes", "quotidien", "quotidiens", "petits trajets", "petit trajet", "petite distance"])) p.distance = "courte";

  // experience
  if (hasAny(t, ["debutant", "debuter", "debut", "premiere moto", "premiere", "jamais", "novice", "apprendre", "apprends", "commence", "commencer", "jeune", "petit niveau"])) p.experience = "debutant";
  else if (hasAny(t, ["experimente", "expert", "pro$", "pro", "confirme", "confirmé", "vieux loup", "confirm", "depis longtemps", "beaucoup"])) p.experience = "experimente";
  else if (hasAny(t, ["intermediaire", "intermediate", "intermedi", "un peu", "quelque temps", "quelques annees", "depis un"])) p.experience = "intermediaire";

  // priority
  if (hasAny(t, ["economie", "economique", "economiser", "consomm", "pas cher", "pas cher", "bon marche", "bon marche", "petit prix", "economique"])) p.priority = "economie";
  else if (hasAny(t, ["autonomie", "reservoir", "reservoir", "grande distance", "longue distance", "autonomie"])) p.priority = "autonomie";
  else if (hasAny(t, ["puissance", "puissant", "puissante", "fort"])) p.priority = "puissance";
  else if (hasAny(t, ["performance", "performant", "performante", "sport", "sportif", "sportive", "racing"])) p.priority = "performance";
  else if (hasAny(t, ["confort", "confortable", "confort"])) p.priority = "confort";
  else if (hasAny(t, ["maniable", "maniabilite", "maniable", "leger", "legere", "legere", "agile", "manoeuvr", "facile"])) p.priority = "maniable";

  // transport
  if (hasAny(t, ["marchandise", "marchandises", "charge", "charges", "livraison", "colis", "commerce", "business"])) p.transport = "marchandise";
  else if (hasAny(t, ["passager", "passagers", "taxi", "famille", "epouse", "ami", "personnes", "2 personnes"])) p.transport = "passager";

  return p;
}

function mergeNeed(target: NeedProfile, source: NeedProfile): void {
  Object.assign(target, {
    usage: source.usage ?? target.usage,
    terrain: source.terrain ?? target.terrain,
    distance: source.distance ?? target.distance,
    experience: source.experience ?? target.experience,
    priority: source.priority ?? target.priority,
    transport: source.transport ?? target.transport,
  });
}

const ROAD_USAGE: Usage[] = ["ville", "travail", "transport", "polyvalent"];
const OFFROAD_USAGE: Usage[] = ["cross", "enduro", "tout-terrain"];

function inferTerrain(p: NeedProfile): void {
  if (p.terrain || !p.usage) return;
  if (p.usage === "cross") p.terrain = "piste";
  else if (p.usage === "enduro" || p.usage === "tout-terrain") p.terrain = "tout-terrain";
  else if (ROAD_USAGE.includes(p.usage)) p.terrain = "route";
}

/* ------------------------------------------------------------------ */
/*  Bike knowledge base                                                */
/* ------------------------------------------------------------------ */

type BikeTags = {
  usage: Usage[];
  terrain: Terrain[];
  distance: Distance[];
  experience: Experience[];
  priority: Priority[];
  transport: Transport[];
};

const TAGS: Record<string, BikeTags> = {
  "sherco-sef-250-factory-2026": {
    usage: ["enduro", "loisir", "sport"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["moyenne", "longue"],
    experience: ["intermediaire", "experimente"],
    priority: ["performance"],
    transport: [],
  },
  "sherco-sef-300-factory-2026": {
    usage: ["enduro", "loisir", "sport"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["moyenne", "longue"],
    experience: ["intermediaire", "experimente"],
    priority: ["performance", "puissance", "autonomie"],
    transport: [],
  },
  "xx-125-2026": {
    usage: ["cross", "enduro", "loisir", "sport"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["maniable", "performance"],
    transport: [],
  },
  "offroad-450": {
    usage: ["enduro", "voyage", "loisir"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["longue", "moyenne"],
    experience: ["experimente", "intermediaire"],
    priority: ["autonomie", "performance", "puissance"],
    transport: [],
  },
  "offroad-trail": {
    usage: ["voyage", "loisir", "polyvalent", "travail"],
    terrain: ["mixte", "route", "tout-terrain"],
    distance: ["moyenne", "longue"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["autonomie", "confort"],
    transport: [],
  },
  "tvs-hlx-plus": {
    usage: ["travail", "ville", "polyvalent", "transport"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne", "longue"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["economie", "confort", "autonomie"],
    transport: ["marchandise", "passager"],
  },
  "tvs-bleu": {
    usage: ["ville", "loisir", "polyvalent"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire"],
    priority: ["economie", "maniable", "confort"],
    transport: ["passager"],
  },
  "tvs-200-4v": {
    usage: ["sport", "ville", "loisir", "voyage"],
    terrain: ["route", "mixte"],
    distance: ["moyenne", "longue"],
    experience: ["intermediaire", "experimente"],
    priority: ["performance", "puissance", "confort"],
    transport: ["passager"],
  },
  "tvs-red": {
    usage: ["ville", "loisir", "sport"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire"],
    priority: ["maniable", "economie", "performance"],
    transport: ["passager"],
  },
  "tvs-125-hlx-5g": {
    usage: ["ville", "travail", "loisir", "polyvalent"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire"],
    priority: ["economie", "maniable"],
    transport: ["passager"],
  },
  "tuktuk": {
    usage: ["travail", "transport", "ville"],
    terrain: ["route"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["economie", "confort"],
    transport: ["passager", "marchandise"],
  },
  "concept-urbain": {
    usage: ["ville", "loisir", "polyvalent", "voyage"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne", "longue"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["confort", "performance"],
    transport: ["passager"],
  },
};

/* ------------------------------------------------------------------ */
/*  Questions                                                          */
/* ------------------------------------------------------------------ */

type Question = { field: string; text: string; quick: readonly string[] };

const Q_USAGE: Question = recommendationCopy.questions.usage;
const Q_TERRAIN: Question = recommendationCopy.questions.terrain;
const Q_DISTANCE: Question = recommendationCopy.questions.distance;
const Q_EXPERIENCE: Question = recommendationCopy.questions.experience;

function nextQuestion(p: NeedProfile): Question | null {
  if (!p.usage) return Q_USAGE;
  if (p.usage === "voyage" && !p.distance) return Q_DISTANCE;
  if (ROAD_USAGE.includes(p.usage) && !p.distance) return Q_DISTANCE;
  if (p.usage === "loisir" && !p.terrain) return Q_TERRAIN;
  if (OFFROAD_USAGE.includes(p.usage) && !p.experience) return Q_EXPERIENCE;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Matching                                                           */
/* ------------------------------------------------------------------ */

type Match = { bike: Bike; score: number; pitch: string };

function scoreBike(bike: Bike, p: NeedProfile): number {
  const tags = TAGS[bike.id];
  if (tags) {
    let score = 0;
    if (p.usage && tags.usage.includes(p.usage)) score += 5;
    if (p.terrain && tags.terrain.includes(p.terrain)) score += 4;
    if (p.distance && tags.distance.includes(p.distance)) score += 3;
    if (p.experience && tags.experience.includes(p.experience)) score += 3;
    if (p.priority && tags.priority.includes(p.priority)) score += 2;
    if (p.transport && tags.transport.includes(p.transport)) score += 2;
    return score;
  }

  const text = `${bike.family} ${bike.name} ${bike.desc} ${bike.recommendation ?? ""} ${bike.specs.map((spec) => `${spec.label} ${spec.value}`).join(" ")}`
    .toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = (words: string[]) => words.some((word) => text.includes(word));
  const usageWords: Record<Usage, string[]> = {
    ville: ["urbain", "ville", "scooter", "route", "citadin"],
    travail: ["travail", "utilitaire", "transport", "urbain", "3 roues"],
    voyage: ["voyage", "trail", "tourisme", "aventure", "autonomie"],
    cross: ["cross", "motocross", "piste", "tout-terrain"],
    enduro: ["enduro", "off-road", "offroad", "tout-terrain", "sef"],
    "tout-terrain": ["off-road", "offroad", "cross", "enduro", "terrain", "trail"],
    loisir: ["loisir", "trail", "sport", "tout-terrain", "polyvalent"],
    sport: ["sport", "performance", "racing", "factory", "puissance"],
    transport: ["transport", "utilitaire", "3 roues", "tuk", "marchandise"],
    polyvalent: ["polyvalent", "mixte", "trail", "urbain", "off-road"],
  };
  const terrainWords: Record<Terrain, string[]> = {
    route: ["route", "urbain", "ville", "roadster"],
    piste: ["piste", "cross", "motocross", "circuit"],
    "tout-terrain": ["tout-terrain", "off-road", "offroad", "enduro", "trail"],
    mixte: ["mixte", "polyvalent", "trail", "route"],
  };
  const priorityWords: Record<Priority, string[]> = {
    economie: ["econom", "consommation", "faible cout"],
    confort: ["confort", "ergonomie", "suspension"],
    puissance: ["puissance", "couple", "cylindree"],
    performance: ["performance", "sport", "factory", "racing"],
    maniable: ["maniable", "leger", "compact", "agile"],
    autonomie: ["autonomie", "reservoir", "longue distance"],
  };

  let score = 0;
  if (p.usage && matches(usageWords[p.usage])) score += 5;
  if (p.terrain && matches(terrainWords[p.terrain])) score += 4;
  if (p.distance && (p.distance === "longue" ? matches(["longue distance", "voyage", "trail", "autonomie"]) : p.distance === "courte" ? matches(["ville", "urbain", "quotidien", "compact"]) : matches(["polyvalent", "mixte", "trail"]))) score += 3;
  if (p.experience && matches(p.experience === "debutant" ? ["debutant", "facile", "accessible", "maniable"] : p.experience === "experimente" ? ["experimente", "expert", "competition", "factory"] : ["intermediaire", "polyvalent"])) score += 3;
  if (p.priority && matches(priorityWords[p.priority])) score += 2;
  if (p.transport && matches(p.transport === "marchandise" ? ["marchandise", "charge", "utilitaire", "3 roues"] : ["passager", "duo", "3 roues", "tuk"])) score += 2;
  return score;
}

export function recommend(p: NeedProfile, brand?: string, bikes: Bike[] = []): Match[] {
  let pool = [...bikes];
  if (brand) pool = pool.filter((bike) => bike.brand.toLocaleLowerCase("fr").includes(brand.toLocaleLowerCase("fr")) || bike.brand === "Funbike");

  const matches: Match[] = pool
    .map((bike) => ({ bike, score: scoreBike(bike, p), pitch: bike.recommendation ?? "" }))
    .filter((match) => match.score >= (TAGS[match.bike.id] ? 7 : 5))
    .sort((left, right) => right.score - left.score);

  return matches.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/*  Phrasing                                                           */
/* ------------------------------------------------------------------ */

function introText(p: NeedProfile): string {
  const bits: string[] = [];
  if (p.usage) bits.push(recommendationCopy.criteria.usage[p.usage]);
  if (p.distance) bits.push(recommendationCopy.criteria.distance[p.distance]);
  return recommendationCopy.criteria.summary(bits.join(", ") || recommendationCopy.criteria.fallback);
}

/* ------------------------------------------------------------------ */
/*  Orchestration                                                      */
/* ------------------------------------------------------------------ */

export function runRecommender(t: string, mem: MemoryLike, bikes: Bike[] = []): { reply: ReplyLike; memory: MemoryLike } {
  const profile = mem.need && !mem.needComplete ? { ...mem.need } : emptyNeed();
  mergeNeed(profile, extractNeed(t));
  inferTerrain(profile);

  // A question is still needed to reach a confident recommendation.
  const q = nextQuestion(profile);
  if (q) {
    mem.need = profile;
    mem.needComplete = false;
    return { reply: { text: q.text, quick: [...q.quick] }, memory: mem };
  }

  const brand = detectBrandText(t, bikes);
  const matches = recommend(profile, brand, bikes);
  mem.needComplete = true;
  mem.need = profile;

  if (matches.length === 0) {
    return {
      reply: {
        text: recommendationCopy.noMatch,
        quick: [...recommendationCopy.noMatchQuick],
      },
      memory: mem,
    };
  }

  const reasons: Record<string, string> = {};
  matches.forEach((m) => (reasons[m.bike.id] = m.pitch));
  mem.lastIds = matches.map((m) => m.bike.id);

  const text =
    introText(profile) +
    "\n" +
    matches.map((match) => recommendationCopy.criteria.recommendation(match.bike.name, match.pitch)).join("\n");

  return {
    reply: {
      text,
      productIds: matches.map((m) => m.bike.id),
      reasons,
      quick: [...recommendationCopy.quick.compare],
      actions: [{ label: recommendationCopy.seeCatalog, page: "motos", icon: "catalog" }],
    },
    memory: mem,
  };
}

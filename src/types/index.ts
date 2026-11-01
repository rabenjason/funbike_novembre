/**
 * Types des données dynamiques FunBike.
 *
 * Ces interfaces décrivent uniquement la structure des contenus susceptibles
 * d'évoluer (catalogue, marques, catégories, revendeurs, bannières, blog).
 * Elles ne créent ni API, ni backend, ni base de données.
 */

export type BrandSectionId = "motos" | "equipements" | "pieces-detachees" | "partenaires";

/** Association normalisée entre une marque et une rubrique du catalogue. */
export interface BrandSectionAssociation {
  section: BrandSectionId;
  order: number;
  label?: string;
  routeId?: string;
  filterable?: boolean;
  displayMode?: "catalogue" | "partner-info";
  homeFeatured?: boolean;
  footerOrder?: number;
  footerFeaturedOrder?: number;
}

/** Enregistrement de marque stable, remplaçable ultérieurement par une réponse API. */
export interface Brand {
  id: string;
  name: string;
  logo: string;
  logoAlt: string;
  description?: string;
  isActive: boolean;
  sections: readonly BrandSectionAssociation[];
}

/** Diapositive héro de la page d'accueil, à terme fournie par l'API. */
export interface FeaturedBanner {
  id: string;
  short: string;
  brand: string;
  tag: string;
  image: string;
  alt: string;
  targetPage: string;
  targetId: string;
}

/** Promotion / nouveauté affichée sur la page d'accueil. */
export interface HomepagePromotion {
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
  publishedAt?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface Category {
  title: string;
  desc: string;
  src: string;
  to: string;
  brand?: string;
}

export interface BikeSpec {
  label: string;
  value: string;
}

export type BikeFamily = "Off-road" | "Urbain" | "3 roues";

export interface Bike {
  id: string;
  name: string;
  brand: string;
  family: BikeFamily;
  price: string;
  tag?: string;
  alt: string;
  image: string;
  gallery?: string[];
  specs: BikeSpec[];
  desc: string;
  /** Phrase éditoriale de recommandation, indépendante du moteur de sélection. */
  recommendation?: string;
  publishedAt?: string;
}

/** Alias explicite pour les futurs usages métier. */
export type Motorcycle = Bike;

export type AccessoryCategory = "Casques" | "Blousons" | "Gants" | "Bottes" | "Pièces";
export type PartType = "Pneus" | "Freinage" | "Transmission" | "Filtration" | "Pièces moteur" | "Consommables";
export type AccessoryKind = "piece" | "tld" | "gaerne" | "mt" | "tvs";
export type CompatibleBrand = "Universal" | "TVS" | "Sherco" | "Fantic";

export interface Part {
  id: string;
  name: string;
  price: string;
  image: string;
  kind: AccessoryKind;
  category?: AccessoryCategory;
  compatibleBrand?: CompatibleBrand;
  partType?: PartType;
  sourceUrl?: string;
  /** Galerie optionnelle — si absente, la fiche détail utilise [image]. */
  gallery?: string[];
  /** Courte description — sinon générée automatiquement dans la fiche. */
  desc?: string;
  /** Caractéristiques — sinon générées automatiquement dans la fiche. */
  specs?: BikeSpec[];
}

/** Alias explicite pour les équipements et pièces. */
export type AccessoryProduct = Part;

export interface Dealer {
  key: string;
  city: string;
  name: string;
  kind: string;
  address: string;
  hours: string;
  phone: string;
  email: string;
  desc: string;
  /** Libellé localisé utilisé par l'assistant dans les réponses de recherche de point de vente. */
  assistantLabel?: string;
  lat: number;
  lon: number;
  services: string[];
}

export interface Banner {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image: string;
  alt: string;
  targetPage: string;
  targetId?: string;
  publishedAt?: string;
}

export interface Promotion extends Banner {
  badge?: string;
  startsAt?: string;
  endsAt?: string;
}

/** Partenaire / marque affichable dans les zones éditoriales du site. */
export interface Partner {
  id: string;
  name: string;
  image: string;
  alt: string;
  description?: string;
  publishedAt?: string;
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  publishedAt: string;
  category?: string;
  tags?: string[];
}

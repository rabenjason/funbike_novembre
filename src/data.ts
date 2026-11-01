import type {
  AccessoryBrand,
  AccessoryBrandKey,
  AccessoryCategory,
  Bike,
  Brand,
  Category,
  Dealer,
  ExclusiveBrand,
  FeaturedBanner,
  HomepagePromotion,
  Part,
  PartType,
} from "./types";

export type {
  AccessoryBrand,
  AccessoryBrandKey,
  AccessoryCategory,
  Bike,
  Brand,
  Category,
  Dealer,
  ExclusiveBrand,
  FeaturedBanner,
  HomepagePromotion,
  Part,
  PartType,
};

/**
 * Données actuellement affichées par le frontend (sans client API ni simulation de backend).
 * Ces collections typées pourront être remplacées par les réponses de l'API lorsqu'elle existera.
 */

export const LOGO = "https://funbike.mg/wp-content/themes/funbike/images/logo-funbike.png";

export const BRANDS: Brand[] = [
  { name: "TVS", src: "https://funbike.mg/wp-content/uploads/2026/02/tvs-logo.png" },
  { name: "Fantic", src: "https://funbike.mg/wp-content/themes/funbike/images/fantic.png" },
  { name: "Sherco", src: "https://funbike.mg/wp-content/uploads/2026/02/sherco.png" },
  { name: "Bihr", src: "https://funbike.mg/wp-content/uploads/2026/02/bihr-logo.jpg" },
  { name: "Trace", src: "https://funbike.mg/wp-content/uploads/2026/02/Trace-1.png" },
  { name: "Gaerne", src: "https://funbike.mg/wp-content/uploads/2026/02/gaerne-logo.jpg" },
  { name: "Galfer", src: "https://funbike.mg/wp-content/uploads/2026/02/Galfer-logo.png" },
  { name: "MT Helmets", src: "https://funbike.mg/wp-content/uploads/2026/02/mt.png" },
  {
    name: "Troy Lee Designs",
    src: "https://funbike.mg/wp-content/uploads/2026/02/sticker-troy-lee-designs-shield-logo-rouge-16cm.png",
  },
];

const logoOf = (name: string) => BRANDS.find((brand) => brand.name === name)?.src ?? "";

/** Marques affichées comme distributeurs officiels sur l'accueil. */
export const EXCLUSIVE_BRANDS: ExclusiveBrand[] = [
  {
    key: "tvs",
    name: "TVS",
    tagline: "Robustesse garantie",
    image: "https://funbike.mg/wp-content/uploads/2026/02/tvs-logo.png",
  },
  {
    key: "fantic",
    name: "Fantic",
    tagline: "Performance italienne",
    image: "https://funbike.mg/wp-content/themes/funbike/images/fantic.png",
  },
  {
    key: "sherco",
    name: "Sherco",
    tagline: "ADN Compétition",
    image: "https://funbike.mg/wp-content/uploads/2026/02/sherco.png",
  },
];

/** Marques d'équipements affichées dans les sélecteurs de catalogue. */
export const ACCESSORY_BRANDS: AccessoryBrand[] = [
  {
    key: "tld",
    name: "Troy Lee Designs",
    logo: "https://funbike.mg/wp-content/uploads/2026/02/sticker-troy-lee-designs-shield-logo-rouge-16cm.png",
    alt: "Logo Troy Lee Designs",
  },
  { key: "gaerne", name: "Gaerne", logo: logoOf("Gaerne"), alt: "Logo Gaerne" },
  { key: "mt", name: "MT Helmets", logo: logoOf("MT Helmets"), alt: "Logo MT Helmets" },
  { key: "tvs", name: "TVS", logo: logoOf("TVS"), alt: "Logo TVS" },
  { key: "bihr", name: "BIHR", logo: logoOf("Bihr"), alt: "Logo Bihr" },
];

export const CATEGORIES: Category[] = [
  {
    title: "Motos TVS & Urbain",
    desc: "Mobilité quotidienne, robuste et économique.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/raider.png",
    to: "motos",
  },
  {
    title: "Casques & Protections",
    desc: "Sécurité homologuée, confort longue distance.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/tld-casque.png",
    to: "equipements",
    brand: "tld",
  },
  {
    title: "Pièces détachées",
    desc: "Pneus, kits chaîne, freinage et consommables.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/piece.jpg",
    to: "spares",
  },
  {
    title: "Tenues & Équipements",
    desc: "Équipements pilote Troy Lee Designs.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/tenu.jpg",
    to: "equipements",
    brand: "tld",
  },
];

/** Slides actuelles du hero — remplaçables par une collection de bannières d'API. */
export const FEATURED_BANNERS: FeaturedBanner[] = [
  {
    id: "sherco-sef-250-factory-2026",
    short: "SEF 250 Factory",
    brand: "Sherco",
    tag: "Enduro / Factory",
    image: "https://funbike.mg/wp-content/uploads/2026/02/01-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
    alt: "Sherco SEF 250 Factory 2026 en action",
    targetPage: "product",
    targetId: "sherco-sef-250-factory-2026",
  },
  {
    id: "sherco-sef-300-factory-2026",
    short: "SEF 300 Factory",
    brand: "Sherco",
    tag: "Enduro / Factory",
    image: "https://funbike.mg/wp-content/uploads/2026/02/01-300-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
    alt: "Sherco SEF 300 Factory 2026 en action",
    targetPage: "product",
    targetId: "sherco-sef-300-factory-2026",
  },
  {
    id: "xx-125-2026",
    short: "XX 125 Off-Road",
    brand: "Fantic",
    tag: "Cross / 125 cc",
    image: "https://funbike.mg/wp-content/uploads/2026/02/7b566adac57a4b5dbfd74d4f768e6fdb.jpg",
    alt: "Fantic XX 125 2026 sur piste",
    targetPage: "product",
    targetId: "xx-125-2026",
  },
];

export const BIKES: Bike[] = [
  {
    id: "sherco-sef-250-factory-2026",
    name: "Sherco SEF 250 Factory 2026",
    brand: "Sherco",
    family: "Off-road",
    price: "Sur devis",
    tag: "Nouveauté 2026",
    alt: "Sherco 250 SEF Factory 2026 – vue latérale",
    image:
      "https://funbike.mg/wp-content/uploads/2026/02/01-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
    gallery: [
      "https://funbike.mg/wp-content/uploads/2026/02/01-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
      "https://funbike.mg/wp-content/uploads/2026/02/08-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
      "https://funbike.mg/wp-content/uploads/2026/02/07-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
      "https://funbike.mg/wp-content/uploads/2026/02/06-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
      "https://funbike.mg/wp-content/uploads/2026/02/05-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
    ],
    specs: [
      { label: "Cylindrée", value: "250 cc – 4 temps" },
      { label: "Refroidissement", value: "Liquide" },
      { label: "Suspension", value: "KYB Factory" },
      { label: "Freins", value: "Galfer / Brembo" },
      { label: "Poids", value: "≈ 105 kg" },
    ],
    desc:
      "La référence enduro Sherco en finition Factory : châssis affûté, suspensions KYB haut de gamme et moteur 250 cc au couple généreux. Une machine de compétition prête à dévorer les pistes de Madagascar.",
    recommendation: "une machine d'enduro performante pour la piste et le tout-terrain",
  },
  {
    id: "sherco-sef-300-factory-2026",
    name: "Sherco SEF 300 Factory 2026",
    brand: "Sherco",
    family: "Off-road",
    price: "Sur devis",
    tag: "Nouveauté 2026",
    alt: "Sherco 300 SEF Factory 2026 – vue latérale",
    image:
      "https://funbike.mg/wp-content/uploads/2026/02/01-300-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg",
    specs: [
      { label: "Cylindrée", value: "300 cc – 4 temps" },
      { label: "Refroidissement", value: "Liquide" },
      { label: "Suspension", value: "KYB Factory" },
      { label: "Cartographies", value: "2 mappings" },
      { label: "Poids", value: "≈ 107 kg" },
    ],
    desc:
      "Plus de couple, plus de traction : la SEF 300 Factory est taillée pour l'enduro extrême et les longues liaisons hors-piste.",
    recommendation: "plus de couple et d'autonomie pour l'enduro exigeant et les longues liaisons",
  },
  {
    id: "xx-125-2026",
    name: "XX 125 2026",
    brand: "Fantic",
    family: "Off-road",
    price: "Sur devis",
    tag: "Best-seller",
    alt: "XX 125 2026 – moto off-road",
    image: "https://funbike.mg/wp-content/uploads/2026/02/7b566adac57a4b5dbfd74d4f768e6fdb.jpg",
    specs: [
      { label: "Cylindrée", value: "125 cc – 2 temps" },
      { label: "Démarrage", value: "Électrique" },
      { label: "Châssis", value: "Double berceau acier" },
      { label: "Usage", value: "Cross / Enduro" },
    ],
    desc:
      "Légère, vive et facile à prendre en main : la XX 125 est la porte d'entrée idéale vers le tout-terrain sportif.",
    recommendation: "légère et facile à prendre en main, idéale pour débuter le tout-terrain",
  },
  {
    id: "offroad-450",
    name: "Enduro 450 Factory",
    brand: "Sherco",
    family: "Off-road",
    price: "Sur devis",
    alt: "Moto enduro 450 cc",
    image: "https://funbike.mg/wp-content/uploads/2026/02/450.jpg",
    specs: [
      { label: "Cylindrée", value: "450 cc" },
      { label: "Usage", value: "Rallye / Enduro" },
      { label: "Réservoir", value: "9,7 L" },
    ],
    desc: "Le gros cube tout-terrain pour les raids et les pilotes expérimentés.",
    recommendation: "le gros cube pour les raids et les longues distances",
  },
  {
    id: "offroad-trail",
    name: "Trail Adventure",
    brand: "Fantic",
    family: "Off-road",
    price: "Sur devis",
    alt: "Moto trail aventure",
    image: "https://funbike.mg/wp-content/uploads/2026/02/845c5d0ddcdd409eabc272f6c042e305.jpg",
    specs: [
      { label: "Usage", value: "Trail / Aventure" },
      { label: "Roues", value: "21\" / 18\"" },
    ],
    desc: "Polyvalence route et piste, pour partir loin sans compromis.",
    recommendation: "polyvalente route et piste pour partir loin sans compromis",
  },
  {
    id: "tvs-hlx-plus",
    name: "TVS HLX Plus",
    brand: "TVS",
    family: "Urbain",
    price: "Sur devis",
    alt: "TVS HLX Plus noire – vue latérale",
    image: "https://funbike.mg/wp-content/uploads/2026/02/hlx-plus-black.jpg",
    specs: [
      { label: "Cylindrée", value: "150 cc" },
      { label: "Charge utile", value: "Renforcée" },
      { label: "Consommation", value: "≈ 2 L / 100 km" },
    ],
    desc: "La monture utilitaire par excellence : increvable, économique, parfaite pour les routes exigeantes.",
    recommendation: "utilitaire increvable et économique pour le travail et la ville",
  },
  {
    id: "tvs-bleu",
    name: "TVS Sport Series",
    brand: "TVS",
    family: "Urbain",
    price: "Sur devis",
    tag: "3 coloris",
    alt: "TVS bleue – vue latérale",
    image: "https://funbike.mg/wp-content/uploads/2026/02/blue-1.png",
    gallery: [
      "https://funbike.mg/wp-content/uploads/2026/02/blue-1.png",
      "https://funbike.mg/wp-content/uploads/2026/02/1.png",
      "https://funbike.mg/wp-content/uploads/2026/02/black-1.png",
    ],
    specs: [
      { label: "Cylindrée", value: "110 cc" },
      { label: "Boîte", value: "4 rapports" },
      { label: "Coloris", value: "Bleu / Gris / Noir" },
    ],
    desc:
      "Un style moderne et un moteur sobre : la Sport Series se décline en plusieurs coloris pour la ville comme pour les trajets quotidiens.",
    recommendation: "sobre et confortable pour la ville et les trajets quotidiens",
  },
  {
    id: "tvs-200-4v",
    name: "TVS Apache 200 4V",
    brand: "TVS",
    family: "Urbain",
    price: "Sur devis",
    alt: "TVS 200 4V – bannière",
    image: "https://funbike.mg/wp-content/uploads/2026/02/Banner_200_4V.png",
    specs: [
      { label: "Cylindrée", value: "200 cc – 4 soupapes" },
      { label: "Freinage", value: "ABS" },
      { label: "Mode", value: "Sport / Urbain / Pluie" },
    ],
    desc: "La sportive urbaine de TVS : nerveuse, équipée ABS et d'un tableau de bord connecté.",
    recommendation: "sportive nerveuse, ABS et confort, pour la ville comme les longs trajets",
  },
  {
    id: "tvs-red",
    name: "TVS Raider Rouge",
    brand: "TVS",
    family: "Urbain",
    price: "Sur devis",
    alt: "TVS rouge – vue latérale",
    image: "https://funbike.mg/wp-content/uploads/2026/02/red.png",
    specs: [
      { label: "Cylindrée", value: "125 cc" },
      { label: "Écran", value: "LCD / TFT" },
    ],
    desc: "Design agressif et consommation maîtrisée pour les jeunes conducteurs.",
    recommendation: "agile et économique, un design agressif pour la ville",
  },
  {
    id: "tvs-125-hlx-5g",
    name: "TVS 125 HLX 5G",
    brand: "TVS",
    family: "Urbain",
    price: "Sur devis",
    alt: "TVS 125 HLX 5G – vue latérale",
    image: "https://funbike.mg/wp-content/uploads/2026/02/125hlx-5g.png",
    specs: [
      { label: "Cylindrée", value: "125 cc" },
      { label: "Boîte", value: "5 rapports" },
      { label: "Usage", value: "Mixte ville / brousse" },
    ],
    desc: "Cinq rapports et une fiabilité éprouvée pour rouler partout, tous les jours.",
    recommendation: "économique et maniable, fiable pour rouler partout tous les jours",
  },
  {
    id: "tuktuk",
    name: "TVS King Tuktuk",
    brand: "TVS",
    family: "3 roues",
    price: "Sur devis",
    alt: "Tuktuk TVS 3 roues",
    image: "https://funbike.mg/wp-content/uploads/2026/02/tuktuk.png",
    specs: [
      { label: "Places", value: "3 + 1" },
      { label: "Motorisation", value: "Essence / Diesel" },
      { label: "Usage", value: "Transport urbain" },
    ],
    desc: "Le 3 roues de référence pour le transport de personnes et de marchandises en ville.",
    recommendation: "le 3 roues pour transporter passagers et marchandises en ville",
  },
  {
    id: "concept-urbain",
    name: "Édition Spéciale Funbike",
    brand: "Funbike",
    family: "Urbain",
    price: "Sur devis",
    alt: "Visuel moto édition spéciale Funbike",
    image:
      "https://funbike.mg/wp-content/uploads/2026/02/Gemini_Generated_Image_mmvxscmmvxscmmvx.png",
    specs: [{ label: "Série", value: "Limitée" }],
    desc: "Une série personnalisée par nos ateliers Funbike.",
    recommendation: "une série spéciale polyvalente, confortable et soignée",
  },
];

/** Nouveautés et mises en avant actuellement utilisées sur la page d'accueil. */
export const HOME_PROMOTIONS: HomepagePromotion[] = [
  {
    id: "sherco-sef-250-factory-2026",
    badge: "Nouveauté 2026",
    eyebrow: "Sherco / Enduro",
    title: "SEF 250 Factory",
    description:
      "La nouvelle génération Factory arrive chez Funbike : suspensions KYB, châssis affûté et moteur 250 cc.",
    image: BIKES.find((bike) => bike.id === "sherco-sef-250-factory-2026")!.image,
    alt: "Sherco SEF 250 Factory 2026 sur piste",
    highlights: ["Suspensions KYB", "Deux cartographies", "Freinage Galfer"],
    price: "Sur devis",
    targetPage: "product",
    targetId: "sherco-sef-250-factory-2026",
  },
  {
    id: "tvs-200-4v",
    badge: "Arrivage",
    eyebrow: "TVS / Urbain sportif",
    title: "Apache 200 4V",
    description:
      "Une sportive urbaine pensée pour le quotidien : moteur 200 cc, ABS et plusieurs modes de conduite.",
    image: BIKES.find((bike) => bike.id === "tvs-200-4v")!.image,
    alt: "TVS Apache 200 4V",
    highlights: ["ABS", "Modes de conduite", "Tableau de bord digital"],
    price: "Sur devis",
    targetPage: "product",
    targetId: "tvs-200-4v",
  },
  {
    id: "tld",
    badge: "Collection 2026",
    eyebrow: "Troy Lee Designs / Pilote",
    title: "Casques GP Pro",
    description:
      "Les nouveaux graphismes Pulse, Slides et Segment viennent renouveler la gamme de casques pilote.",
    image: "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D2_GPPRO_PULSE_BLACK_01.jpg?v=1785777688&width=533",
    alt: "Casque Troy Lee Designs GP Pro Pulse Black",
    highlights: ["Coque légère", "Ventilation travaillée", "Graphismes inédits"],
    price: "Sur devis",
    targetPage: "equipements",
    targetId: "tld",
  },
];

export const PARTS: Part[] = [
  {
    id: "p1",
    name: "Plaquettes de frein haute performance",
    price: "Sur devis",
    kind: "piece",
    image:
      "https://cdn-yotpo-images-production.yotpo.com/Product/837892549/740931563/square.jpg?1755178217",
  },
  {
    id: "p2",
    name: "Kit filtration & entretien",
    price: "Sur devis",
    kind: "piece",
    image:
      "https://cdn-yotpo-images-production.yotpo.com/Product/836248611/740931526/square.jpg?1755178209",
  },
  {
    id: "p3",
    name: "Disque de frein Galfer Wave",
    price: "Sur devis",
    kind: "piece",
    image:
      "https://cdn-yotpo-images-production.yotpo.com/Product/991698882/813387400/square.png?1771518029",
  },
  {
    id: "p4",
    name: "Consommables moteur d'origine",
    price: "Sur devis",
    kind: "piece",
    image:
      "https://cdn-yotpo-images-production.yotpo.com/Product/994718071/815908743/square.jpg?1772478723",
  },
  {
    id: "p5",
    name: "Kit chaîne renforcé",
    price: "Sur devis",
    kind: "piece",
    image:
      "https://cdn-yotpo-images-production.yotpo.com/Product/984148506/813386371/square.jpg?1771517753",
  },
  {
    id: "p6",
    name: "Pièce mécanique d'origine",
    price: "Sur devis",
    kind: "piece",
    image:
      "https://cdn-yotpo-images-production.yotpo.com/Product/561407269/468114750/square.jpg?1695292535",
  },
];

/* ------------------------------------------------------------------ */
/*  Pièces détachées simulées par marque                               */
/*  Références indicatives : compatibilité et stock à confirmer.       */
/* ------------------------------------------------------------------ */

export const TVS_PARTS: Part[] = [
  {
    id: "tvs-part-tyre-front",
    name: "Pneu avant route TVS 90/90-17",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/837892549/740931563/square.jpg?1755178217",
  },
  {
    id: "tvs-part-tyre-rear",
    name: "Pneu arrière TVS 100/90-17",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/836248611/740931526/square.jpg?1755178209",
  },
  {
    id: "tvs-part-chain-kit",
    name: "Kit chaîne renforcé TVS 428",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/984148506/813386371/square.jpg?1771517753",
  },
  {
    id: "tvs-part-brake-pads",
    name: "Plaquettes de frein avant TVS",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/994718071/815908743/square.jpg?1772478723",
  },
  {
    id: "tvs-part-air-filter",
    name: "Filtre à air TVS HLX / Raider",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/561407269/468114750/square.jpg?1695292535",
  },
  {
    id: "tvs-part-brake-disc",
    name: "Disque de frein avant TVS",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/991698882/813387400/square.png?1771518029",
  },
  {
    id: "tvs-part-clutch-cable",
    name: "Câble d’embrayage TVS",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://funbike.mg/wp-content/themes/funbike/images/piece.jpg",
  },
  {
    id: "tvs-part-service-kit",
    name: "Kit entretien moteur TVS",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "TVS",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/561407269/468114750/square.jpg?1695292535",
  },
];

export const SHERCO_PARTS: Part[] = [
  {
    id: "sherco-part-chain-kit",
    name: "Kit chaîne enduro Sherco",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "Sherco",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/984148506/813386371/square.jpg?1771517753",
  },
  {
    id: "sherco-part-brake-disc",
    name: "Disque de frein Galfer Sherco",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "Sherco",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/991698882/813387400/square.png?1771518029",
  },
  {
    id: "sherco-part-filter-kit",
    name: "Kit filtres enduro Sherco",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "Sherco",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/836248611/740931526/square.jpg?1755178209",
  },
];

export const FANTIC_PARTS: Part[] = [
  {
    id: "fantic-part-chain-kit",
    name: "Kit chaîne cross Fantic XX 125",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "Fantic",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/984148506/813386371/square.jpg?1771517753",
  },
  {
    id: "fantic-part-brake-pads",
    name: "Plaquettes de frein Fantic",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "Fantic",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/994718071/815908743/square.jpg?1772478723",
  },
  {
    id: "fantic-part-air-filter",
    name: "Filtre à air Fantic XX 125",
    price: "Sur demande",
    kind: "piece",
    category: "Pièces",
    compatibleBrand: "Fantic",
    image: "https://cdn-yotpo-images-production.yotpo.com/Product/561407269/468114750/square.jpg?1695292535",
  },
];

/* ------------------------------------------------------------------ */
/*  Typologie des pièces détachées (filtre « Type »)                   */
/*  Références indicatives : compatibilité et stock à confirmer.       */
/* ------------------------------------------------------------------ */

const SPARE_PART_TYPE_BY_ID: Record<string, PartType> = {
  // Pièces universelles
  p1: "Freinage",
  p2: "Filtration",
  p3: "Freinage",
  p4: "Consommables",
  p5: "Transmission",
  p6: "Pièces moteur",
  // TVS
  "tvs-part-tyre-front": "Pneus",
  "tvs-part-tyre-rear": "Pneus",
  "tvs-part-chain-kit": "Transmission",
  "tvs-part-brake-pads": "Freinage",
  "tvs-part-air-filter": "Filtration",
  "tvs-part-brake-disc": "Freinage",
  "tvs-part-clutch-cable": "Transmission",
  "tvs-part-service-kit": "Consommables",
  // Sherco
  "sherco-part-chain-kit": "Transmission",
  "sherco-part-brake-disc": "Freinage",
  "sherco-part-filter-kit": "Filtration",
  // Fantic
  "fantic-part-chain-kit": "Transmission",
  "fantic-part-brake-pads": "Freinage",
  "fantic-part-air-filter": "Filtration",
};

/** Toutes les pièces détachées et consommables, avec leur type. */
export const SPARE_PARTS: Part[] = [...PARTS, ...TVS_PARTS, ...SHERCO_PARTS, ...FANTIC_PARTS].map((part) => ({
  ...part,
  partType: SPARE_PART_TYPE_BY_ID[part.id],
}));

export const TLD: Part[] = [
  {
    id: "t1",
    name: "GP Pro Pulse – Black",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D2_GPPRO_PULSE_BLACK_01.jpg?v=1785777688&width=533",
  },
  {
    id: "t2",
    name: "GP Pro Slides – Gray",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D2_GPPRO_SLIDES_GRAY_01.jpg?v=1785777680&width=533",
  },
  {
    id: "t3",
    name: "GP Pro Slides – White/Blue",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D2_GPPRO_SLIDES_WHITE-BLUE_01.jpg?v=1785777567&width=533",
  },
  {
    id: "t4",
    name: "GP Pro Segment – Black",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D1_GPRO_SEGMENT_BLACK_01.jpg?v=1772821835&width=533",
  },
  {
    id: "t5",
    name: "GP Pro Segment – Red",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D1_GPRO_SEGMENT_RED_01.jpg?v=1772821827&width=533",
  },
  {
    id: "t6",
    name: "GP Pro Segment – Blue",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D1_GPRO_SEGMENT_BLUE_02.jpg?v=1773162422&width=533",
  },
  {
    id: "t7",
    name: "GP Pro Mono – Pumice",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D1_GPRO_MONO_PUMICE_02.jpg?v=1772821833&width=533",
  },
  {
    id: "t8",
    name: "GP Pro Fifty50 – White/Red",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/tld_m25d1_gpro_fifty50_whtred_02.jpg?v=1741872477&width=533",
  },
  {
    id: "t9",
    name: "GP Pro Crossover – Navy/Red",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M25D2_GPRO_CROSSOVER_NAVYRED_02_3ea31708-ad89-477c-aece-9ad1da19469b.jpg?v=1756291038&width=533",
  },
  {
    id: "t10",
    name: "GP Pro Trooper – Black/Caper",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/tld_m25d1_gpro_trooper_blkcaper_01.jpg?v=1747143175&width=533",
  },
  {
    id: "t11",
    name: "GP Pro Crossover – Gray/Yellow",
    price: "Sur devis",
    kind: "tld",
    image:
      "https://troyleedesigns.eu/cdn/shop/files/TLD_M25D2_GPRO_CROSSOVER_GRAYFLOYELLOW_01.jpg?v=1756290885&width=533",
  },
];

// References and images from the official TVS Motor accessories catalogue.
// The Indian online catalogue does not indicate stock or prices in Madagascar.
export const TVS_ACCESSORIES: Part[] = [
  {
    id: "tvs-helmet-raider",
    kind: "tvs",
    category: "Casques",
    name: "Casque intégral TVS Raider",
    price: "Sur demande",
    image: "https://cdn.shopify.com/s/files/1/0757/0722/0250/files/N600RFRL_4.jpg?v=1724156935",
    sourceUrl: "https://shop.tvsmotor.com/products/helmet-raider-ff-rb",
  },
  {
    id: "tvs-helmet-anti-matter",
    kind: "tvs",
    category: "Casques",
    name: "Casque TVS Racing Anti Matter",
    price: "Sur demande",
    image: "https://cdn.shopify.com/s/files/1/0757/0722/0250/files/1_e66e7c22-25ea-4f03-956b-2aadc3cd6883.jpg?v=1767073703",
    sourceUrl: "https://shop.tvsmotor.com/products/tvs-racing-anti-matter-full-face-helmet-for-bike-motorcycle-riders-dot-isi-certified-lightweight-abs-shell-uv-resistant-ventilated-comfort-liner-quick-release-visor-chin-strap-matt-black",
  },
  {
    id: "tvs-jacket-tech-core",
    kind: "tvs",
    category: "Blousons",
    name: "Blouson TVS Racing Tech-Core",
    price: "Sur demande",
    image: "https://cdn.shopify.com/s/files/1/0757/0722/0250/files/1_c2bb9124-2b40-455e-883c-5f61789979df.jpg?v=1764317227",
    sourceUrl: "https://shop.tvsmotor.com/products/tvs-racing-tech-core-road-jacket-for-men-ce2-armour-5kn-at-shoulders-elbows-and-back-600d-chassis-310gsm-vent-mesh-high-vis-reflective-tech-ykk-zippers-engineered-for-bikers",
  },
  {
    id: "tvs-jacket-aegis",
    kind: "tvs",
    category: "Blousons",
    name: "Blouson TVS Racing Aegis 3 couches",
    price: "Sur demande",
    image: "https://cdn.shopify.com/s/files/1/0757/0722/0250/files/NF300193AR_1_1dbd245d-baaa-4649-b176-7c12787d4fcf.webp?v=1724478704",
    sourceUrl: "https://shop.tvsmotor.com/products/tvs-racing-aegis-riding-jacket-3-layer-red-videotest",
  },
  {
    id: "tvs-gloves-city",
    kind: "tvs",
    category: "Gants",
    name: "Gants TVS Racing City",
    price: "Sur demande",
    image: "https://cdn.shopify.com/s/files/1/0757/0722/0250/products/NF600560_1_c4e8d4b2-31cc-40ca-befb-f9b4596cc8e7.png?v=1691470179",
    sourceUrl: "https://shop.tvsmotor.com/products/tvs-racing-riding-gloves-city-blue-red",
  },
];

/* ------------------------------------------------------------------ */
/*  Gaerne – Bottes moto                                               */
/* ------------------------------------------------------------------ */

export const GAERNE: Part[] = [
  {
    id: "g1",
    name: "Gaerne SG-12 – Black",
    price: "Sur devis",
    kind: "gaerne",
    image:
      "https://www.redplatepowersports.com/cdn/shop/files/Gaerne-SG12-Motocross-Boots-Black-Pair.jpg?v=1723094575&width=600",
  },
  {
    id: "g2",
    name: "Gaerne SG-12 – White/Black",
    price: "Sur devis",
    kind: "gaerne",
    image:
      "https://www.redplatepowersports.com/cdn/shop/files/Gaerne-SG12-Motocross-Boots-White-Pair.jpg?v=1723094575&width=600",
  },
  {
    id: "g3",
    name: "Gaerne SG-22 – Black",
    price: "Sur devis",
    kind: "gaerne",
    image:
      "https://www.redplatepowersports.com/cdn/shop/files/Gaerne-SG22-Motocross-Boots-Black-Pair.jpg?v=1723094575&width=600",
  },
  {
    id: "g4",
    name: "Gaerne Cross-Ace – Black",
    price: "Sur devis",
    kind: "gaerne",
    image:
      "https://www.redplatepowersports.com/cdn/shop/files/Gaerne-Cross-Ace-Black-Pair.jpg?v=1723094575&width=600",
  },
  {
    id: "g5",
    name: "Gaerne Speed Star – Black",
    price: "Sur devis",
    kind: "gaerne",
    image:
      "https://www.redplatepowersports.com/cdn/shop/files/Gaerne-Speed-Star-Black-Pair.jpg?v=1723094575&width=600",
  },
  {
    id: "g6",
    name: "Gaerne Balance – Gray",
    price: "Sur devis",
    kind: "gaerne",
    image:
      "https://www.redplatepowersports.com/cdn/shop/files/Gaerne-Balance-Gray-Pair.jpg?v=1723094575&width=600",
  },
];

/* ------------------------------------------------------------------ */
/*  MT Helmets – Casques moto                                          */
/* ------------------------------------------------------------------ */

export const MT_HELMETS: Part[] = [
  {
    id: "h1",
    name: "MT Thunder 4 SV – Black",
    price: "Sur devis",
    kind: "mt",
    image:
      "https://mthelmets.com/cdn/shop/files/MT-Thunder-4-SV-Black.jpg?v=1723094575&width=600",
  },
  {
    id: "h2",
    name: "MT Thunder 4 SV – Matte Black",
    price: "Sur devis",
    kind: "mt",
    image:
      "https://mthelmets.com/cdn/shop/files/MT-Thunder-4-SV-Matte-Black.jpg?v=1723094575&width=600",
  },
  {
    id: "h3",
    name: "MT Hornet – White",
    price: "Sur devis",
    kind: "mt",
    image:
      "https://mthelmets.com/cdn/shop/files/MT-Hornet-White.jpg?v=1723094575&width=600",
  },
  {
    id: "h4",
    name: "MT Hornet – Black",
    price: "Sur devis",
    kind: "mt",
    image:
      "https://mthelmets.com/cdn/shop/files/MT-Hornet-Black.jpg?v=1723094575&width=600",
  },
  {
    id: "h5",
    name: "MT Rapide – Black/Red",
    price: "Sur devis",
    kind: "mt",
    image:
      "https://mthelmets.com/cdn/shop/files/MT-Rapide-Black-Red.jpg?v=1723094575&width=600",
  },
  {
    id: "h6",
    name: "MT Rapide – White/Blue",
    price: "Sur devis",
    kind: "mt",
    image:
      "https://mthelmets.com/cdn/shop/files/MT-Rapide-White-Blue.jpg?v=1723094575&width=600",
  },
];

/** Tous les équipements destinés au pilote (casques, tenues, bottes, gants). */
export const GEAR_ITEMS: Part[] = [...TVS_ACCESSORIES, ...TLD, ...GAERNE, ...MT_HELMETS];

/** Points de vente actuellement affichés ; contenu typé, remplaçable par l'API. */
export const DEALERS: Dealer[] = [
  {
    key: "antananarivo",
    city: "Antananarivo",
    name: "Funbike Showroom",
    kind: "Showroom principal",
    address: "Ambodivona, Antananarivo",
    hours: "Lun – Sam · 8h30 – 17h30",
    phone: "+261 34 00 000 00",
    email: "contact@funbike.mg",
    desc: "Le point de départ de votre prochaine aventure. Retrouvez les motos, les équipements et notre atelier à la même adresse.",
    assistantLabel: "Antananarivo (showroom principal, Ambodivona)",
    lat: -18.8792,
    lon: 47.5079,
    services: ["Motos", "Essais", "Atelier", "Pièces"],
  },
  {
    key: "toamasina",
    city: "Toamasina",
    name: "Funbike Est",
    kind: "Point de vente",
    address: "Boulevard Joffre, Toamasina",
    hours: "Lun – Ven · 9h – 17h",
    phone: "+261 34 11 111 11",
    email: "est@funbike.mg",
    desc: "Sur la côte est, une équipe à vos côtés pour choisir votre moto, vous équiper et assurer l'entretien courant.",
    assistantLabel: "Toamasina (Funbike Est, boulevard Joffre)",
    lat: -18.1492,
    lon: 49.4023,
    services: ["Motos", "Équipements", "Entretien"],
  },
  {
    key: "mahajanga",
    city: "Mahajanga",
    name: "Funbike Nord-Ouest",
    kind: "Point de vente",
    address: "Avenue de France, Mahajanga",
    hours: "Lun – Ven · 9h – 17h",
    phone: "+261 34 22 222 22",
    email: "ouest@funbike.mg",
    desc: "Votre relais Funbike dans le nord-ouest pour les motos, les essais et les commandes de pièces.",
    assistantLabel: "Mahajanga (Funbike Nord-Ouest, avenue de France)",
    lat: -15.7167,
    lon: 46.3167,
    services: ["Motos", "Essais", "Pièces"],
  },
  {
    key: "fianarantsoa",
    city: "Fianarantsoa",
    name: "Atelier Partenaire",
    kind: "Atelier partenaire",
    address: "Route nationale 7, Fianarantsoa",
    hours: "Lun – Sam · 8h – 16h",
    phone: "+261 34 33 333 33",
    email: "sud@funbike.mg",
    desc: "Sur la RN7, un atelier partenaire pour l'entretien, les réparations et le montage de pièces.",
    assistantLabel: "Fianarantsoa (atelier partenaire, RN7)",
    lat: -21.4527,
    lon: 47.0857,
    services: ["Atelier", "Pièces", "Entretien"],
  },
];

/** Tous les accessoires (pièces + équipements), sans doublons, pour les fiches détail. */
export const ALL_PARTS: Part[] = (() => {
  const seen = new Set<string>();
  return [...SPARE_PARTS, ...GEAR_ITEMS].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
})();

export function findPart(id?: string): Part | undefined {
  if (!id) return undefined;
  return ALL_PARTS.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/*  Mise à jour de Part : équipements Gaerne et MT Helmets inclus      */
/* ------------------------------------------------------------------ */

import { chat as chatInterface } from "./navigation";

/** Textes des réponses automatiques et du questionnaire de recommandation. */
export const assistantCopy = {
  quick: {
    defaults: chatInterface.suggestionsRapides,
    name: ["Une moto", "Une pièce", "Un casque"],
    showroom: ["Horaires du showroom", "Réserver un essai"],
    showroomAndBikes: ["Réserver un essai", "Motos disponibles"],
    workshop: ["Pièces pour ma moto", "Horaires du showroom"],
    compare: ["Comparer les deux premières", "Laquelle pour débuter ?"],
    comparePrompt: ["Comparer deux modèles"],
    spec: ["Prix de ce modèle", "Réserver un essai", "Comparer"],
    gear: ["Casques", "Bottes de moto", "Voir les équipements"],
    gearSizing: ["Quelle taille choisir ?", "Voir les équipements"],
    parts: ["Plaquettes de frein", "Kit chaîne", "Contacter l'atelier"],
    search: ["Comparer les deux premières", "Laquelle pour débuter ?", "Prix"],
    catalog: ["Enduro / off-road", "Motos disponibles", "Pièces détachées"],
  },
  emptyInput: "Je vous écoute ! Posez-moi votre question.",
  nameResponse: (name: string) => `Enchanté ${name} ! Dites-moi ce que vous cherchez : une moto, une pièce ou un équipement ?`,
  greeting: {
    morning: "Bonjour",
    evening: "Bonsoir",
    malagasy: (name: string) => `Salama${name} ! Tongasoa eto amin'ny Funbike. Je peux vous aider en français : quelle moto vous intéresse ?`,
    friendly: (salutation: string, name: string) => `${salutation}${name} ! Comment puis-je vous aider aujourd'hui ?`,
    options: ["Bonjour", "Hello", "Ravi de vous lire"],
    firstVisit: (salutation: string, name: string) => `${salutation}${name} ! Je suis **Piston**, le conseiller virtuel de Funbike.\nJe peux vous aider à consulter les motos, pièces et équipements du catalogue. Que recherchez-vous ?`,
  },
  goodbye: (name: string) => `Merci de votre visite${name} ! À très bientôt chez Funbike, et bonne route.`,
  thanks: {
    options: (name: string) => [`Avec plaisir${name} !`, "Je vous en prie !", "Toujours là pour aider !"],
    followUp: " Autre chose ?",
  },
  spec: {
    answer: (bike: string, label: string, value: string) => `Sur la **${bike}**, ${label.toLowerCase()} : **${value}**.`,
    unknown: (bike: string) => `Je n'ai pas cette information pour la **${bike}** dans ma fiche. L'équipe peut vous la confirmer.`,
    listTitle: (bike: string) => `Fiche **${bike}** :`,
    listItem: (label: string, value: string) => `• ${label} : ${value}`,
  },
  contact: {
    team: () => "Bien sûr. Consultez la page Contact pour les coordonnées enregistrées du point de vente et le formulaire de demande.",
    writeTeam: "Écrire à l'équipe",
    askQuote: "Demander un devis",
    contactCounselor: "Contacter un conseiller",
    contactWorkshop: "Contacter l'atelier",
    openSheet: "Ouvrir la fiche",
  },
  dealers: {
    selected: (location: string) => `Le point de vente **${location}** est enregistré dans le catalogue. Ouvrez sa fiche pour consulter la carte et les coordonnées.`,
    overview: (count: number, list: string) => `Le catalogue contient **${count} point(s) de vente** : ${list}. Ouvrez la page Revendeurs pour consulter leurs coordonnées.`,
    unavailable: "Aucun revendeur n’est enregistré ou les coordonnées ne sont pas disponibles dans le catalogue.",
    seeDealers: "Voir les revendeurs",
    allDealers: "Tous les revendeurs",
    contactUs: "Nous contacter",
  },
  showroom: {
    hours: (city: string, hours: string) => `Point de vente à **${city}**. Horaires enregistrés : **${hours}**.`,
    reserveTest: "Réserver un essai",
    availableBikes: "Motos disponibles",
  },
  price: {
    forBike: (bike: string, price: string) => `Le prix enregistré pour la **${bike}** est **${price}**.`,
    forProduct: (product: string, price: string) => `Le prix enregistré pour **${product}** est **${price}**.`,
    productNotFound: "Je ne trouve pas de référence correspondante dans le catalogue. Vérifiez le nom ou la référence, ou contactez l'équipe Funbike.",
    general: "Indiquez le nom ou la référence du modèle pour consulter son prix enregistré dans le catalogue.",
    seeSheet: "Voir la fiche",
    reserveTest: "Réserver un essai",
  },
  financing: "Les modalités de paiement se discutent directement avec l'équipe commerciale, selon le modèle choisi. Envoyez une demande et on vous répond avec les options possibles.",
  testRide: (name: string, bike: string) => `Excellente idée${name} ! Les essais se réservent auprès du point de vente${bike ? ` pour la **${bike}**` : ""}. Laissez vos coordonnées dans le formulaire de contact et l'équipe vous rappellera pour fixer un créneau.`,
  workshop: (bike: string) => `Notre atelier s'occupe de l'entretien, des révisions et des réparations${bike ? `, y compris sur la **${bike}**` : ""}. Indiquez le modèle et l'année de votre moto pour un diagnostic rapide.`,
  compare: {
    title: (first: string, second: string) => `Voici la comparaison **${first}** vs **${second}** :`,
    askModels: "Dites-moi les deux noms de modèles à comparer, tels qu'ils apparaissent dans le catalogue.",
    example: "Comparer deux motos",
    firstSheet: (name: string) => `Fiche ${name}`,
    beginner: "Laquelle pour débuter ?",
  },
  openProduct: (name: string) => `Voici la **${name}**. Touchez la carte pour ouvrir la fiche complète.`,
  sizing: "Pour un **casque** : mesurez votre tour de tête avec un mètre ruban, environ 2 cm au-dessus des sourcils. Le casque doit serrer uniformément, sans point de pression.\nPour des **bottes** : partez de votre pointure habituelle.\nLe plus sûr reste l'essayage au showroom, l'équipe vous guide.",
  gear: {
    brand: (brand: string, count: number) => `Le catalogue contient **${count} référence(s) d'équipement ${brand}**. Consultez les fiches pour les détails disponibles.`,
    boots: "Consultez les équipements du catalogue et contactez l'équipe Funbike pour confirmer la pointure et la disponibilité.",
    overview: (count: number, brands: string[]) => count
      ? `Le catalogue contient **${count} référence(s) d'équipement**${brands.length ? ` pour ${brands.join(", ")}` : ""}.`
      : "Aucune référence d'équipement n'est actuellement publiée dans le catalogue.",
    seeAll: "Voir les équipements",
    seeBrand: (brand: string) => `Équipements ${brand}`,
  },
  parts: {
    brand: (brand: string, count: number) => `Le catalogue contient **${count} référence(s) de pièce associée(s) à ${brand}**. Consultez les fiches pour confirmer la compatibilité.`,
    matches: (names: string[]) => `J'ai trouvé dans le catalogue : ${names.map((name) => `**${name}**`).join(", ")}.`,
    overview: (count: number, bike: string) => `Le catalogue contient **${count} référence(s) de pièces détachées**${bike ? ` pour vérifier la compatibilité avec la **${bike}**` : ""}. Précisez le modèle ou ouvrez les pièces pour filtrer les références.`,
    seeParts: "Voir les pièces détachées",
    seeBrand: (brand: string) => `Pièces associées à ${brand}`,
  },
  search: {
    resultTitle: (label: string, count: number, total: number) => `Voici ${label} (${count} sur ${total}) :`,
    brand: (name: string) => `les motos **${name}**`,
    family: (name: string) => `la gamme **${name}**`,
    found: "ce que j'ai trouvé",
    seeCatalog: "Tout le catalogue",
  },
  catalog: {
    overview: (total: number, families: string[]) => total
      ? `Le catalogue contient **${total} véhicule(s)**${families.length ? ` : ${families.join(", ")}` : ""}. Quelle famille vous intéresse ?`
      : "Aucun véhicule n'est actuellement publié dans le catalogue.",
    seeCatalog: "Voir le catalogue",
  },
  fallback: {
    counselor: (name: string) => `Je préfère ne pas vous répondre au hasard${name}. Un conseiller Funbike pourra vous aider précisément via le formulaire de contact.`,
    catalogUnavailable: "Je ne peux pas consulter les données du catalogue GraphQL pour le moment. Réessayez dans quelques instants ou contactez l'équipe Funbike.",
    unclear: "Je n'ai pas bien saisi. Vous pouvez me demander une moto, une pièce, un équipement, les horaires ou un devis.",
  },
} as const;

/** Textes fixes du dialogue de sélection, séparés du scoring et des critères métier. */
export const recommendationCopy = {
  questions: {
    usage: {
      field: "usage",
      text: "Bien sûr 👍 Pour te conseiller correctement, tu comptes principalement l'utiliser pour quoi ?",
      quick: ["Ville / quotidien", "Travail / livraison", "Voyage / long trajet", "Cross / tout-terrain", "Enduro / loisir", "Transport de passagers"],
    },
    terrain: {
      field: "terrain",
      text: "D'accord 👍 Et tu vas principalement rouler sur quel type de terrain ?",
      quick: ["Route / bitume", "Piste / terre", "Mixte des deux"],
    },
    distance: {
      field: "distance",
      text: "Tes trajets sont plutôt courts au quotidien ou tu prévois de faire de longs trajets ?",
      quick: ["Courts trajets quotidiens", "Trajets moyens", "Longs trajets"],
    },
    experience: {
      field: "experience",
      text: "Et concernant ton expérience à moto, tu débutes ou tu as déjà de l'expérience ?",
      quick: ["Débutant", "Intermédiaire", "Expérimenté"],
    },
  },
  noMatch: "Je n'ai pas encore trouvé de modèle qui corresponde exactement à ton besoin. Je peux élargir la recherche avec un usage proche. Dis-moi plutôt : ville, travail, voyage, cross, enduro ou transport ?",
  noMatchQuick: ["Ville / quotidien", "Travail / livraison", "Voyage / long trajet", "Cross / tout-terrain"],
  criteria: {
    usage: {
      ville: "une utilisation principalement en ville",
      travail: "un usage principal pour le travail",
      voyage: "un usage voyage / longs trajets",
      cross: "de la pratique du cross",
      enduro: "de la pratique de l'enduro",
      "tout-terrain": "un usage tout-terrain",
      loisir: "un usage loisir",
      sport: "une recherche de sensations sport",
      transport: "le transport de personnes ou de charges",
      polyvalent: "un usage polyvalent",
    },
    distance: {
      longue: "avec de longs trajets",
      courte: "avec des trajets quotidiens",
      moyenne: "avec des trajets moyens",
    },
    fallback: "tes critères",
    summary: (criteria: string) => `D'après ce que tu m'as dit (${criteria}), voici les modèles qui correspondent à ton besoin :`,
    recommendation: (name: string, pitch: string) => `• ${name}${pitch ? ` — ${pitch}` : ""}.`,
  },
  quick: {
    compare: ["Comparer les deux premières", "Prix de ces modèles", "Réserver un essai"],
    completeUsage: ["Ville / quotidien", "Travail / livraison", "Voyage / long trajet", "Cross / tout-terrain"],
    default: ["Comparer les deux premières", "Prix de ces modèles", "Réserver un essai"],
  },
  seeCatalog: "Tout le catalogue",
} as const;

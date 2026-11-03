/** Textes d’interface de la page d’accueil ; les contenus administrables viennent de GraphQL. */
export const accueil = {
    hero: {
      localisation: "Madagascar / Funbike",
      titreLigne1: "Votre prochaine",
      titreLigne2: "aventure commence ici.",
      description: "Découvrez les motos, pièces et équipements publiés dans le catalogue Funbike.",
      sloganPrefix: "Pensé pour",
      usages: ["le quotidien", "la route", "l'aventure"],
      boutonCatalogue: "Explorer le catalogue",
      aLaUne: "À la une",
      annee: "2026",
      choisirModele: "Choisir le modèle mis en avant",
      afficherModele: "Afficher",
    },
    univers: {
      surTitre: "Choisir son univers",
      titre: "Pas de mauvaise direction.",
    },
    distributeur: {
      surTitre: "Distributeur exclusif / Madagascar",
      titre: "Nos marques officielles.",
      boutonToutVoir: "Tout voir →",
      boutonToutesMotos: "Voir toutes les motos →",
      logoPrefix: "Logo",
    },
    nouveautes: {
      surTitre: "Nouveautés / Arrivages",
      titre: "Frais de l'atelier.",
      description: "Les nouveautés enregistrées dans le catalogue Funbike.",
      tarif: "Tarif",
      boutonCatalogue: "Parcourir le catalogue",
      decouvrirPrefix: "Découvrir",
    },
    motos: {
      numero: "01 / Motos",
      titre: "À chaque terrain, sa machine.",
      description: "Consultez les modèles publiés dans le catalogue Funbike.",
      bouton: "Toutes les motos",
    },
    atelier: {
      surTitre: "Atelier / Essentiels",
      titre: "Prêt pour la suite.",
      description: "Parcourez les pièces et équipements publiés dans le catalogue Funbike.",
      bouton: "Voir tous les équipements",
    },
    partenaires: {
      titre: "Nos partenaires",
      description: "Des marques qui roulent avec nous",
      logoPrefix: "Logo",
    },
  } as const;

/** Textes fixes de l’interface FunBike ; les collections restent dans src/data/. */
export const equipements = {
    titre: "Équipements Pilote",
    description: "Protection, casques, tenues et accessoires pour le pilote.",
    sectionTitre: "Choisir une marque",
    sectionDescription: "Touchez une marque pour afficher sa gamme et les informations utiles.",
    sectionNumero: "01 / Équipements",
    references: "références",
    page: "page",
    categorieToutes: "Tous",
    categoriesTvsAria: "Catégories des équipements TVS",
    marques: {
      tld: {
        titre: "Troy Lee Designs",
        description:
          "Parcourez la collection pilote, puis contactez Funbike pour vérifier les tailles et coloris disponibles.",
      },
      gaerne: {
        titre: "Bottes & chaussures moto Gaerne",
        description: "Sélectionnez votre pratique et votre pointure — l'équipe Funbike confirme la disponibilité.",
      },
      mt: {
        titre: "Casques moto MT Helmets",
        description: "Choisissez un usage, puis contactez Funbike pour les tailles, coloris et tarifs disponibles.",
      },
      tvs: {
        titre: "Équipements TVS",
        description: "Casques, blousons et gants TVS Racing : sélection de références issues du catalogue officiel TVS Motor.",
      },
      bihr: {
        titre: "Équipements & accessoires Bihr",
        description:
          "Casques, tenues, bottes, gants et accessoires pilote Bihr : sélection et disponibilité à confirmer avec l'équipe Funbike.",
        lignes: ["Casques & tenues", "Bottes & gants", "Accessoires pilote"],
      },
    },
  } as const;

export const accessoires = {
    fiche: {
      titreDefaut: "Fiche produit",
      prixEtContact: "Prix et contact",
      retour: "Retour",
      agrandir: "Agrandir",
      voirPhoto: "Voir la photo",
      prixDisponibilite: "Prix & disponibilité",
      demanderDevis: "Demander un devis",
      messageConseiller: "Un conseiller confirme la compatibilité, le stock et les options disponibles.",
      contacterEquipe: "Contacter l'équipe",
      similairesTitre: "Dans le même esprit",
      similairesDescription: "D'autres produits à découvrir.",
      similairesNumero: "À explorer / 02",
      marque: "Marque",
      type: "Type",
      equipementFamily: "Équipement",
      universel: "Universel",
      compatibilite: "Compatibilité",
      categorie: "Catégorie",
      usage: "Usage",
      usagePilote: "Pilote",
      reference: "Référence",
      toutesMotos: "Toutes motos",
      piecePrefix: "Pièce détachée",
      pieceCompatiblePrefix: "Pièce détachée compatible",
      altPhotoVue: (name: string, index: number) => `${name}, vue ${index}`,
      voirPhotoIndex: (index: number) => `Voir la photo ${index}`,
      pieceGeneriqueSuffix: " proposée par Funbike. Compatibilité exacte et disponibilité à confirmer avec le modèle et l'année de votre moto.",
      equipementPrefix: "Équipement pilote",
      equipementSuffix: " proposé par Funbike. Taille, coloris et disponibilité à confirmer avec l'équipe.",
    },
    cartes: {
      voirFiche: "Voir la fiche",
      seRenseigner: "Se renseigner",
      detailsAltPrefix: "Voir les détails de",
      pieceEyebrowPrefix: "Pièce",
      equipmentFallback: "Equipement",
    },
  } as const;

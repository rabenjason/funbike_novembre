/** Existing Sherco motorcycle records, kept in their source order. */
import type { Bike } from "../../types";

export const SHERCO_BIKES: Bike[] = [
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
];

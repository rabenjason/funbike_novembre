/** Existing Fantic motorcycle records, kept in their source order. */
import type { Bike } from "../../types";

export const FANTIC_BIKES: Bike[] = [
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
];

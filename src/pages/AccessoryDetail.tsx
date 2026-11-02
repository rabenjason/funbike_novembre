import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCheck,
  faMagnifyingGlassPlus,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import type { Part } from "../types";
import { partBrandLabel, partFamily } from "../utils/catalogLabels";
import { Section, type Route } from "../components/Layout";
import { PartCard } from "../components/Cards";
import SmartImage from "../components/SmartImage";
import ImageZoomViewer from "../components/ImageZoomViewer";
import { content } from "../constants";
import { usePublicCatalog } from "../contexts/PublicCatalogContext";
import { liveParts } from "../lib/catalogAdapters";

type Props = {
  id?: string;
  go: (p: string, i?: string) => void;
  back: (fallback?: Route) => void;
  canGoBack: boolean;
  backLabel: string;
};

function safeExternalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function autoDesc(part: Part): string {
  if (part.desc) return part.desc;
  const copy = content.accessoires.fiche;
  const brand = partBrandLabel(part);
  if (part.kind === "piece") {
    const compatible = part.universalCompatibility
      ? copy.toutesMotos
      : part.compatibleBrands?.join(", ") ?? part.compatibleBrand;
    const type = part.partType ? ` — ${part.partType.toLowerCase()}` : "";
    const title = compatible
      ? `${copy.pieceCompatiblePrefix} ${compatible}${type}`
      : `${copy.piecePrefix}${type}`;
    return `${title}${copy.pieceGeneriqueSuffix}`;
  }
  const category = part.category ? ` — ${part.category.toLowerCase()}` : "";
  const usages = part.usages?.length ? ` — ${part.usages.join(", ").toLowerCase()}` : "";
  return `${copy.equipementPrefix} ${brand}${category}${usages}${copy.equipementSuffix}`;
}

function autoSpecs(part: Part): { label: string; value: string }[] {
  if (part.specs && part.specs.length) return part.specs.slice(0, 5);
  const copy = content.accessoires.fiche;
  const specs: { label: string; value: string }[] = [{ label: copy.marque, value: partBrandLabel(part) }];
  if (part.kind === "piece") {
    if (part.productType ?? part.partType) specs.push({ label: copy.type, value: part.productType ?? part.partType! });
    const compatible = part.universalCompatibility
      ? copy.toutesMotos
      : part.compatibleBrands?.join(", ") ?? part.compatibleBrand ?? "";
    if (compatible) specs.push({ label: copy.compatibilite, value: compatible });
  } else {
    if (part.productType) specs.push({ label: copy.type, value: part.productType });
    if (part.category) specs.push({ label: copy.categorie, value: part.category });
    if (part.usages?.length) specs.push({ label: copy.usage, value: part.usages.join(", ") });
  }
  if (part.reference) specs.push({ label: copy.reference, value: part.reference });
  for (const spec of part.specs ?? []) {
    if (!specs.some((existing) => existing.label.toLocaleLowerCase("fr") === spec.label.toLocaleLowerCase("fr"))) {
      specs.push(spec);
    }
  }
  return specs;
}

export default function AccessoryDetail({ id, go, back, backLabel }: Props) {
  const { catalog, status } = usePublicCatalog();
  const usingApi = status === "ready" && catalog !== null;
  const products = useMemo(
    () => usingApi ? liveParts(catalog.products) : [],
    [usingApi, catalog],
  );
  const part = products.find((item) => item.id === id);
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const gallery = part ? (part.gallery?.length ? part.gallery : [part.image]) : [];
  const specs = part ? autoSpecs(part) : [];
  const desc = part ? autoDesc(part) : "";
  const eyebrow = part ? `${partBrandLabel(part)} / ${partFamily(part)}`.toUpperCase() : "";

  const related = part ? products.filter((item) => {
    if (item.id === part.id) return false;
    if (item.kind === part.kind) return true;
    if (part.kind === "piece" && item.kind === "piece" &&
      (item.compatibleBrandSlugs?.some((slug) => part.compatibleBrandSlugs?.includes(slug)) || item.universalCompatibility)) return true;
    return false;
  }).slice(0, 4) : [];

  if (status === "loading") {
    return <div className="mx-auto min-h-[55vh] max-w-(--container-site) px-4 py-20 text-center text-sm text-black/50 dark:text-white/50">Chargement du produit…</div>;
  }

  if (!part) {
    return (
      <div className="mx-auto min-h-[55vh] max-w-(--container-site) px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-[#171816] dark:text-[#f2f0ea]">{status === "error" ? "Catalogue indisponible" : "Produit introuvable"}</h1>
        <p className="mt-3 text-sm text-black/55 dark:text-white/55">
          {status === "error"
            ? "Impossible de charger ce produit depuis le catalogue. Réessayez dans quelques instants."
            : "Ce produit n’est plus disponible ou n’existe pas dans le catalogue."}
        </p>
        <button type="button" onClick={() => back()} className="mt-6 min-h-11 border-b border-current text-xs font-bold uppercase tracking-[0.12em] text-black/70 dark:text-white/70">Retour au catalogue</button>
      </div>
    );
  }

  const sourceUrl = safeExternalUrl(part.sourceUrl);

  return (
    <div className="overflow-x-hidden bg-white dark:bg-[#141513]">
      <div className="mx-auto w-full max-w-(--container-site) px-4 pt-4 sm:px-7 sm:pt-6 lg:px-10">
        <button
          type="button"
          onClick={() => back()}
          className="inline-flex min-h-11 max-w-full items-center gap-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-black/50 transition hover:text-[#98741b] sm:tracking-[0.14em] dark:text-white/50 dark:hover:text-[#ffd100]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="shrink-0" />
          <span className="truncate">{content.accessoires.fiche.retour}{backLabel ? ` — ${backLabel}` : ""}</span>
        </button>
      </div>

      <div className="mx-auto grid min-w-0 w-full max-w-(--container-site) gap-7 px-4 pb-8 pt-3 sm:px-7 sm:py-8 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-10">
        <div className="min-w-0 lg:col-span-7">
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label={`${content.accessoires.fiche.agrandir} ${part.name}`}
            className="glass-panel product-media-stage group relative block aspect-[4/3] w-full min-w-0 cursor-zoom-in overflow-hidden p-2 text-left sm:aspect-[16/10]"
          >
            <SmartImage
              src={gallery[active]}
              alt={part.name}
              eager
              className="h-full w-full"
              imgClassName="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.025] sm:p-5"
            />
            <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate border border-white/60 bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#171816] shadow-sm backdrop-blur-xl sm:bottom-5 sm:left-5 sm:tracking-[0.14em]">
              {partBrandLabel(part)} / {partFamily(part)}
            </span>
            <span className="absolute right-3 top-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#171816] shadow-sm backdrop-blur transition group-hover:bg-white dark:border-white/10 dark:bg-black/55 dark:text-white dark:group-hover:bg-black/75">
              <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              <span className="hidden sm:inline">{content.accessoires.fiche.agrandir}</span>
            </span>
          </button>
          {gallery.length > 1 && (
            <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setActive(index)}
                  aria-label={content.accessoires.fiche.voirPhotoIndex(index + 1)}
                  aria-pressed={active === index}
                  className={
                    "shrink-0 snap-start border-b-2 bg-white p-1 transition " +
                    (active === index ? "border-[#ffd100] opacity-100" : "border-transparent opacity-60 hover:opacity-100")
                  }
                >
                  <SmartImage
                    src={image}
                    alt={content.accessoires.fiche.altPhotoVue(part.name, index + 1)}
                    className="h-14 w-[5.25rem] sm:h-16 sm:w-24"
                    imgClassName="object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="min-w-0 lg:col-span-5 lg:py-4"
        >
          <p className="fluid-eyebrow break-words font-bold uppercase leading-relaxed text-[#98741b] dark:text-[#ffd100]">
            {eyebrow}
          </p>
          <h1 className="fluid-h1 mt-2.5 break-words font-display font-semibold text-[#171816] [overflow-wrap:anywhere] dark:text-[#f2f0ea] sm:mt-3">
            {part.name}
          </h1>
          <p className="fluid-body mt-3.5 max-w-xl text-pretty text-black/60 dark:text-white/60 sm:mt-4">{desc}</p>

          <dl className="mt-6 min-w-0 border-t border-black/15 dark:border-white/15 sm:mt-7">
            {specs.map((spec, index) => (
              <div
                key={spec.label}
                className="grid min-w-0 grid-cols-[1.75rem_minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-1.5 border-b border-black/15 py-3 dark:border-white/15 sm:grid-cols-[2.2rem_1fr_1.2fr] sm:gap-2"
              >
                <span className="font-display text-[10px] text-black/35 dark:text-white/35">0{index + 1}</span>
                <dt className="min-w-0 break-words text-[9px] font-bold uppercase leading-4 tracking-[0.07em] text-black/50 dark:text-white/50 sm:text-[10px] sm:tracking-[0.1em]">
                  {spec.label}
                </dt>
                <dd className="min-w-0 break-words text-right text-[11px] font-semibold leading-4 text-[#171816] dark:text-[#f2f0ea] sm:text-xs">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center border-b border-black/25 text-[10px] font-bold uppercase tracking-[0.12em] text-black/55 transition hover:border-[#98741b] hover:text-[#98741b] dark:border-white/25 dark:text-white/55 dark:hover:border-[#ffd100] dark:hover:text-[#ffd100]">
              Voir la fiche du fabricant ↗
            </a>
          )}

          <section className="mt-6 min-w-0 border-y border-black/15 dark:border-white/15 sm:mt-8" aria-label={content.accessoires.fiche.prixEtContact}>
            <div className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                  {content.accessoires.fiche.prixDisponibilite}
                </p>
                <p className="mt-1 font-display text-[clamp(1.25rem,1.1rem+0.6vw,1.65rem)] font-semibold leading-none text-[#171816] dark:text-[#f2f0ea]">
                  {part.price}
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go("contact", part.id)}
                className="fluid-btn inline-flex min-h-12 w-full min-w-0 items-center justify-between gap-4 bg-[#ffd100] px-4 py-3 text-left font-bold uppercase text-[#171816] transition hover:bg-[#ffe36b] lg:min-w-[210px] lg:w-auto lg:px-5 sm:px-4"
              >
                {content.accessoires.fiche.demanderDevis}
                <FontAwesomeIcon icon={faArrowRight} className="shrink-0" />
              </motion.button>
            </div>

            <div className="flex min-w-0 flex-col gap-3 border-t border-black/[0.07] py-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
              <p className="flex min-w-0 items-start gap-2 text-[11px] leading-5 text-black/50 dark:text-white/50">
                <FontAwesomeIcon icon={faCheck} className="mt-1 shrink-0 text-[#98741b] dark:text-[#ffd100]" />
                <span>{content.accessoires.fiche.messageConseiller}</span>
              </p>

              <button
                type="button"
                onClick={() => go("contact", part.id)}
                className="inline-flex min-h-10 max-w-full shrink-0 items-center gap-2 self-start border-b border-black/25 text-[10px] font-bold uppercase tracking-[0.08em] text-black/60 transition hover:border-[#98741b] hover:text-[#98741b] dark:border-white/25 dark:text-white/60 dark:hover:border-[#ffd100] dark:hover:text-[#ffd100] sm:self-auto sm:tracking-[0.1em]"
              >
                <FontAwesomeIcon icon={faPhone} />
                {content.accessoires.fiche.contacterEquipe}
              </button>
            </div>
          </section>
        </motion.div>
      </div>

      {related.length > 0 && (
        <Section title={content.accessoires.fiche.similairesTitre} subtitle={content.accessoires.fiche.similairesDescription} number={content.accessoires.fiche.similairesNumero}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {related.map((item) => (
              <PartCard key={item.id} part={item} go={go} onEnquire={() => go("contact", item.id)} />
            ))}
          </div>
        </Section>
      )}

      <ImageZoomViewer
        open={viewerOpen}
        images={gallery}
        active={active}
        alt={part.name}
        onActiveChange={setActive}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

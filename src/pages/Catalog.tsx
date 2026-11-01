import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGears, faMagnifyingGlass, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  ACCESSORY_BRANDS,
  BIKES,
  BRANDS,
  SPARE_PARTS,
  GEAR_ITEMS,
  TVS_ACCESSORIES,
  TLD,
  GAERNE,
  MT_HELMETS,
  type AccessoryCategory,
  type Part,
} from "../data";
import { PageHeader, Section } from "../components/Layout";
import { BikeCard, PartCard } from "../components/Cards";
import { BikeCardSkeleton, PartCardSkeleton } from "../components/Skeletons";
import Pagination from "../components/Pagination";
import { content } from "../constants";
import { useBriefLoading } from "../hooks/useBriefLoading";
import {
  AccessoryBrandSelector,
  BrandVisual,
  type AccessoryBrandKey,
} from "../components/AccessoryBrands";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const FAMILIES = content.catalogue.filtres;
const BIKES_PER_PAGE = 6;
const PARTS_PER_PAGE = 8;

/** Équipements pilote, par marque. */
const GEAR_BY_BRAND: Record<AccessoryBrandKey, Part[]> = {
  tld: TLD,
  gaerne: GAERNE,
  mt: MT_HELMETS,
  tvs: TVS_ACCESSORIES,
  bihr: [],
};

const TVS_CATEGORIES: (typeof content.equipements.categorieToutes | AccessoryCategory)[] = [
  content.equipements.categorieToutes,
  ...Array.from(
    new Set(
      TVS_ACCESSORIES.map((item) => item.category).filter((category): category is AccessoryCategory => Boolean(category)),
    ),
  ),
];

/** Marques de pièces détachées (sélecteur visuel, mêmes proportions qu'Équipements). */
const SPARE_BRANDS = content.piecesDetachees.marquesFiltres;
type SpareBrand = (typeof SPARE_BRANDS)[number];

const SPARE_BRAND_TABS: { key: SpareBrand; name: string; logo?: string; icon?: IconDefinition }[] = [
  { key: SPARE_BRANDS[0], name: SPARE_BRANDS[0], icon: faGears },
  ...SPARE_BRANDS.slice(1).map((name) => ({
    key: name as SpareBrand,
    name,
    logo: BRANDS.find((brand) => brand.name === name)?.src ?? "",
  })),
];

const SPARE_TYPES = content.piecesDetachees.typesFiltres;
type SpareType = (typeof SPARE_TYPES)[number];

const ALL_ITEMS = [...SPARE_PARTS, ...GEAR_ITEMS];

const normalizeSearch = (value: string) =>
  value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const containsAll = (text: string, terms: string[]) => {
  const normalized = normalizeSearch(text);
  return terms.every((term) => normalized.includes(term));
};

const itemLabel = (part: Part) =>
  [
    part.name,
    part.kind === "piece" ? content.navigation.piecesDetachees : (ACCESSORY_BRANDS.find((b) => b.key === part.kind)?.name ?? part.kind),
    part.category ?? "",
    part.compatibleBrand ?? "",
    part.partType ?? "",
  ].join(" ");

function scrollToRef(ref: React.RefObject<HTMLDivElement | null>) {
  const el = ref.current;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  Panneau « marque partenaire » (produits sur demande)               */
/* ------------------------------------------------------------------ */

function BrandInfoPanel({
  logo,
  alt,
  title,
  text,
  lines,
  go,
}: {
  logo: string;
  alt: string;
  title: string;
  text: string;
  lines: readonly string[];
  go: (page: string, id?: string) => void;
}) {
  return (
    <div className="grid gap-6 rounded-2xl border border-black/10 p-6 sm:p-8 md:grid-cols-[0.6fr_1.4fr] md:gap-12 dark:border-white/10">
      <div className="flex min-h-32 items-center justify-center">
        <img src={logo} alt={alt} className="partner-logo h-16 max-w-[200px] object-contain" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#98741b] dark:text-[#ffd100]">{content.piecesDetachees.panneauMarque.surTitre}</p>
        <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#171816] dark:text-[#f2f0ea]">{title}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55 dark:text-white/55">{text}</p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {lines.map((line) => (
            <span key={line} className="inline-flex items-center gap-2 text-xs font-semibold text-black/65 dark:text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffd100]" />
              {line}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <button
            onClick={() => go("contact")}
            className="bg-[#ffd100] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#171816] transition hover:bg-[#ffe36b]"
          >
            {content.piecesDetachees.panneauMarque.demanderDisponibilites}
          </button>
          <span className="text-xs text-black/45 dark:text-white/45">{content.piecesDetachees.panneauMarque.note}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tout le catalogue (aperçus)                                        */
/* ------------------------------------------------------------------ */

export function Catalogue({
  go,
  motosOnly = false,
  initialQuery,
}: {
  go: (p: string, id?: string) => void;
  motosOnly?: boolean;
  initialQuery?: string;
}) {
  const [family, setFamily] = useState<string>(FAMILIES[0]);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const terms = useMemo(() => normalizeSearch(query).trim().split(/\s+/).filter(Boolean), [query]);
  const bikeList = useMemo(
    () =>
      BIKES.filter(
        (b) =>
          (family === FAMILIES[0] || b.family === family) && containsAll(`${b.name} ${b.brand} ${b.desc} ${b.family}`, terms),
      ),
    [family, terms],
  );
  const partList = useMemo(
    () => (terms.length === 0 || motosOnly ? [] : ALL_ITEMS.filter((p) => containsAll(itemLabel(p), terms))),
    [terms, motosOnly],
  );

  const totalPages = Math.max(1, Math.ceil(bikeList.length / BIKES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = bikeList.slice((safePage - 1) * BIKES_PER_PAGE, safePage * BIKES_PER_PAGE);
  const loading = useBriefLoading(`${family}-${safePage}`);

  function changePage(next: number) {
    setPage(next);
    scrollToRef(gridRef);
  }

  return (
    <div>
      <PageHeader
        title={motosOnly ? content.catalogue.titreMotos : content.catalogue.titreComplet}
        subtitle={motosOnly ? content.catalogue.descriptionMotos : content.catalogue.descriptionComplete}
      />

      <Section
        title={content.catalogue.vehicules}
        subtitle={`${bikeList.length} ${content.catalogue.modelesDisponibles} · ${content.catalogue.pageSur} ${safePage} ${content.catalogue.sur} ${totalPages}`}
        number={content.catalogue.numeroMotos}
      >
        <div
          ref={gridRef}
          className="mb-7 flex flex-col gap-4 border-b border-black/15 pb-4 dark:border-white/15 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {FAMILIES.map((x) => (
              <button
                key={x}
                onClick={() => {
                  setFamily(x);
                  setPage(1);
                }}
                aria-pressed={family === x}
                className={
                  "relative py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition " +
                  (family === x ? "text-[#171816] dark:text-white" : "text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white")
                }
              >
                {x}
                {family === x && <motion.span layoutId="family-filter" className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-[#ffd100]" />}
              </button>
            ))}
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 border-b border-black/20 pb-2 text-black/40 focus-within:border-[#a27b17] dark:border-white/20 dark:focus-within:border-[#ffd100] lg:max-w-sm">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={motosOnly ? content.catalogue.rechercheMotosPlaceholder : content.catalogue.rechercheGlobalePlaceholder}
              aria-label={content.catalogue.rechercheAria}
              className="min-w-0 flex-1 bg-transparent text-xs text-[#171816] outline-none placeholder:text-black/40 dark:text-[#f2f0ea] dark:placeholder:text-white/40"
            />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {loading
            ? Array.from({ length: Math.max(visible.length, 3) }, (_, i) => <BikeCardSkeleton key={i} />)
            : visible.map((b) => <BikeCard key={b.id} bike={b} go={go} />)}
        </div>
        {!loading && bikeList.length === 0 && (
          <p className="py-12 text-center text-sm text-black/50 dark:text-white/50">
            {partList.length > 0 ? content.messages.aucunModeleRecherche : content.messages.aucunResultatRecherche}
          </p>
        )}

        <Pagination id={motosOnly ? "motos" : "catalogue"} page={safePage} total={totalPages} onChange={changePage} />
      </Section>

      {!motosOnly && (
        <>
          {partList.length > 0 && (
            <Section title={content.catalogue.resultatsRecherche} subtitle={`${partList.length} ${content.catalogue.produitsTrouves}.`} number={content.catalogue.numeroResultats}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                {partList.map((p) => (
                  <PartCard key={p.id} part={p} go={go} onEnquire={p.kind === "piece" || p.kind === "tvs" ? () => go("contact", p.id) : undefined} />
                ))}
              </div>
            </Section>
          )}
          {!terms.length && (
            <Section title={content.catalogue.piecesApercu.titre} subtitle={content.catalogue.piecesApercu.description} number={content.catalogue.piecesApercu.numero}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {SPARE_PARTS.slice(0, 5).map((p) => (
                  <PartCard key={p.id} part={p} go={go} onEnquire={() => go("contact", p.id)} />
                ))}
              </div>
              <button
                onClick={() => go("spares")}
                className="mt-8 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
              >
                {content.catalogue.piecesApercu.bouton}
              </button>
            </Section>
          )}
          {!terms.length && (
            <Section title={content.catalogue.equipementsApercu.titre} subtitle={content.catalogue.equipementsApercu.description} number={content.catalogue.equipementsApercu.numero}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {[TVS_ACCESSORIES[0], TVS_ACCESSORIES[2], ...TLD.slice(0, 3)].map((p) => (
                  <PartCard key={p.id} part={p} go={go} onEnquire={p.kind === "tvs" ? () => go("contact", p.id) : undefined} />
                ))}
              </div>
              <button
                onClick={() => go("equipements", "tvs")}
                className="mt-8 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
              >
                {content.catalogue.equipementsApercu.bouton}
              </button>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page ÉQUIPEMENTS                                                   */
/* ------------------------------------------------------------------ */

export function Equipements({ go, initialBrand }: { go: (p: string, id?: string) => void; initialBrand?: string }) {
  const validBrand = ACCESSORY_BRANDS.some((brand) => brand.key === initialBrand);
  const [tab, setTab] = useState<AccessoryBrandKey>(validBrand ? (initialBrand as AccessoryBrandKey) : "tld");
  const [category, setCategory] = useState<typeof content.equipements.categorieToutes | AccessoryCategory>(content.equipements.categorieToutes);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const allItems = GEAR_BY_BRAND[tab];
  const items =
    tab === "tvs" && category !== content.equipements.categorieToutes ? allItems.filter((item) => item.category === category) : allItems;
  const totalPages = Math.max(1, Math.ceil(items.length / PARTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = items.slice((safePage - 1) * PARTS_PER_PAGE, safePage * PARTS_PER_PAGE);
  const loading = useBriefLoading(`gear-${tab}-${category}-${safePage}`);

  const heading = content.equipements.marques[tab];
  const isBihr = tab === "bihr";

  return (
    <div>
      <PageHeader
        title={content.equipements.titre}
        subtitle={content.equipements.description}
      />
      <Section
        title={content.equipements.sectionTitre}
        subtitle={content.equipements.sectionDescription}
        number={content.equipements.sectionNumero}
      >
        <div ref={gridRef}>
          <AccessoryBrandSelector
            active={tab}
            brands={ACCESSORY_BRANDS}
            onSelect={(key) => {
              setTab(key);
              setCategory(content.equipements.categorieToutes);
              setPage(1);
            }}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            aria-live="polite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="mt-8"
          >
            {isBihr ? (
              <BrandInfoPanel
                logo={ACCESSORY_BRANDS.find((b) => b.key === "bihr")!.logo!}
                alt={ACCESSORY_BRANDS.find((brand) => brand.key === "bihr")!.alt}
                title={content.equipements.marques.bihr.titre}
                text={content.equipements.marques.bihr.description}
                lines={content.equipements.marques.bihr.lignes}
                go={go}
              />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[#171816] dark:text-[#f2f0ea]">{heading.titre}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-black/55 dark:text-white/55">{heading.description}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
                    {items.length} {content.piecesDetachees.references} · {content.piecesDetachees.page} {safePage}/{totalPages}
                  </span>
                </div>

                {tab === "tvs" && (
                  <div role="tablist" aria-label={content.equipements.categoriesTvsAria} className="no-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-black/15 dark:border-white/15">
                    {TVS_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={category === cat}
                        onClick={() => {
                          setCategory(cat);
                          setPage(1);
                        }}
                        className={
                          "relative min-h-11 shrink-0 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors " +
                          (category === cat ? "text-[#171816] dark:text-white" : "text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white")
                        }
                      >
                        {cat}
                        {category === cat && <motion.span layoutId="tvs-category-active" className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ffd100]" />}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                  {loading
                    ? Array.from({ length: visible.length }, (_, i) => <PartCardSkeleton key={i} />)
                    : visible.map((part) => (
                        <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />
                      ))}
                </div>

                {tab === "tvs" && (
                  <p className="mt-4 text-xs leading-5 text-black/50 dark:text-white/50">
                    {content.equipements.noteTvs}
                  </p>
                )}

                <Pagination
                  id={`equipements-${tab}`}
                  page={safePage}
                  total={totalPages}
                  onChange={(next) => {
                    setPage(next);
                    scrollToRef(gridRef);
                  }}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page PIÈCES DÉTACHÉES                                               */
/* ------------------------------------------------------------------ */

const SPARE_ROUTE_MAP: Record<string, SpareBrand> = {
  "spare-tvs": "TVS",
  "spare-sherco": "Sherco",
  "spare-fantic": "Fantic",
  "spare-bihr": "BIHR",
};

function SpareBrandSelector({ active, onSelect }: { active: SpareBrand; onSelect: (brand: SpareBrand) => void }) {
  return (
    <div className="no-scrollbar flex overflow-x-auto border-b border-black/15 dark:border-white/15">
      {SPARE_BRAND_TABS.map((brand) => {
        const selected = active === brand.key;
        const visual = { logo: brand.logo, icon: brand.icon };
        return (
          <button
            key={brand.key}
            type="button"
            aria-pressed={selected}
            aria-controls={content.piecesDetachees.produitsAria}
            onClick={(event) => {
              onSelect(brand.key);
              event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }}
            className={
              "relative flex min-w-max items-center gap-2.5 px-3 py-3 text-left transition sm:px-5 " +
              (selected ? "bg-[#ffd100]/15" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]")
            }
          >
            <BrandVisual brand={visual} />
            <span
              className={
                "block truncate text-xs font-bold " +
                (selected ? "text-[#171816] dark:text-[#f2f0ea]" : "text-black/50 dark:text-white/50")
              }
            >
              {brand.name}
            </span>
            {selected && (
              <>
                <motion.span
                  aria-hidden="true"
                  layoutId="spare-brand-border"
                  className="pointer-events-none absolute inset-0 border border-[#ffd100]"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
                <motion.span
                  aria-hidden="true"
                  layoutId="spare-brand-active"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[#ffd100]"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Spares({ go, initialBrand }: { go: (p: string, id?: string) => void; initialBrand?: string }) {
  const requested = initialBrand ? (SPARE_ROUTE_MAP[initialBrand] ?? SPARE_BRANDS[0]) : SPARE_BRANDS[0];
  const [brand, setBrand] = useState<SpareBrand>(requested);
  const [type, setType] = useState<SpareType>(SPARE_TYPES[0]);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      SPARE_PARTS.filter(
        (part) =>
          (brand === SPARE_BRANDS[0] || brand === "BIHR" || part.compatibleBrand === brand) &&
          (type === SPARE_TYPES[0] || part.partType === type),
      ),
    [brand, type],
  );

  const totalPages = Math.max(1, Math.ceil(items.length / PARTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = items.slice((safePage - 1) * PARTS_PER_PAGE, safePage * PARTS_PER_PAGE);
  const loading = useBriefLoading(`spares-${brand}-${type}-${safePage}`);

  const isBihr = brand === "BIHR";
  const title = brand === SPARE_BRANDS[0] ? content.piecesDetachees.titreToutes : `${content.piecesDetachees.titreMarquePrefix} ${brand}`;
  const text =
    brand === SPARE_BRANDS[0]
      ? content.piecesDetachees.descriptionToutes
      : `${content.piecesDetachees.descriptionMarquePrefix} ${brand}${content.piecesDetachees.descriptionMarqueSuffix}`;

  return (
    <div>
      <PageHeader
        title={content.piecesDetachees.titre}
        subtitle={content.piecesDetachees.description}
      />
      <Section
        title={content.piecesDetachees.sectionTitre}
        subtitle={content.piecesDetachees.sectionDescription}
        number={content.piecesDetachees.sectionNumero}
      >
        <div ref={gridRef}>
          <SpareBrandSelector
            active={brand}
            onSelect={(next) => {
              setBrand(next);
              setPage(1);
            }}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={brand}
            aria-live="polite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="mt-8"
          >
            {isBihr ? (
              <BrandInfoPanel
                logo={BRANDS.find((b) => b.name === "Bihr")!.src}
                alt={ACCESSORY_BRANDS.find((brand) => brand.key === "bihr")!.alt}
                title={content.piecesDetachees.bihr.titre}
                text={content.piecesDetachees.bihr.description}
                lines={content.piecesDetachees.bihr.lignes}
                go={go}
              />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[#171816] dark:text-[#f2f0ea]">{title}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-black/55 dark:text-white/55">{text}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
                    {items.length} {content.piecesDetachees.references} · {content.piecesDetachees.page} {safePage}/{totalPages}
                  </span>
                </div>

                {/* Filtre TYPE */}
                <div role="tablist" aria-label={content.piecesDetachees.typeAria} className="no-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-black/15 dark:border-white/15">
                  {SPARE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={type === t}
                      onClick={() => {
                        setType(t);
                        setPage(1);
                      }}
                      className={
                        "relative min-h-11 shrink-0 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors " +
                        (type === t ? "text-[#171816] dark:text-white" : "text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white")
                      }
                    >
                      {t}
                      {type === t && <motion.span layoutId="spare-type-active" className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ffd100]" />}
                    </button>
                  ))}
                </div>

                <div id={content.piecesDetachees.produitsAria} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                  {loading
                    ? Array.from({ length: visible.length }, (_, i) => <PartCardSkeleton key={i} />)
                    : visible.map((part) => (
                        <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />
                      ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-black/50 dark:text-white/50">
                  {content.piecesDetachees.noteSimulee}
                </p>

                <Pagination
                  id={`spares-${brand}-${type}`}
                  page={safePage}
                  total={totalPages}
                  onChange={(next) => {
                    setPage(next);
                    scrollToRef(gridRef);
                  }}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Section>
    </div>
  );
}

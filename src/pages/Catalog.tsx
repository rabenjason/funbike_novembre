import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGears, faMagnifyingGlass, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { Bike, Brand, Part } from "../types";
import { getBrandLabel, getBrandSection } from "../data/brands";
import { usePublicCatalog } from "../contexts/PublicCatalogContext";
import { liveBikes, liveParts, toBrand } from "../lib/catalogAdapters";
import type { PublicBrand } from "../lib/graphqlClient";
import { PageHeader, Section } from "../components/Layout";
import { BikeCard, PartCard } from "../components/Cards";
import { BikeCardSkeleton, PartCardSkeleton } from "../components/Skeletons";
import Pagination from "../components/Pagination";
import { content } from "../constants";
import { useBriefLoading } from "../hooks/useBriefLoading";
import { AccessoryBrandSelector, BrandVisual } from "../components/AccessoryBrands";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const FAMILIES = content.catalogue.filtres;
const BIKES_PER_PAGE = 6;
const PARTS_PER_PAGE = 8;
const SPARE_ALL_BRAND_ID = "all";

type SpareBrandTab = { key: string; name: string; logo?: string; icon?: IconDefinition; routeId?: string };

const SPARE_TYPE_ALL = content.piecesDetachees.typesFiltres[0];
type SpareType = string;

const normalizeSearch = (value: string) =>
  value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const containsAll = (text: string, terms: string[]) => {
  const normalized = normalizeSearch(text);
  return terms.every((term) => normalized.includes(term));
};

const bikeSearchText = (bike: Bike) =>
  `${bike.name} ${bike.brand} ${bike.desc} ${bike.family} ${bike.recommendation ?? ""}`;

const itemLabel = (part: Part) =>
  [
    part.name,
    part.brandName ?? part.kind,
    part.category ?? "",
    part.compatibleBrands?.join(" ") ?? part.compatibleBrand ?? "",
    part.productType ?? part.partType ?? "",
    part.usages?.join(" ") ?? "",
    part.reference ?? "",
  ].join(" ");

function scrollToRef(ref: React.RefObject<HTMLDivElement | null>) {
  const el = ref.current;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: "smooth" });
}

function brandsForProducts(brands: PublicBrand[], productSlugs: Set<string>, section: string): Brand[] {
  return brands
    .filter((brand) => brand.isActive && (
      productSlugs.has(brand.slug) || brand.sections?.some((association) => association.section === section)
    ))
    .sort((left, right) => {
      const leftAssociation = left.sections?.find((association) => association.section === section);
      const rightAssociation = right.sections?.find((association) => association.section === section);
      return (leftAssociation?.order ?? left.sortOrder ?? 0) - (rightAssociation?.order ?? right.sortOrder ?? 0);
    })
    .map(toBrand);
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
  const { catalog, status } = usePublicCatalog();
  const usingApi = status === "ready" && catalog !== null;
  const bikes = useMemo(
    () => usingApi ? liveBikes(catalog.products) : [],
    [usingApi, catalog],
  );
  const parts = useMemo(
    () => usingApi ? liveParts(catalog.products) : [],
    [usingApi, catalog],
  );
  const familyFilters: readonly string[] = usingApi
    ? [FAMILIES[0], ...catalog.families.map((item) => item.name)]
    : [FAMILIES[0]];
  const [family, setFamily] = useState<string>(FAMILIES[0]);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!familyFilters.includes(family)) setFamily(FAMILIES[0]);
  }, [familyFilters.join("|")]);

  const terms = useMemo(() => normalizeSearch(query).trim().split(/\s+/).filter(Boolean), [query]);
  const bikeList = useMemo(
    () => bikes.filter((bike) =>
      (family === FAMILIES[0] || bike.family === family) && containsAll(bikeSearchText(bike), terms),
    ),
    [bikes, family, terms],
  );
  const partList = useMemo(
    () => (terms.length === 0 || motosOnly ? [] : parts.filter((part) => containsAll(itemLabel(part), terms))),
    [parts, terms, motosOnly],
  );

  const sparePreview = parts.filter((part) => part.kind === "piece").slice(0, 5);
  const gearPreview = parts.filter((part) => part.kind !== "piece").slice(0, 5);
  const gearBrand = gearPreview[0]?.kind ?? "tvs";
  const totalPages = Math.max(1, Math.ceil(bikeList.length / BIKES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = bikeList.slice((safePage - 1) * BIKES_PER_PAGE, safePage * BIKES_PER_PAGE);
  const briefLoading = useBriefLoading(`${family}-${safePage}`);
  const loading = status === "loading" || briefLoading;

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
            {familyFilters.map((x) => (
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
            {status === "error"
              ? "Le catalogue est momentanément indisponible."
              : partList.length > 0 ? content.messages.aucunModeleRecherche : content.messages.aucunResultatRecherche}
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
                  <PartCard key={p.id} part={p} go={go} onEnquire={() => go("contact", p.id)} />
                ))}
              </div>
            </Section>
          )}
          {!terms.length && sparePreview.length > 0 && (
            <Section title={content.catalogue.piecesApercu.titre} subtitle={content.catalogue.piecesApercu.description} number={content.catalogue.piecesApercu.numero}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {sparePreview.map((part) => <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />)}
              </div>
              <button
                onClick={() => go("spares")}
                className="mt-8 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
              >
                {content.catalogue.piecesApercu.bouton}
              </button>
            </Section>
          )}
          {!terms.length && gearPreview.length > 0 && (
            <Section title={content.catalogue.equipementsApercu.titre} subtitle={content.catalogue.equipementsApercu.description} number={content.catalogue.equipementsApercu.numero}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {gearPreview.map((part) => <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />)}
              </div>
              <button
                onClick={() => go("equipements", gearBrand)}
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
  const { catalog, status } = usePublicCatalog();
  const usingApi = status === "ready" && catalog !== null;
  const allEquipmentItems = useMemo(
    () => usingApi
      ? liveParts(catalog.products).filter((part) => part.kind !== "piece")
      : [],
    [usingApi, catalog],
  );
  const equipmentSlugs = new Set(allEquipmentItems.map((part) => part.kind));
  const unbrandedEquipment = allEquipmentItems.filter((part) => !part.brandName);
  const brands = usingApi
    ? [
        ...brandsForProducts(catalog.brands, equipmentSlugs, "equipements"),
        ...(unbrandedEquipment.length > 0 ? [{ id: "unbranded", name: "Autres articles", logo: "", logoAlt: "", isActive: true, sections: [] }] : []),
      ]
    : [];
  const [tab, setTab] = useState(initialBrand ?? "");
  const [category, setCategory] = useState<string>(content.equipements.categorieToutes);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialBrand && brands.some((brand) => brand.id === initialBrand)) {
      if (tab !== initialBrand) setTab(initialBrand);
    } else if (!brands.some((brand) => brand.id === tab)) {
      setTab(brands[0]?.id ?? "");
    }
  }, [initialBrand, brands.map((brand) => brand.id).join("|"), tab]);

  const selectedBrand = brands.find((brand) => brand.id === tab);
  const selectedBrandSection = selectedBrand ? getBrandSection(selectedBrand, "equipements") : undefined;
  const allItems = tab === "unbranded"
    ? unbrandedEquipment
    : allEquipmentItems.filter((item) => item.kind === tab);
  const availableCategories = Array.from(new Set(allItems.map((item) => item.category).filter((value): value is string => Boolean(value))));
  const visibleCategoryTabs = [content.equipements.categorieToutes, ...availableCategories];
  useEffect(() => {
    if (!visibleCategoryTabs.includes(category)) setCategory(content.equipements.categorieToutes);
  }, [tab, visibleCategoryTabs.join("|"), category]);
  const terms = useMemo(() => normalizeSearch(query).trim().split(/\s+/).filter(Boolean), [query]);
  const filteredItems = allItems.filter((item) =>
    (category === content.equipements.categorieToutes || item.category === category) && containsAll(itemLabel(item), terms),
  );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PARTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filteredItems.slice((safePage - 1) * PARTS_PER_PAGE, safePage * PARTS_PER_PAGE);
  const briefLoading = useBriefLoading(`gear-${tab}-${category}-${query}-${safePage}`);
  const loading = status === "loading" || briefLoading;

  const localHeading = content.equipements.marques[tab as keyof typeof content.equipements.marques];
  const heading = {
    titre: selectedBrand?.name ?? localHeading?.titre ?? content.equipements.titre,
    description: selectedBrand?.description ?? localHeading?.description ?? content.equipements.description,
  };
  const headingLines = localHeading && "lignes" in localHeading ? localHeading.lignes : [];
  const isPartnerInfo = selectedBrandSection?.displayMode === "partner-info" && allItems.length === 0;

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
            brands={brands}
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
            {isPartnerInfo ? (
              <BrandInfoPanel
                logo={selectedBrand?.logo ?? ""}
                alt={selectedBrand?.logoAlt ?? ""}
                title={heading.titre}
                text={heading.description}
                lines={headingLines}
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
                    {filteredItems.length} {content.piecesDetachees.references} · {content.piecesDetachees.page} {safePage}/{totalPages}
                  </span>
                </div>

                {visibleCategoryTabs.length > 1 && (
                  <div role="tablist" aria-label={content.equipements.categoriesTvsAria} className="no-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-black/15 dark:border-white/15">
                    {visibleCategoryTabs.map((cat) => (
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

                <label className="mb-5 flex min-h-11 w-full max-w-lg items-center gap-2 border-b border-black/20 pb-2 text-black/40 focus-within:border-[#a27b17] dark:border-white/20 dark:focus-within:border-[#ffd100]">
                  <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" className="text-[12px]" />
                  <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Rechercher un équipement ou une catégorie…" aria-label="Rechercher dans les équipements" className="w-full bg-transparent text-sm text-[#171816] outline-none placeholder:text-black/40 dark:text-white dark:placeholder:text-white/40" />
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                  {loading
                    ? Array.from({ length: Math.max(visible.length, 4) }, (_, i) => <PartCardSkeleton key={i} />)
                    : visible.map((part) => (
                        <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />
                      ))}
                </div>
                {!loading && filteredItems.length === 0 && (
                  <p className="py-10 text-center text-sm text-black/50 dark:text-white/50">
                    {status === "error" ? "Le catalogue est momentanément indisponible." : "Aucun équipement publié dans cette sélection."}
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

function SpareBrandSelector({ active, brands, onSelect }: { active: string; brands: SpareBrandTab[]; onSelect: (brandId: string) => void }) {
  return (
    <div className="no-scrollbar flex overflow-x-auto border-b border-black/15 dark:border-white/15">
      {brands.map((brand) => {
        const selected = active === brand.key;
        const visual = { logo: brand.logo, icon: brand.icon, name: brand.name };
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
  const { catalog, status } = usePublicCatalog();
  const usingApi = status === "ready" && catalog !== null;
  const spareItems = useMemo(
    () => usingApi
      ? liveParts(catalog.products).filter((part) => part.kind === "piece")
      : [],
    [usingApi, catalog],
  );
  const compatibleSlugs = new Set(spareItems.flatMap((part) => part.compatibleBrandSlugs ?? []));
  const spareBrands = usingApi
    ? brandsForProducts(catalog.brands, compatibleSlugs, "pieces-detachees").filter((brand) => {
        const association = getBrandSection(brand, "pieces-detachees");
        return compatibleSlugs.has(brand.id) || association?.filterable !== false;
      })
    : [];
  const brandTabs: SpareBrandTab[] = [
    { key: SPARE_ALL_BRAND_ID, name: content.piecesDetachees.marqueToutes, icon: faGears },
    ...spareBrands.map((item) => ({
      key: item.id,
      name: getBrandLabel(item, "pieces-detachees"),
      logo: item.logo,
      routeId: getBrandSection(item, "pieces-detachees")?.routeId,
    })),
  ];
  const [brand, setBrand] = useState<string>(initialBrand ?? SPARE_ALL_BRAND_ID);
  const [type, setType] = useState<SpareType>(SPARE_TYPE_ALL);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requested = brandTabs.find((item) => item.routeId === initialBrand || item.key === initialBrand)?.key;
    if (requested) {
      if (brand !== requested) setBrand(requested);
    } else if (!brandTabs.some((item) => item.key === brand)) {
      setBrand(SPARE_ALL_BRAND_ID);
    }
  }, [initialBrand, brandTabs.map((item) => item.key).join("|"), brand]);

  const selectedBrand = spareBrands.find((item) => item.id === brand);
  const selectedBrandSection = selectedBrand ? getBrandSection(selectedBrand, "pieces-detachees") : undefined;
  const brandLabel = selectedBrand ? getBrandLabel(selectedBrand, "pieces-detachees") : "";
  const isAllBrands = brand === SPARE_ALL_BRAND_ID;
  const brandSpecificItems = selectedBrand ? spareItems.filter((part) =>
    part.universalCompatibility === true || part.compatibleBrandSlugs?.includes(selectedBrand.id) ||
    part.compatibleBrands?.some((name) => name.toLocaleLowerCase("fr") === selectedBrand.name.toLocaleLowerCase("fr"))
  ) : [];
  const isPartnerInfo = selectedBrandSection?.displayMode === "partner-info" && brandSpecificItems.length === 0;
  const typeNames = usingApi ? catalog.partTypes.map((item) => item.name) : [];
  const availableTypes = Array.from(new Set([
    ...typeNames,
    ...spareItems.map((part) => part.partType).filter((value): value is string => Boolean(value)),
  ]));
  const typeOptions = [SPARE_TYPE_ALL, ...availableTypes];
  const terms = useMemo(() => normalizeSearch(query).trim().split(/\s+/).filter(Boolean), [query]);

  const items = useMemo(() => spareItems.filter((part) => {
    const compatible = isAllBrands || isPartnerInfo || part.universalCompatibility === true ||
      (selectedBrand !== undefined && (
        part.compatibleBrandSlugs?.includes(selectedBrand.id) ||
        part.compatibleBrands?.some((name) => name.toLocaleLowerCase("fr") === selectedBrand.name.toLocaleLowerCase("fr"))
      ));
    const matchingType = type === SPARE_TYPE_ALL || part.partType === type;
    return compatible && matchingType && containsAll(itemLabel(part), terms);
  }), [spareItems, isAllBrands, isPartnerInfo, selectedBrand?.id, selectedBrand?.name, type, terms]);

  useEffect(() => {
    if (!typeOptions.includes(type)) setType(SPARE_TYPE_ALL);
  }, [typeOptions.join("|"), type]);

  const totalPages = Math.max(1, Math.ceil(items.length / PARTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = items.slice((safePage - 1) * PARTS_PER_PAGE, safePage * PARTS_PER_PAGE);
  const briefLoading = useBriefLoading(`spares-${brand}-${type}-${safePage}`);
  const loading = status === "loading" || briefLoading;

  const partnerCopy = brand === "bihr" ? content.piecesDetachees.bihr : undefined;
  const title = isAllBrands ? content.piecesDetachees.titreToutes : `${content.piecesDetachees.titreMarquePrefix} ${brandLabel}`;
  const text = isAllBrands
    ? content.piecesDetachees.descriptionToutes
    : selectedBrand?.description ?? `${content.piecesDetachees.descriptionMarquePrefix} ${brandLabel}${content.piecesDetachees.descriptionMarqueSuffix}`;

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
            brands={brandTabs}
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
            {isPartnerInfo ? (
              <BrandInfoPanel
                logo={selectedBrand?.logo ?? ""}
                alt={selectedBrand?.logoAlt ?? ""}
                title={partnerCopy?.titre ?? title}
                text={partnerCopy?.description ?? text}
                lines={partnerCopy?.lignes ?? []}
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
                  {typeOptions.map((t) => (
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

                <label className="mb-5 flex min-h-11 w-full max-w-lg items-center gap-2 border-b border-black/20 pb-2 text-black/40 focus-within:border-[#a27b17] dark:border-white/20 dark:focus-within:border-[#ffd100]">
                  <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" className="text-[12px]" />
                  <input
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                    placeholder="Rechercher une pièce, une référence ou une compatibilité…"
                    aria-label="Rechercher dans les pièces détachées"
                    className="w-full bg-transparent text-sm text-[#171816] outline-none placeholder:text-black/40 dark:text-white dark:placeholder:text-white/40"
                  />
                </label>

                <div id={content.piecesDetachees.produitsAria} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                  {loading
                    ? Array.from({ length: Math.max(visible.length, 4) }, (_, i) => <PartCardSkeleton key={i} />)
                    : visible.map((part) => (
                        <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />
                      ))}
                </div>
                {!loading && items.length === 0 && (
                  <p className="py-10 text-center text-sm text-black/50 dark:text-white/50">
                    {status === "error" ? "Le catalogue est momentanément indisponible." : "Aucune pièce ne correspond à cette sélection."}
                  </p>
                )}

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

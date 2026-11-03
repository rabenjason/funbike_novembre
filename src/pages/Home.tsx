import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faGears,
  faHelmetSafety,
  faLocationDot,
  faMotorcycle,
  faShirt,
} from "@fortawesome/free-solid-svg-icons";
import { BIKES } from "../data/motorcycles";
import { CATEGORIES } from "../data/categories";
import { FEATURED_BANNERS } from "../data/banners";
import { HOME_EDITORIAL_BANNERS } from "../data/editorialBanners";
import { HOME_PROMOTIONS } from "../data/promotions";
import { TVS_ACCESSORIES } from "../data/equipment/tvs";
import { TVS_PARTS } from "../data/spare-parts/tvs";
import { getBrandsForSection, getHomeFeaturedBrands, getHomePartnerBrands } from "../data/brands";
import { Section } from "../components/Layout";
import { BikeCard, PartCard } from "../components/Cards";
import { AccessoryBrandQuickLinks } from "../components/AccessoryBrands";
import HomepageEditorialBanner from "../components/ShercoBanner";
import BrandExclusif from "../components/BrandExclusif";
import NewArrivals from "../components/NewArrivals";
import TypedText from "../components/TypedText";
import { content } from "../constants";
import { usePublicCatalog } from "../contexts/PublicCatalogContext";
import { liveBikes, liveParts, toBrand, toNewArrival } from "../lib/catalogAdapters";

const CATEGORY_ICONS = [faMotorcycle, faHelmetSafety, faGears, faShirt];
const HOME_EQUIPMENT_BRANDS = getBrandsForSection("equipements");
const HOME_FEATURED_BRANDS = getHomeFeaturedBrands();
const HOME_PARTNER_BRANDS = getHomePartnerBrands();

export default function Home({ go }: { go: (p: string, id?: string) => void }) {
  const { catalog, status } = usePublicCatalog();
  const usingApi = status === "ready" && catalog !== null;
  const fallback = status === "error";
  const motorcycles = useMemo(
    () => usingApi ? liveBikes(catalog.products) : fallback ? BIKES : [],
    [usingApi, fallback, catalog],
  );
  const categories = usingApi ? catalog.categories : fallback ? CATEGORIES : [];
  const homeParts = useMemo(() => {
    if (!usingApi) return fallback ? [TVS_PARTS[0], TVS_PARTS[2], TVS_ACCESSORIES[0], TVS_ACCESSORIES[2]] : [];
    const parts = liveParts(catalog.products);
    return [
      ...parts.filter((part) => part.kind === "piece").slice(0, 2),
      ...parts.filter((part) => part.kind !== "piece").slice(0, 2),
    ];
  }, [usingApi, fallback, catalog]);
  const sectionBrands = useMemo(() => (section: string, featuredOnly = false) =>
    [...(catalog?.brands ?? [])]
      .filter((brand) => brand.isActive && brand.sections?.some((association) =>
        association.section === section && (!featuredOnly || association.homeFeatured === true),
      ))
      .sort((left, right) =>
        (left.sections?.find((association) => association.section === section)?.order ?? 0) -
        (right.sections?.find((association) => association.section === section)?.order ?? 0),
      )
      .map(toBrand),
  [catalog]);
  const equipmentBrands = usingApi ? sectionBrands("equipements") : fallback ? HOME_EQUIPMENT_BRANDS : [];
  const featuredBrands = usingApi ? sectionBrands("motos", true) : fallback ? HOME_FEATURED_BRANDS : [];
  const partnerBrands = usingApi ? sectionBrands("partenaires") : fallback ? HOME_PARTNER_BRANDS : [];
  const newArrivals = useMemo(() => {
    if (!usingApi) return fallback ? HOME_PROMOTIONS : [];
    return [...(catalog?.products ?? [])]
      .filter((product) =>
        product.status === "PUBLISHED"
        && product.newArrivalOrder !== null
        && product.newArrivalOrder !== undefined,
      )
      .sort((left, right) => (left.newArrivalOrder ?? 0) - (right.newArrivalOrder ?? 0))
      .slice(0, 3)
      .map(toNewArrival);
  }, [usingApi, fallback, catalog]);
  const heroBanners = usingApi ? catalog.featuredBanners : fallback ? FEATURED_BANNERS : [];
  const editorialBanners = usingApi
    ? catalog.homepageEditorialBannersConfigured ? catalog.homepageEditorialBanners : HOME_EDITORIAL_BANNERS
    : fallback ? HOME_EDITORIAL_BANNERS : [];
  const heroCopy = usingApi && catalog.homepageHeroCopy
    ? {
        localisation: catalog.homepageHeroCopy.localisation,
        titreLigne1: catalog.homepageHeroCopy.titleLine1,
        titreLigne2: catalog.homepageHeroCopy.titleLine2,
        description: catalog.homepageHeroCopy.description,
        sloganPrefix: catalog.homepageHeroCopy.sloganPrefix,
        usages: catalog.homepageHeroCopy.usages,
        boutonCatalogue: catalog.homepageHeroCopy.catalogButton,
        aLaUne: catalog.homepageHeroCopy.featuredLabel,
        annee: catalog.homepageHeroCopy.year,
        choisirModele: catalog.homepageHeroCopy.chooseModelLabel,
        afficherModele: catalog.homepageHeroCopy.displayModelLabel,
      }
    : content.accueil.hero;
  // 22 seconds corresponds to the current nine-logo reference set. Scale time
  // with the number of logos so the ticker keeps a consistent perceived speed.
  const partnerScrollDuration = Math.max(1, (22 / HOME_PARTNER_BRANDS.length) * partnerBrands.length);

  const [activeHero, setActiveHero] = useState(0);
  const safeHeroIndex = heroBanners.length ? activeHero % heroBanners.length : 0;
  const current = heroBanners[safeHeroIndex];

  useEffect(() => {
    setActiveHero((index) => heroBanners.length ? index % heroBanners.length : 0);
    if (heroBanners.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveHero((index) => (index + 1) % heroBanners.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroBanners.length]);

  return (
    <div className="overflow-hidden bg-white text-[#171816] dark:bg-[#141513] dark:text-[#f2f0ea]">
      {/* Full-bleed hero image with a smooth contrast veil for the headline */}
      {current && (
      <section className="relative isolate min-h-[max(560px,calc(100svh-64px))] overflow-hidden bg-[#22231f] sm:min-h-[720px] lg:min-h-[min(820px,calc(100svh-68px))]">
        <AnimatePresence initial={false} mode="sync">
          <motion.img
            key={current.id}
            src={current.image}
            alt={current.alt}
            initial={{ opacity: 0, scale: 1.035 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.7 }, scale: { duration: 7, ease: "linear" } }}
            className="absolute inset-0 h-full w-full object-cover object-[center_52%]"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20 lg:via-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        {/* Mobile order: text → "À la une" bar → buttons at the very bottom.
            Desktop order: text → buttons → "À la une" bar. */}
        <div className="relative z-10 mx-auto flex min-h-[max(560px,calc(100svh-64px))] w-full max-w-(--container-site) flex-col px-5 pb-4 pt-10 sm:min-h-[720px] sm:px-7 sm:pb-9 sm:pt-16 lg:min-h-[min(820px,calc(100svh-68px))] lg:px-10 lg:pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="order-1 w-full max-w-[820px]"
          >
            <p className="fluid-eyebrow flex items-center gap-2 font-bold uppercase leading-snug text-white/75">
              <FontAwesomeIcon icon={faLocationDot} className="shrink-0 text-[#ffd100]" />
              <span>{heroCopy.localisation}</span>
            </p>
            <h1 className="fluid-hero mt-4 max-w-xl text-balance font-display font-semibold text-white sm:mt-7">
              {heroCopy.titreLigne1}
              <br className="hidden sm:inline" /> {heroCopy.titreLigne2}
            </h1>
            <p className="fluid-body mt-3.5 max-w-md text-pretty text-white/80 sm:mt-4">
              {heroCopy.description}
            </p>
            <p className="fluid-body mt-3 flex items-center text-white/90">
              {heroCopy.sloganPrefix}&nbsp;
              <TypedText strings={[...heroCopy.usages]} className="font-semibold text-[#ffd100]" />
            </p>
          </motion.div>

          {/* Buttons — mobile: full-width, stacked, anchored at the bottom (chat sits right above) */}
          <motion.div
            id="hero-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="order-3 mt-3 grid w-full grid-cols-1 gap-2.5 sm:order-2 sm:mt-8 sm:flex sm:w-auto sm:flex-wrap sm:gap-3"
          >
            <button
              onClick={() => go("catalogue")}
              className="fluid-btn inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#ffd100] px-5 py-3 text-center font-bold uppercase text-[#171816] transition active:scale-[0.98] hover:bg-white sm:min-h-11 sm:w-auto"
            >
              {heroCopy.boutonCatalogue} <FontAwesomeIcon icon={faArrowRight} className="shrink-0" />
            </button>
            <button
              onClick={() => go(current.targetPage, current.targetId)}
              className="glass-panel fluid-btn inline-flex min-h-12 w-full items-center justify-center gap-3 border-white/40 bg-white/10 px-5 py-3 text-center font-bold uppercase text-white transition active:scale-[0.98] hover:border-[#ffd100] hover:text-[#ffd100] sm:min-h-11 sm:w-auto"
            >
              <span className="truncate">{current.short}</span>
              <FontAwesomeIcon icon={faArrowRight} className="shrink-0" />
            </button>
          </motion.div>

          <div className="order-2 mt-auto flex items-center justify-between gap-3 border-t border-white/30 pr-16 pt-3 sm:order-3 sm:items-end sm:gap-4 sm:pr-0 sm:pt-5">
            <div className="min-w-0 text-white">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.id + "caption"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ffd100]">{heroCopy.aLaUne} / {current.brand}</p>
                  <p className="mt-0.5 truncate font-display text-sm font-semibold sm:mt-1 sm:text-base">
                    {current.short} · {heroCopy.annee}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              <span className="font-display text-[11px] font-semibold text-white/70 sm:mr-1 sm:text-xs">
                {String(safeHeroIndex + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center" aria-label={heroCopy.choisirModele}>
                {heroBanners.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveHero(index)}
                    aria-label={`${heroCopy.afficherModele} ${item.short}`}
                    aria-pressed={activeHero === index}
                    className="group grid h-11 w-8 place-items-center px-1.5 sm:h-9"
                  >
                    <span className="block h-[3px] w-full bg-white/45 transition-all group-aria-pressed:bg-[#ffd100]" />
                  </button>
                ))}
              </div>
              <span className="font-display text-[11px] font-semibold text-white/50 sm:text-xs">{String(heroBanners.length).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Category index: compact links instead of large category tiles */}
      <section className="mx-auto w-full max-w-(--container-site) px-4 py-10 sm:px-7 sm:py-12 lg:px-10 lg:py-16">
        <div className="grid gap-5 border-t border-black/15 pt-4 dark:border-white/15 sm:grid-cols-[0.75fr_1.25fr] sm:gap-8">
          <div>
            <p className="fluid-eyebrow mb-2 font-bold uppercase text-[#98741b] dark:text-[#ffd100]">
              {content.accueil.univers.surTitre}
            </p>
            <h2 className="fluid-h2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
              {content.accueil.univers.titre}
            </h2>
          </div>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {categories.map((category, index) => (
              <motion.button
                key={`${category.title}-${index}`}
                onClick={() => go(category.to, category.brand ?? undefined)}
                whileHover={{ x: 4 }}
                aria-label={`${category.title} — ${category.desc}`}
                className="group flex min-h-14 items-center gap-3 border-b border-black/10 px-2 py-3 text-left transition hover:bg-white/65 hover:backdrop-blur-xl dark:border-white/15 dark:hover:bg-white/[0.035]"
              >
                <span className="w-7 font-display text-[10px] text-black/40 dark:text-white/40">{String(index + 1).padStart(2, "0")}</span>
                {category.src ? (
                  <img src={category.src} alt="" loading="lazy" className="h-9 w-12 shrink-0 object-cover" />
                ) : (
                  <FontAwesomeIcon icon={CATEGORY_ICONS[index % CATEGORY_ICONS.length]} className="w-4 text-[12px] text-[#98741b] dark:text-[#ffd100]" />
                )}
                <span className="flex-1 text-[#171816] dark:text-[#f2f0ea]"><span className="block font-display text-sm font-semibold">{category.title}</span><span className="mt-0.5 block text-[10px] leading-4 text-black/45 dark:text-white/45">{category.desc}</span></span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px] text-black/40 transition group-hover:translate-x-1 group-hover:text-[#98741b] dark:text-white/40 dark:group-hover:text-[#ffd100]" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {editorialBanners.map((banner) => (
        <HomepageEditorialBanner key={banner.id} banner={banner} go={go} />
      ))}

      {featuredBrands.length > 0 && <BrandExclusif go={go} brands={featuredBrands} />}

      {newArrivals.length > 0 && <NewArrivals go={go} items={newArrivals} />}

      <Section
        title={content.accueil.motos.titre}
        subtitle={content.accueil.motos.description}
        number={content.accueil.motos.numero}
      >
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
          {motorcycles.slice(0, 3).map((bike) => <BikeCard key={bike.id} bike={bike} go={go} />)}
        </div>
        {motorcycles.length === 0 && <p className="py-8 text-sm text-black/50 dark:text-white/50">{status === "loading" ? "Chargement du catalogue…" : "Aucune moto publiée pour le moment."}</p>}
        <button
          onClick={() => go("motos")}
          className="mt-8 inline-flex items-center gap-2 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
        >
          {content.accueil.motos.bouton} <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </Section>

      <section className="border-y border-[#e8d574]/50 bg-[#fff9df]/65 backdrop-blur-2xl dark:border-white/10 dark:bg-[#1c1d19]">
        <div className="mx-auto w-full max-w-(--container-site) px-4 py-10 sm:px-7 sm:py-12 lg:px-10 lg:py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-black/15 pt-4 dark:border-white/15 sm:mb-7">
            <div>
              <p className="fluid-eyebrow mb-2 font-bold uppercase text-[#98741b] dark:text-[#ffd100]">{content.accueil.atelier.surTitre}</p>
              <h2 className="fluid-h2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
                {content.accueil.atelier.titre}
              </h2>
            </div>
            <p className="fluid-body max-w-sm text-black/55 dark:text-white/55">
              {content.accueil.atelier.description}
            </p>
          </div>

          <div className="mb-6">
            {equipmentBrands.length > 0 && <AccessoryBrandQuickLinks brands={equipmentBrands} onSelect={(brand) => go("equipements", brand)} />}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5">
            {homeParts.map((part) => (
              <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />
            ))}
          </div>
          {homeParts.length === 0 && <p className="py-8 text-sm text-black/50 dark:text-white/50">{status === "loading" ? "Chargement du catalogue…" : "Aucun équipement ou pièce publié pour le moment."}</p>}
          <button
            onClick={() => go("equipements")}
          className="mt-8 inline-flex items-center gap-2 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
          >
            {content.accueil.atelier.bouton} <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </section>

      <section className="glass-header overflow-hidden border-y border-white/70 py-10 dark:border-white/10">
        <div className="mx-auto w-full max-w-(--container-site) px-4 sm:px-7 lg:px-10">
          <div className="mb-5 flex items-center justify-between border-t border-black/15 pt-3 dark:border-white/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">{content.accueil.partenaires.titre}</p>
            <span className="text-[9px] uppercase tracking-[0.16em] text-black/35 dark:text-white/35">{content.accueil.partenaires.description}</span>
          </div>
          <div className="group/marquee relative overflow-hidden">
            {/* Fade edges so logos slide in and out smoothly */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24 dark:from-[#141513]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24 dark:from-[#141513]"
            />

            <div
              className="fb-partner-track flex w-max items-center gap-6 pr-6 sm:gap-10 sm:pr-10"
              style={{ "--fb-partner-duration": `${partnerScrollDuration}s` } as CSSProperties}
            >
              {[...partnerBrands, ...partnerBrands].map((brand, index) => (
                <motion.div
                  key={`${brand.name}-${index}`}
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className="brand-logo-tile shrink-0"
                >
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={`${content.accueil.partenaires.logoPrefix} ${brand.name}`}
                      loading="lazy"
                      className="partner-logo h-full w-full object-contain transition-opacity hover:opacity-100"
                    />
                  ) : (
                    <span className="grid h-full place-items-center px-5 text-xs font-bold uppercase text-black/55 dark:text-white/70">{brand.name}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
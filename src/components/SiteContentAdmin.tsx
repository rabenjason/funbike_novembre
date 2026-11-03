import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import ImageFilePicker, { type ImageSelection } from "./ImageFilePicker";
import HomepageHeroAdmin from "./HomepageHeroAdmin";
import { deleteUploadedImages, uploadImage } from "../lib/imageUploads";
import { announcePublicCatalogChange, graphqlRequest } from "../lib/graphqlClient";

type FeaturedBanner = {
  id: string;
  short: string;
  brand: string;
  tag: string;
  image: string;
  alt: string;
  targetPage: string;
  targetId: string;
  isActive: boolean;
  sortOrder: number;
};

type HomepagePromotion = {
  id: string;
  badge: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  highlights: string[];
  price: string;
  targetPage: string;
  targetId: string;
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Dealer = {
  key: string;
  city: string;
  name: string;
  kind: string;
  address: string;
  hours: string;
  phone: string;
  email: string;
  desc: string;
  assistantLabel: string | null;
  lat: number;
  lon: number;
  services: string[];
  isActive: boolean;
  sortOrder: number;
};

type SiteContentData = {
  adminFeaturedBanners: FeaturedBanner[];
  adminHomepagePromotions: HomepagePromotion[];
  adminDealers: Dealer[];
};

type BannerForm = Omit<FeaturedBanner, "image"> & { image: ImageSelection | null };
type PromotionForm = Omit<HomepagePromotion, "image" | "highlights" | "publishedAt" | "startsAt" | "endsAt"> & {
  image: ImageSelection | null;
  highlightsText: string;
  publishedAt: string;
  startsAt: string;
  endsAt: string;
};
type DealerForm = Omit<Dealer, "lat" | "lon" | "assistantLabel"> & {
  assistantLabel: string;
  lat: string;
  lon: string;
  serviceDraft: string;
};
type ContentSection = "banners" | "homeHeroes" | "promotions" | "dealers";
type ArchiveTarget =
  | { type: "banner"; id: string; label: string }
  | { type: "promotion"; id: string; label: string }
  | { type: "dealer"; id: string; label: string };

const destinations = [
  { page: "home", label: "Accueil" },
  { page: "catalogue", label: "Tout le catalogue" },
  { page: "motos", label: "Motos" },
  { page: "equipements", label: "Équipements pilote" },
  { page: "spares", label: "Pièces détachées" },
  { page: "revendeurs", label: "Points de vente" },
  { page: "contact", label: "Contact" },
  { page: "product", label: "Fiche moto" },
  { page: "accessory", label: "Fiche pièce ou équipement" },
] as const;

const pageSizeLabel = "0 = en premier ; un nombre plus grand l’affiche plus loin.";
const panelClass = "border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#1c1d1a]";
const fieldClass = "w-full min-w-0 border border-black/15 bg-white px-3 py-2.5 text-sm leading-5 text-[#171816] outline-none transition placeholder:text-black/35 focus:border-[#c49d00] focus:ring-2 focus:ring-[#ffd100]/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] dark:placeholder:text-white/35";
const buttonPrimary = "inline-flex min-h-11 items-center justify-center gap-2 bg-[#ffd100] px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#171816] shadow-sm transition hover:bg-[#ffe36b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c49d00] disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary = "inline-flex min-h-11 items-center justify-center gap-2 border border-black/15 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-[#171816] transition hover:border-[#c49d00] hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c49d00] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] dark:hover:bg-white/[0.04]";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[11px] font-bold uppercase leading-4 tracking-[0.11em] text-black/60 dark:text-white/60">{label}</span>
      {children}
      {hint && <span className="block text-xs leading-5 text-black/45 dark:text-white/45">{hint}</span>}
    </label>
  );
}

const emptyBanner = (): BannerForm => ({
  id: "",
  short: "",
  brand: "",
  tag: "",
  image: null,
  alt: "",
  targetPage: "product",
  targetId: "",
  isActive: true,
  sortOrder: 0,
});

const emptyPromotion = (): PromotionForm => ({
  id: "",
  badge: "",
  eyebrow: "",
  title: "",
  description: "",
  image: null,
  alt: "",
  highlightsText: "",
  price: "",
  targetPage: "product",
  targetId: "",
  publishedAt: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  sortOrder: 0,
});

const emptyDealer = (): DealerForm => ({
  key: "",
  city: "",
  name: "",
  kind: "Point de vente",
  address: "",
  hours: "",
  phone: "",
  email: "",
  desc: "",
  assistantLabel: "",
  lat: "",
  lon: "",
  services: [],
  serviceDraft: "",
  isActive: true,
  sortOrder: 0,
});

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

function imageFromUrl(url: string, id: string): ImageSelection {
  return { id, url, previewUrl: url, name: "Photo actuelle" };
}

function asLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function uploadedImagesRemoved(previousUrls: string[], nextUrls: string[]): string[] {
  return previousUrls.filter((url) => url.startsWith("/uploads/") && !nextUrls.includes(url));
}

function cleanupImages(urls: string[], accessToken: string): void {
  if (urls.length > 0) void deleteUploadedImages(urls, accessToken).catch(() => undefined);
}

async function resolveImage(image: ImageSelection, accessToken: string, uploaded: string[]): Promise<string> {
  if (image.file) {
    const url = await uploadImage(image.file, accessToken);
    uploaded.push(url);
    return url;
  }
  if (image.url) return image.url;
  throw new Error("Sélectionnez une image avant d’enregistrer.");
}

function DisplayOrder({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <Field label="Position dans la liste" hint={pageSizeLabel}>
      <input
        className={fieldClass}
        type="number"
        min={0}
        max={100000}
        step={1}
        inputMode="numeric"
        required
        value={value}
        onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
      />
    </Field>
  );
}

function StatusField({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Field label="Statut">
      <select className={fieldClass} value={String(value)} onChange={(event) => onChange(event.target.value === "true")}>
        <option value="true">Active</option>
        <option value="false">Archivée</option>
      </select>
    </Field>
  );
}

function TargetFields({
  targetPage,
  targetId,
  onPageChange,
  onIdChange,
}: {
  targetPage: string;
  targetId: string;
  onPageChange: (value: string) => void;
  onIdChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Page à ouvrir au clic">
        <select className={fieldClass} required value={targetPage} onChange={(event) => onPageChange(event.target.value)}>
          {destinations.map((destination) => <option key={destination.page} value={destination.page}>{destination.label}</option>)}
          {targetPage && !destinations.some((destination) => destination.page === targetPage) && <option value={targetPage}>Valeur actuelle : {targetPage}</option>}
        </select>
      </Field>
      <Field label="Identifiant de destination" hint="Pour une fiche produit, utilisez son identifiant public ; ce champ n’est pas une référence commerciale.">
        <input className={fieldClass} required maxLength={160} value={targetId} onChange={(event) => onIdChange(event.target.value)} placeholder="Ex. sherco-sef-250" />
      </Field>
    </div>
  );
}

const ADMIN_CONTENT_QUERY = `
  query AdminSiteContent {
    adminFeaturedBanners { id short brand tag image alt targetPage targetId isActive sortOrder }
    adminHomepagePromotions {
      id badge eyebrow title description image alt highlights price targetPage targetId
      publishedAt startsAt endsAt isActive sortOrder
    }
    adminDealers {
      key city name kind address hours phone email desc assistantLabel lat lon services isActive sortOrder
    }
  }
`;

export default function SiteContentAdmin({ token }: { token: string }) {
  const [section, setSection] = useState<ContentSection>("banners");
  const [data, setData] = useState<SiteContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);

  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBanner);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [promotionForm, setPromotionForm] = useState<PromotionForm>(emptyPromotion);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [dealerForm, setDealerForm] = useState<DealerForm>(emptyDealer);
  const [editingDealerKey, setEditingDealerKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setNotice("");
    void graphqlRequest<SiteContentData>(ADMIN_CONTENT_QUERY, undefined, token)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Impossible de charger les contenus du site.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!archiveTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setArchiveTarget(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [archiveTarget, busy]);

  function reload() {
    setRefreshKey((value) => value + 1);
  }

  function beginEditBanner(item: FeaturedBanner) {
    setSection("banners");
    setEditingBannerId(item.id);
    setBannerForm({ ...item, image: imageFromUrl(item.image, `banner-${item.id}-image`) });
  }

  function beginEditPromotion(item: HomepagePromotion) {
    setSection("promotions");
    setEditingPromotionId(item.id);
    setPromotionForm({
      ...item,
      image: imageFromUrl(item.image, `promotion-${item.id}-image`),
      highlightsText: item.highlights.join("\n"),
      publishedAt: toLocalDateTime(item.publishedAt),
      startsAt: toLocalDateTime(item.startsAt),
      endsAt: toLocalDateTime(item.endsAt),
    });
  }

  function beginEditDealer(item: Dealer) {
    setSection("dealers");
    setEditingDealerKey(item.key);
    setDealerForm({
      ...item,
      lat: String(item.lat),
      lon: String(item.lon),
      serviceDraft: "",
      assistantLabel: item.assistantLabel ?? "",
    });
  }

  function addDealerService() {
    const value = dealerForm.serviceDraft.trim();
    if (!value) return;
    if (dealerForm.services.length >= 50) {
      setError("50 services maximum par point de vente.");
      return;
    }
    if (dealerForm.services.some((service) => service.toLowerCase() === value.toLowerCase())) {
      setDealerForm({ ...dealerForm, serviceDraft: "" });
      setNotice("Ce service est déjà dans la liste.");
      return;
    }
    setDealerForm({ ...dealerForm, services: [...dealerForm.services, value], serviceDraft: "" });
  }

  async function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !bannerForm.image) {
      setError("Sélectionnez une photo pour cette bannière.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const previousUrls = bannerForm.image.url ? [bannerForm.image.url] : [];
    const uploaded: string[] = [];
    try {
      if (bannerForm.image.file) setNotice("Importation de la photo en cours…");
      const image = await resolveImage(bannerForm.image, token, uploaded);
      const input = {
        id: bannerForm.id.trim(),
        short: bannerForm.short.trim(),
        brand: bannerForm.brand.trim(),
        tag: bannerForm.tag.trim(),
        image,
        alt: bannerForm.alt.trim(),
        targetPage: bannerForm.targetPage,
        targetId: bannerForm.targetId.trim(),
        isActive: bannerForm.isActive,
        sortOrder: bannerForm.sortOrder,
      };
      if (editingBannerId) {
        await graphqlRequest(
          "mutation UpdateFeaturedBanner($id: ID!, $input: FeaturedBannerInput!) { updateFeaturedBanner(id: $id, input: $input) { id short } }",
          { id: editingBannerId, input },
          token,
        );
        setNotice("Bannière mise à jour.");
      } else {
        await graphqlRequest(
          "mutation CreateFeaturedBanner($input: FeaturedBannerInput!) { createFeaturedBanner(input: $input) { id short } }",
          { input },
          token,
        );
        setNotice("Bannière créée.");
      }
      cleanupImages(uploadedImagesRemoved(previousUrls, [image]), token);
      announcePublicCatalogChange();
      setEditingBannerId(null);
      setBannerForm(emptyBanner());
      reload();
    } catch (reason) {
      cleanupImages(uploaded, token);
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la bannière.");
    } finally {
      setBusy(false);
    }
  }

  async function savePromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !promotionForm.image) {
      setError("Sélectionnez une photo pour cette promotion.");
      return;
    }
    if (promotionForm.startsAt && promotionForm.endsAt && new Date(promotionForm.startsAt) > new Date(promotionForm.endsAt)) {
      setError("La date de début doit précéder la date de fin.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const previousUrls = promotionForm.image.url ? [promotionForm.image.url] : [];
    const uploaded: string[] = [];
    try {
      if (promotionForm.image.file) setNotice("Importation de la photo en cours…");
      const image = await resolveImage(promotionForm.image, token, uploaded);
      const input = {
        id: promotionForm.id.trim(),
        badge: promotionForm.badge.trim(),
        eyebrow: promotionForm.eyebrow.trim(),
        title: promotionForm.title.trim(),
        description: promotionForm.description.trim(),
        image,
        alt: promotionForm.alt.trim(),
        highlights: asLines(promotionForm.highlightsText),
        price: promotionForm.price.trim(),
        targetPage: promotionForm.targetPage,
        targetId: promotionForm.targetId.trim(),
        publishedAt: fromLocalDateTime(promotionForm.publishedAt),
        startsAt: fromLocalDateTime(promotionForm.startsAt),
        endsAt: fromLocalDateTime(promotionForm.endsAt),
        isActive: promotionForm.isActive,
        sortOrder: promotionForm.sortOrder,
      };
      if (editingPromotionId) {
        await graphqlRequest(
          "mutation UpdateHomepagePromotion($id: ID!, $input: HomepagePromotionInput!) { updateHomepagePromotion(id: $id, input: $input) { id title } }",
          { id: editingPromotionId, input },
          token,
        );
        setNotice("Promotion mise à jour.");
      } else {
        await graphqlRequest(
          "mutation CreateHomepagePromotion($input: HomepagePromotionInput!) { createHomepagePromotion(input: $input) { id title } }",
          { input },
          token,
        );
        setNotice("Promotion créée.");
      }
      cleanupImages(uploadedImagesRemoved(previousUrls, [image]), token);
      announcePublicCatalogChange();
      setEditingPromotionId(null);
      setPromotionForm(emptyPromotion());
      reload();
    } catch (reason) {
      cleanupImages(uploaded, token);
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la promotion.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDealer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const lat = Number(dealerForm.lat);
    const lon = Number(dealerForm.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      setError("Indiquez une latitude entre −90 et 90 et une longitude entre −180 et 180.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const input = {
        key: dealerForm.key.trim(),
        city: dealerForm.city.trim(),
        name: dealerForm.name.trim(),
        kind: dealerForm.kind.trim(),
        address: dealerForm.address.trim(),
        hours: dealerForm.hours.trim(),
        phone: dealerForm.phone.trim(),
        email: dealerForm.email.trim(),
        desc: dealerForm.desc.trim(),
        assistantLabel: dealerForm.assistantLabel.trim() || null,
        lat,
        lon,
        services: dealerForm.services,
        isActive: dealerForm.isActive,
        sortOrder: dealerForm.sortOrder,
      };
      if (editingDealerKey) {
        await graphqlRequest(
          "mutation UpdateDealer($key: ID!, $input: DealerInput!) { updateDealer(key: $key, input: $input) { key name } }",
          { key: editingDealerKey, input },
          token,
        );
        setNotice("Point de vente mis à jour.");
      } else {
        await graphqlRequest(
          "mutation CreateDealer($input: DealerInput!) { createDealer(input: $input) { key name } }",
          { input },
          token,
        );
        setNotice("Point de vente créé.");
      }
      announcePublicCatalogChange();
      setEditingDealerKey(null);
      setDealerForm(emptyDealer());
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer le point de vente.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmArchive() {
    if (!token || !archiveTarget) return;
    const target = archiveTarget;
    setBusy(true);
    setError("");
    try {
      if (target.type === "banner") {
        await graphqlRequest("mutation ArchiveFeaturedBanner($id: ID!) { deleteFeaturedBanner(id: $id) }", { id: target.id }, token);
        if (editingBannerId === target.id) {
          setEditingBannerId(null);
          setBannerForm(emptyBanner());
        }
      } else if (target.type === "promotion") {
        await graphqlRequest("mutation ArchiveHomepagePromotion($id: ID!) { deleteHomepagePromotion(id: $id) }", { id: target.id }, token);
        if (editingPromotionId === target.id) {
          setEditingPromotionId(null);
          setPromotionForm(emptyPromotion());
        }
      } else {
        await graphqlRequest("mutation ArchiveDealer($key: ID!) { deleteDealer(key: $key) }", { key: target.id }, token);
        if (editingDealerKey === target.id) {
          setEditingDealerKey(null);
          setDealerForm(emptyDealer());
        }
      }
      setArchiveTarget(null);
      setNotice("Contenu archivé.");
      announcePublicCatalogChange();
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’archiver ce contenu.");
    } finally {
      setBusy(false);
    }
  }

  const banners = data?.adminFeaturedBanners ?? [];
  const promotions = data?.adminHomepagePromotions ?? [];
  const dealers = data?.adminDealers ?? [];

  return (
    <section className="min-w-0 space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Contenu public · source GraphQL</p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Contenus de l’accueil et points de vente</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55 dark:text-white/55">
          Gérez ici les visuels héro (diapositives du haut, textes et bannières secondaires), les promotions et les points de vente visibles sur le site. Les photos se choisissent depuis votre ordinateur ; aucune URL d’image à saisir.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-black/10 dark:border-white/10" role="tablist" aria-label="Type de contenu public">
        {([
          ["banners", "Diapositives du hero"],
          ["homeHeroes", "Textes & bannière secondaire"],
          ["promotions", "Promotions"],
          ["dealers", "Revendeurs"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={`min-h-12 shrink-0 border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${section === key ? "border-[#d2a900] bg-yellow-50/70 text-[#171816] dark:bg-yellow-400/10 dark:text-white" : "border-transparent text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {(error || notice) && (
        <div className={`border-l-4 px-4 py-3.5 text-sm leading-6 ${error ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "border-[#c49d00] bg-yellow-50 text-[#5f4b00] dark:bg-yellow-950/20 dark:text-yellow-100"}`} role={error ? "alert" : "status"}>
          {error || notice}
        </div>
      )}
      {loading && <p className="text-xs text-black/45 dark:text-white/45" role="status">Chargement des contenus…</p>}

      {section === "banners" && (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="min-w-0 space-y-4">
            <div>
              <h3 className="font-display text-xl font-bold">Diapositives du hero principal <span className="text-sm font-normal text-black/45 dark:text-white/45">({banners.length})</span></h3>
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">Chaque diapositive pilote la grande photo, le nom du modèle, la marque et le bouton d’accès du carrousel en haut de l’accueil.</p>
            </div>
            <div className={panelClass}>
              <ul className="divide-y divide-black/10 dark:divide-white/10">
                {banners.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                    <img src={item.image} alt="" className="h-16 w-24 shrink-0 bg-black/[0.03] object-cover dark:bg-white/[0.04]" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.short}</p>
                      <p className="text-xs text-black/50 dark:text-white/50">{item.brand} · {item.tag} · {item.isActive ? "Active" : "Archivée"}</p>
                    </div>
                    <button type="button" className={buttonSecondary} disabled={busy} onClick={() => beginEditBanner(item)}>Modifier</button>
                    {item.isActive && <button type="button" className="min-h-11 px-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" disabled={busy} onClick={() => setArchiveTarget({ type: "banner", id: item.id, label: item.short })}>Archiver</button>}
                  </li>
                ))}
                {banners.length === 0 && <li className="p-5 text-sm text-black/45 dark:text-white/45">Aucune bannière enregistrée.</li>}
              </ul>
            </div>
          </div>

          <form onSubmit={saveBanner} className={`${panelClass} min-w-0 space-y-5 p-5 sm:p-6`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingBannerId ? "Modification" : "Nouvelle bannière"}</p>
              <h3 className="mt-1 font-display text-xl font-bold">Diapositive héro</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Titre court" hint="Ex. Sherco SEF 250 Factory.">
                <input className={fieldClass} required maxLength={160} value={bannerForm.short} onChange={(event) => setBannerForm((current) => ({ ...current, short: event.target.value, id: editingBannerId || current.id ? current.id : slugify(event.target.value) }))} />
              </Field>
              <Field label="Identifiant stable" hint="Minuscules, chiffres et tirets ; figé après création.">
                <input className={fieldClass} required disabled={Boolean(editingBannerId)} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={bannerForm.id} onChange={(event) => setBannerForm({ ...bannerForm, id: event.target.value.toLowerCase() })} />
              </Field>
              <Field label="Marque" hint="Ex. TVS ou Sherco.">
                <input className={fieldClass} required maxLength={160} value={bannerForm.brand} onChange={(event) => setBannerForm({ ...bannerForm, brand: event.target.value })} />
              </Field>
              <Field label="Gamme ou catégorie">
                <input className={fieldClass} required maxLength={160} value={bannerForm.tag} onChange={(event) => setBannerForm({ ...bannerForm, tag: event.target.value })} placeholder="Ex. Enduro / Factory" />
              </Field>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">Photo de la bannière</p>
              <ImageFilePicker images={bannerForm.image ? [bannerForm.image] : []} onChange={(images) => setBannerForm({ ...bannerForm, image: images[0] ?? null })} disabled={busy} />
            </div>
            <Field label="Description de la photo (accessibilité)">
              <input className={fieldClass} required maxLength={255} value={bannerForm.alt} onChange={(event) => setBannerForm({ ...bannerForm, alt: event.target.value })} />
            </Field>
            <TargetFields targetPage={bannerForm.targetPage} targetId={bannerForm.targetId} onPageChange={(targetPage) => setBannerForm({ ...bannerForm, targetPage })} onIdChange={(targetId) => setBannerForm({ ...bannerForm, targetId })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <DisplayOrder value={bannerForm.sortOrder} onChange={(sortOrder) => setBannerForm({ ...bannerForm, sortOrder })} />
              <StatusField value={bannerForm.isActive} onChange={(isActive) => setBannerForm({ ...bannerForm, isActive })} />
            </div>
            <div className="flex flex-wrap gap-3">
              {editingBannerId && <button type="button" className={buttonSecondary} disabled={busy} onClick={() => { setEditingBannerId(null); setBannerForm(emptyBanner()); }}>Annuler</button>}
              <button className={buttonPrimary} type="submit" disabled={busy}>{busy ? "Enregistrement…" : editingBannerId ? "Enregistrer la bannière" : "Créer la bannière"}</button>
            </div>
          </form>
        </div>
      )}

      {section === "homeHeroes" && <HomepageHeroAdmin token={token} />}

      {section === "promotions" && (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="min-w-0 space-y-4">
            <h3 className="font-display text-xl font-bold">Promotions enregistrées <span className="text-sm font-normal text-black/45 dark:text-white/45">({promotions.length})</span></h3>
            <div className={panelClass}>
              <ul className="divide-y divide-black/10 dark:divide-white/10">
                {promotions.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                    <img src={item.image} alt="" className="h-16 w-24 shrink-0 bg-black/[0.03] object-cover dark:bg-white/[0.04]" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-xs text-black/50 dark:text-white/50">{item.badge} · {item.price} · {item.isActive ? "Active" : "Archivée"}</p>
                    </div>
                    <button type="button" className={buttonSecondary} disabled={busy} onClick={() => beginEditPromotion(item)}>Modifier</button>
                    {item.isActive && <button type="button" className="min-h-11 px-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" disabled={busy} onClick={() => setArchiveTarget({ type: "promotion", id: item.id, label: item.title })}>Archiver</button>}
                  </li>
                ))}
                {promotions.length === 0 && <li className="p-5 text-sm text-black/45 dark:text-white/45">Aucune promotion enregistrée.</li>}
              </ul>
            </div>
          </div>

          <form onSubmit={savePromotion} className={`${panelClass} min-w-0 space-y-5 p-5 sm:p-6`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingPromotionId ? "Modification" : "Nouvelle promotion"}</p>
              <h3 className="mt-1 font-display text-xl font-bold">Carte de nouveauté ou promotion</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Titre de la carte">
                <input className={fieldClass} required maxLength={255} value={promotionForm.title} onChange={(event) => setPromotionForm((current) => ({ ...current, title: event.target.value, id: editingPromotionId || current.id ? current.id : slugify(event.target.value) }))} placeholder="Ex. Sherco SEF 250 Factory" />
              </Field>
              <Field label="Identifiant stable" hint="Minuscules, chiffres et tirets ; figé après création.">
                <input className={fieldClass} required disabled={Boolean(editingPromotionId)} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={promotionForm.id} onChange={(event) => setPromotionForm({ ...promotionForm, id: event.target.value.toLowerCase() })} />
              </Field>
              <Field label="Badge">
                <input className={fieldClass} required maxLength={160} value={promotionForm.badge} onChange={(event) => setPromotionForm({ ...promotionForm, badge: event.target.value })} placeholder="Ex. Nouveauté 2026" />
              </Field>
              <Field label="Sur-titre">
                <input className={fieldClass} required maxLength={200} value={promotionForm.eyebrow} onChange={(event) => setPromotionForm({ ...promotionForm, eyebrow: event.target.value })} placeholder="Ex. Sherco / Enduro" />
              </Field>
            </div>
            <Field label="Description" hint="Présentez le produit en quelques phrases.">
              <textarea className={`${fieldClass} min-h-24`} required maxLength={10000} value={promotionForm.description} onChange={(event) => setPromotionForm({ ...promotionForm, description: event.target.value })} />
            </Field>
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">Photo de la promotion</p>
              <ImageFilePicker images={promotionForm.image ? [promotionForm.image] : []} onChange={(images) => setPromotionForm({ ...promotionForm, image: images[0] ?? null })} disabled={busy} />
            </div>
            <Field label="Description de la photo (accessibilité)">
              <input className={fieldClass} required maxLength={255} value={promotionForm.alt} onChange={(event) => setPromotionForm({ ...promotionForm, alt: event.target.value })} />
            </Field>
            <Field label="Points forts" hint="Un point par ligne. Exemple : Suspensions KYB, Freinage Galfer.">
              <textarea className={`${fieldClass} min-h-28`} value={promotionForm.highlightsText} onChange={(event) => setPromotionForm({ ...promotionForm, highlightsText: event.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prix affiché" hint="Le prix est conservé en texte, par exemple « Sur devis ». ">
                <input className={fieldClass} required maxLength={255} value={promotionForm.price} onChange={(event) => setPromotionForm({ ...promotionForm, price: event.target.value })} placeholder="Sur devis" />
              </Field>
              <DisplayOrder value={promotionForm.sortOrder} onChange={(sortOrder) => setPromotionForm({ ...promotionForm, sortOrder })} />
            </div>
            <TargetFields targetPage={promotionForm.targetPage} targetId={promotionForm.targetId} onPageChange={(targetPage) => setPromotionForm({ ...promotionForm, targetPage })} onIdChange={(targetId) => setPromotionForm({ ...promotionForm, targetId })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Début de diffusion (facultatif)">
                <input className={fieldClass} type="datetime-local" value={promotionForm.startsAt} onChange={(event) => setPromotionForm({ ...promotionForm, startsAt: event.target.value })} />
              </Field>
              <Field label="Fin de diffusion (facultatif)">
                <input className={fieldClass} type="datetime-local" value={promotionForm.endsAt} onChange={(event) => setPromotionForm({ ...promotionForm, endsAt: event.target.value })} />
              </Field>
              <Field label="Date de publication (facultative)">
                <input className={fieldClass} type="datetime-local" value={promotionForm.publishedAt} onChange={(event) => setPromotionForm({ ...promotionForm, publishedAt: event.target.value })} />
              </Field>
              <StatusField value={promotionForm.isActive} onChange={(isActive) => setPromotionForm({ ...promotionForm, isActive })} />
            </div>
            <div className="flex flex-wrap gap-3">
              {editingPromotionId && <button type="button" className={buttonSecondary} disabled={busy} onClick={() => { setEditingPromotionId(null); setPromotionForm(emptyPromotion()); }}>Annuler</button>}
              <button className={buttonPrimary} type="submit" disabled={busy}>{busy ? "Enregistrement…" : editingPromotionId ? "Enregistrer la promotion" : "Créer la promotion"}</button>
            </div>
          </form>
        </div>
      )}

      {section === "dealers" && (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="min-w-0 space-y-4">
            <h3 className="font-display text-xl font-bold">Points de vente enregistrés <span className="text-sm font-normal text-black/45 dark:text-white/45">({dealers.length})</span></h3>
            <div className={panelClass}>
              <ul className="divide-y divide-black/10 dark:divide-white/10">
                {dealers.map((item) => (
                  <li key={item.key} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.city} · {item.name}</p>
                      <p className="text-xs text-black/50 dark:text-white/50">{item.kind} · {item.isActive ? "Actif" : "Archivé"}</p>
                      {item.services.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.services.map((service) => (
                            <span key={service} className="border border-black/10 px-1.5 py-0.5 text-[10px] text-black/55 dark:border-white/10 dark:text-white/55">{service}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" className={buttonSecondary} disabled={busy} onClick={() => beginEditDealer(item)}>Modifier</button>
                    {item.isActive && <button type="button" className="min-h-11 px-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" disabled={busy} onClick={() => setArchiveTarget({ type: "dealer", id: item.key, label: `${item.name} · ${item.city}` })}>Archiver</button>}
                  </li>
                ))}
                {dealers.length === 0 && <li className="p-5 text-sm text-black/45 dark:text-white/45">Aucun point de vente enregistré.</li>}
              </ul>
            </div>
          </div>

          <form onSubmit={saveDealer} className={`${panelClass} min-w-0 space-y-5 p-5 sm:p-6`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingDealerKey ? "Modification" : "Nouveau point de vente"}</p>
              <h3 className="mt-1 font-display text-xl font-bold">Fiche revendeur</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville">
                <input className={fieldClass} required maxLength={160} value={dealerForm.city} onChange={(event) => setDealerForm((current) => ({ ...current, city: event.target.value, key: editingDealerKey || current.key ? current.key : slugify(event.target.value) }))} placeholder="Ex. Antananarivo" />
              </Field>
              <Field label="Identifiant stable" hint="Minuscules, chiffres et tirets ; figé après création.">
                <input className={fieldClass} required disabled={Boolean(editingDealerKey)} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} value={dealerForm.key} onChange={(event) => setDealerForm({ ...dealerForm, key: event.target.value.toLowerCase() })} />
              </Field>
              <Field label="Nom du point de vente">
                <input className={fieldClass} required maxLength={200} value={dealerForm.name} onChange={(event) => setDealerForm({ ...dealerForm, name: event.target.value })} placeholder="Ex. Funbike Showroom" />
              </Field>
              <Field label="Type de point de vente">
                <input className={fieldClass} required maxLength={160} value={dealerForm.kind} onChange={(event) => setDealerForm({ ...dealerForm, kind: event.target.value })} placeholder="Ex. Showroom principal" />
              </Field>
              <Field label="Adresse">
                <input className={fieldClass} required maxLength={255} value={dealerForm.address} onChange={(event) => setDealerForm({ ...dealerForm, address: event.target.value })} />
              </Field>
              <Field label="Horaires">
                <input className={fieldClass} required maxLength={255} value={dealerForm.hours} onChange={(event) => setDealerForm({ ...dealerForm, hours: event.target.value })} placeholder="Lun – Sam · 8h30 – 17h30" />
              </Field>
              <Field label="Téléphone">
                <input className={fieldClass} type="tel" required maxLength={80} value={dealerForm.phone} onChange={(event) => setDealerForm({ ...dealerForm, phone: event.target.value })} />
              </Field>
              <Field label="Adresse e-mail">
                <input className={fieldClass} type="email" required maxLength={254} value={dealerForm.email} onChange={(event) => setDealerForm({ ...dealerForm, email: event.target.value })} />
              </Field>
            </div>
            <Field label="Présentation" hint="Courte description affichée sur la page des revendeurs.">
              <textarea className={`${fieldClass} min-h-24`} required maxLength={10000} value={dealerForm.desc} onChange={(event) => setDealerForm({ ...dealerForm, desc: event.target.value })} />
            </Field>
            <Field label="Libellé utilisé par l’assistant du site (facultatif)">
              <input className={fieldClass} maxLength={255} value={dealerForm.assistantLabel} onChange={(event) => setDealerForm({ ...dealerForm, assistantLabel: event.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" hint="Valeur entre −90 et 90.">
                <input className={fieldClass} type="number" min={-90} max={90} step="any" required value={dealerForm.lat} onChange={(event) => setDealerForm({ ...dealerForm, lat: event.target.value })} placeholder="Ex. -18.8792" />
              </Field>
              <Field label="Longitude" hint="Valeur entre −180 et 180.">
                <input className={fieldClass} type="number" min={-180} max={180} step="any" required value={dealerForm.lon} onChange={(event) => setDealerForm({ ...dealerForm, lon: event.target.value })} placeholder="Ex. 47.5079" />
              </Field>
            </div>
            <Field label="Services proposés" hint="Ajoutez-les un par un (ex. Atelier, Essais, Livraison). Ils s’affichent en pastilles sur la page des revendeurs.">
              <div className="flex gap-2">
                <input
                  className={fieldClass}
                  maxLength={160}
                  value={dealerForm.serviceDraft}
                  placeholder="Ex. Atelier"
                  onChange={(event) => setDealerForm({ ...dealerForm, serviceDraft: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addDealerService();
                    }
                  }}
                />
                <button type="button" className={buttonSecondary} onClick={addDealerService}>Ajouter</button>
              </div>
              {dealerForm.services.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {dealerForm.services.map((service, index) => (
                    <li key={`${service}-${index}`} className="inline-flex items-center gap-1.5 border border-black/15 bg-black/[0.03] px-2 py-1 text-[11px] font-medium text-black/70 dark:border-white/15 dark:bg-white/[0.05] dark:text-white/70">
                      {service}
                      <button
                        type="button"
                        aria-label={`Retirer le service ${service}`}
                        className="grid h-4 w-4 place-items-center rounded-full text-black/45 transition hover:bg-black/10 hover:text-black dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
                        onClick={() => setDealerForm((current) => ({ ...current, services: current.services.filter((_, itemIndex) => itemIndex !== index) }))}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-black/45 dark:text-white/45">Aucun service ajouté pour l’instant.</p>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <DisplayOrder value={dealerForm.sortOrder} onChange={(sortOrder) => setDealerForm({ ...dealerForm, sortOrder })} />
              <StatusField value={dealerForm.isActive} onChange={(isActive) => setDealerForm({ ...dealerForm, isActive })} />
            </div>
            <div className="flex flex-wrap gap-3">
              {editingDealerKey && <button type="button" className={buttonSecondary} disabled={busy} onClick={() => { setEditingDealerKey(null); setDealerForm(emptyDealer()); }}>Annuler</button>}
              <button className={buttonPrimary} type="submit" disabled={busy}>{busy ? "Enregistrement…" : editingDealerKey ? "Enregistrer le point de vente" : "Créer le point de vente"}</button>
            </div>
          </form>
        </div>
      )}

      {archiveTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setArchiveTarget(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-content-archive-title"
            aria-describedby="site-content-archive-description"
            className="w-full max-w-md border border-black/10 bg-white p-6 text-[#171816] shadow-2xl dark:border-white/10 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Confirmation</p>
            <h2 id="site-content-archive-title" className="mt-2 font-display text-xl font-bold">Confirmer l’archivage ?</h2>
            <p id="site-content-archive-description" className="mt-2 text-sm text-black/60 dark:text-white/60">
              Archiver « <strong>{archiveTarget.label}</strong> » ? Ce contenu sera retiré du site public, sans supprimer son historique.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" autoFocus className={buttonSecondary} disabled={busy} onClick={() => setArchiveTarget(null)}>Non</button>
              <button type="button" className={buttonPrimary} disabled={busy} onClick={() => void confirmArchive()}>{busy ? "Archivage…" : "Oui, archiver"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

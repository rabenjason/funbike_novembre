import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import ImageFilePicker, { type ImageSelection } from "./ImageFilePicker";
import { content } from "../constants";
import { announcePublicCatalogChange, graphqlRequest, type PublicHomepageEditorialBanner, type PublicHomepageHeroCopy } from "../lib/graphqlClient";
import { deleteUploadedImages, uploadImage } from "../lib/imageUploads";

type HeroCopyForm = Omit<
  PublicHomepageHeroCopy,
  "id" | "usages" | "newArrivalsEyebrow" | "newArrivalsTitle" | "newArrivalsDescription"
> & {
  usagesText: string;
  newArrivalsEyebrow: string;
  newArrivalsTitle: string;
  newArrivalsDescription: string;
};
type EditorialBannerForm = Omit<PublicHomepageEditorialBanner, "image"> & { image: ImageSelection | null };
type AdminHeroData = {
  adminHomepageHeroCopy: PublicHomepageHeroCopy | null;
  adminHomepageEditorialBanners: PublicHomepageEditorialBanner[];
};

const panelClass = "border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#1c1d1a]";
const fieldClass = "w-full min-w-0 border border-black/15 bg-white px-3 py-2.5 text-sm leading-5 text-[#171816] outline-none transition placeholder:text-black/35 focus:border-[#c49d00] focus:ring-2 focus:ring-[#ffd100]/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] dark:placeholder:text-white/35";
const buttonPrimary = "inline-flex min-h-11 items-center justify-center gap-2 bg-[#ffd100] px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#171816] shadow-sm transition hover:bg-[#ffe36b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c49d00] disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary = "inline-flex min-h-11 items-center justify-center gap-2 border border-black/15 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-[#171816] transition hover:border-[#c49d00] hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c49d00] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] dark:hover:bg-white/[0.04]";
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

const ADMIN_HOMEPAGE_HERO_QUERY = `
  query AdminHomepageHeroes {
    adminHomepageHeroCopy {
      id localisation titleLine1 titleLine2 description sloganPrefix usages
      catalogButton featuredLabel year chooseModelLabel displayModelLabel
      newArrivalsEyebrow newArrivalsTitle newArrivalsDescription
    }
    adminHomepageEditorialBanners {
      id eyebrow titleLine1 titleLine2 description image alt buttonText
      targetPage targetId isActive sortOrder
    }
  }
`;

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

function imageFromUrl(url: string, id: string): ImageSelection {
  return { id, url, previewUrl: url, name: "Photo actuelle" };
}

function heroCopyForm(value: PublicHomepageHeroCopy | null): HeroCopyForm {
  if (value) {
    const { id: _id, usages, ...copy } = value;
    return {
      ...copy,
      usagesText: usages.join("\n"),
      newArrivalsEyebrow: value.newArrivalsEyebrow || content.accueil.nouveautes.surTitre,
      newArrivalsTitle: value.newArrivalsTitle || content.accueil.nouveautes.titre,
      newArrivalsDescription: value.newArrivalsDescription || content.accueil.nouveautes.description,
    };
  }
  const fallback = content.accueil.hero;
  return {
    localisation: fallback.localisation,
    titleLine1: fallback.titreLigne1,
    titleLine2: fallback.titreLigne2,
    description: fallback.description,
    sloganPrefix: fallback.sloganPrefix,
    usagesText: fallback.usages.join("\n"),
    catalogButton: fallback.boutonCatalogue,
    featuredLabel: fallback.aLaUne,
    year: fallback.annee,
    chooseModelLabel: fallback.choisirModele,
    displayModelLabel: fallback.afficherModele,
    newArrivalsEyebrow: content.accueil.nouveautes.surTitre,
    newArrivalsTitle: content.accueil.nouveautes.titre,
    newArrivalsDescription: content.accueil.nouveautes.description,
  };
}

function emptyEditorialBanner(): EditorialBannerForm {
  return {
    id: "",
    eyebrow: "",
    titleLine1: "",
    titleLine2: "",
    description: "",
    image: null,
    alt: "",
    buttonText: "",
    targetPage: "motos",
    targetId: "",
    isActive: true,
    sortOrder: 0,
  };
}

function shercoStarterBanner(): EditorialBannerForm {
  const legacy = content.accueil.sherco;
  return {
    id: "sherco-50cc",
    eyebrow: legacy.surTitre,
    titleLine1: legacy.titreLigne1,
    titleLine2: legacy.titreLigne2,
    description: legacy.description,
    image: imageFromUrl("https://www.sherco.com/wp-content/uploads/SHERCO50ccV2-32.jpg", "legacy-sherco-image"),
    alt: legacy.imageAlt,
    buttonText: legacy.bouton,
    targetPage: "motos",
    targetId: "sherco",
    isActive: true,
    sortOrder: 0,
  };
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[11px] font-bold uppercase leading-4 tracking-[0.11em] text-black/60 dark:text-white/60">{label}</span>
      {children}
      {hint && <span className="block text-xs leading-5 text-black/45 dark:text-white/45">{hint}</span>}
    </label>
  );
}

function DisplayOrder({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <Field label="Position dans la liste" hint="0 = en premier ; un nombre plus grand l’affiche plus loin.">
      <input className={fieldClass} type="number" min={0} max={100000} step={1} required value={value} onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))} />
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

function TargetFields({ value, onChange }: {
  value: Pick<EditorialBannerForm, "targetPage" | "targetId">;
  onChange: (field: "targetPage" | "targetId", nextValue: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Page à ouvrir au clic">
        <select className={fieldClass} required value={value.targetPage} onChange={(event) => onChange("targetPage", event.target.value)}>
          {destinations.map((destination) => <option key={destination.page} value={destination.page}>{destination.label}</option>)}
          {value.targetPage && !destinations.some((destination) => destination.page === value.targetPage) && <option value={value.targetPage}>Valeur actuelle : {value.targetPage}</option>}
        </select>
      </Field>
      <Field label="Identifiant de destination" hint="Pour une fiche produit, utilisez son identifiant public, pas une référence commerciale.">
        <input className={fieldClass} required maxLength={160} value={value.targetId} onChange={(event) => onChange("targetId", event.target.value)} placeholder="Ex. sherco-sef-250" />
      </Field>
    </div>
  );
}

export default function HomepageHeroAdmin({ token }: { token: string }) {
  const [data, setData] = useState<AdminHeroData | null>(null);
  const [heroForm, setHeroForm] = useState<HeroCopyForm>(() => heroCopyForm(null));
  const [bannerForm, setBannerForm] = useState<EditorialBannerForm>(emptyEditorialBanner);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PublicHomepageEditorialBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void graphqlRequest<AdminHeroData>(ADMIN_HOMEPAGE_HERO_QUERY, undefined, token)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setHeroForm(heroCopyForm(result.adminHomepageHeroCopy));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Impossible de charger les héros de l’accueil.");
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

  function updateHeroField(field: keyof HeroCopyForm, value: string) {
    setHeroForm((current) => ({ ...current, [field]: value }));
  }

  function beginEditBanner(banner: PublicHomepageEditorialBanner) {
    setEditingBannerId(banner.id);
    setBannerForm({
      ...banner,
      image: imageFromUrl(banner.image, `editorial-banner-${banner.id}-image`),
    });
  }

  async function saveHeroCopy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setNotice("");
    const usages = splitLines(heroForm.usagesText);
    if (usages.length === 0) {
      setError("Ajoutez au moins un usage pour le slogan animé du hero.");
      setBusy(false);
      return;
    }
    try {
      const input = {
        localisation: heroForm.localisation.trim(),
        titleLine1: heroForm.titleLine1.trim(),
        titleLine2: heroForm.titleLine2.trim(),
        description: heroForm.description.trim(),
        sloganPrefix: heroForm.sloganPrefix.trim(),
        usages,
        catalogButton: heroForm.catalogButton.trim(),
        featuredLabel: heroForm.featuredLabel.trim(),
        year: heroForm.year.trim(),
        chooseModelLabel: heroForm.chooseModelLabel.trim(),
        displayModelLabel: heroForm.displayModelLabel.trim(),
        newArrivalsEyebrow: heroForm.newArrivalsEyebrow.trim(),
        newArrivalsTitle: heroForm.newArrivalsTitle.trim(),
        newArrivalsDescription: heroForm.newArrivalsDescription.trim(),
      };
      await graphqlRequest(
        `mutation SaveHomepageHeroCopy($input: HomepageHeroCopyInput!) {
          saveHomepageHeroCopy(input: $input) { id titleLine1 titleLine2 }
        }`,
        { input },
        token,
      );
      setNotice("Textes du hero principal enregistrés.");
      announcePublicCatalogChange();
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer les textes du hero.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEditorialBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !bannerForm.image) {
      setError("Sélectionnez une photo pour cette bannière depuis votre ordinateur.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const previousUrls = bannerForm.image.url ? [bannerForm.image.url] : [];
    const uploaded: string[] = [];
    try {
      if (bannerForm.image.file) setNotice("Importation de la photo en cours…");
      const image = bannerForm.image.file
        ? await uploadImage(bannerForm.image.file, token).then((url) => { uploaded.push(url); return url; })
        : bannerForm.image.url;
      if (!image) throw new Error("Sélectionnez une photo avant d’enregistrer.");
      const input = {
        id: bannerForm.id.trim(),
        eyebrow: bannerForm.eyebrow.trim(),
        titleLine1: bannerForm.titleLine1.trim(),
        titleLine2: bannerForm.titleLine2.trim(),
        description: bannerForm.description.trim(),
        image,
        alt: bannerForm.alt.trim(),
        buttonText: bannerForm.buttonText.trim(),
        targetPage: bannerForm.targetPage,
        targetId: bannerForm.targetId.trim(),
        isActive: bannerForm.isActive,
        sortOrder: bannerForm.sortOrder,
      };
      if (editingBannerId) {
        await graphqlRequest(
          `mutation UpdateHomepageEditorialBanner($id: ID!, $input: HomepageEditorialBannerInput!) {
            updateHomepageEditorialBanner(id: $id, input: $input) { id eyebrow }
          }`,
          { id: editingBannerId, input },
          token,
        );
        setNotice("Bannière éditoriale mise à jour.");
      } else {
        await graphqlRequest(
          `mutation CreateHomepageEditorialBanner($input: HomepageEditorialBannerInput!) {
            createHomepageEditorialBanner(input: $input) { id eyebrow }
          }`,
          { input },
          token,
        );
        setNotice("Bannière éditoriale créée.");
      }
      const removed = previousUrls.filter((url) => url.startsWith("/uploads/") && url !== image);
      if (removed.length > 0) void deleteUploadedImages(removed, token).catch(() => undefined);
      announcePublicCatalogChange();
      setEditingBannerId(null);
      setBannerForm(emptyEditorialBanner());
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      if (uploaded.length > 0) void deleteUploadedImages(uploaded, token).catch(() => undefined);
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la bannière éditoriale.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmArchive() {
    if (!token || !archiveTarget) return;
    setBusy(true);
    setError("");
    try {
      await graphqlRequest(
        "mutation ArchiveHomepageEditorialBanner($id: ID!) { deleteHomepageEditorialBanner(id: $id) }",
        { id: archiveTarget.id },
        token,
      );
      if (editingBannerId === archiveTarget.id) {
        setEditingBannerId(null);
        setBannerForm(emptyEditorialBanner());
      }
      setArchiveTarget(null);
      setNotice("Bannière archivée et retirée de la page publique.");
      announcePublicCatalogChange();
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’archiver cette bannière.");
    } finally {
      setBusy(false);
    }
  }

  const banners = data?.adminHomepageEditorialBanners ?? [];

  return (
    <section className="min-w-0 space-y-6">
      {(error || notice) && (
        <div className={`border-l-4 px-4 py-3.5 text-sm leading-6 ${error ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "border-[#c49d00] bg-yellow-50 text-[#5f4b00] dark:bg-yellow-950/20 dark:text-yellow-100"}`} role={error ? "alert" : "status"}>
          {error || notice}
        </div>
      )}
      {loading && <p className="text-xs text-black/45 dark:text-white/45" role="status">Chargement des contenus du hero…</p>}

      <form onSubmit={saveHeroCopy} className={`${panelClass} space-y-5 p-5 sm:p-6`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">Hero principal · texte</p>
          <h3 className="mt-1 font-display text-xl font-bold">Titres, description et boutons</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55 dark:text-white/55">
            Ces textes apparaissent sur le grand carrousel du haut. Les photos et les diapositives se règlent dans l’onglet « Diapositives du hero ».
            {data?.adminHomepageHeroCopy ? "" : " Aucun réglage n’a encore été enregistré : les valeurs actuelles servent de point de départ et ne sont pas insérées en base avant votre enregistrement."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ligne de localisation">
            <input className={fieldClass} required maxLength={255} value={heroForm.localisation} onChange={(event) => updateHeroField("localisation", event.target.value)} />
          </Field>
          <Field label="Préfixe du slogan animé">
            <input className={fieldClass} required maxLength={255} value={heroForm.sloganPrefix} onChange={(event) => updateHeroField("sloganPrefix", event.target.value)} />
          </Field>
          <Field label="Titre · première ligne">
            <input className={fieldClass} required maxLength={255} value={heroForm.titleLine1} onChange={(event) => updateHeroField("titleLine1", event.target.value)} />
          </Field>
          <Field label="Titre · deuxième ligne">
            <input className={fieldClass} required maxLength={255} value={heroForm.titleLine2} onChange={(event) => updateHeroField("titleLine2", event.target.value)} />
          </Field>
        </div>
        <Field label="Description du hero">
          <textarea className={`${fieldClass} min-h-24`} required maxLength={10000} value={heroForm.description} onChange={(event) => updateHeroField("description", event.target.value)} />
        </Field>
        <Field label="Usages du slogan animé" hint="Un usage par ligne. Exemples actuels : la ville, le travail, le cross, l’enduro, les voyages et les balades.">
          <textarea className={`${fieldClass} min-h-28`} value={heroForm.usagesText} onChange={(event) => updateHeroField("usagesText", event.target.value)} placeholder={"la ville\nle travail\nl'enduro"} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Texte du bouton catalogue">
            <input className={fieldClass} required maxLength={160} value={heroForm.catalogButton} onChange={(event) => updateHeroField("catalogButton", event.target.value)} />
          </Field>
          <Field label="Libellé « À la une »">
            <input className={fieldClass} required maxLength={160} value={heroForm.featuredLabel} onChange={(event) => updateHeroField("featuredLabel", event.target.value)} />
          </Field>
          <Field label="Année ou libellé">
            <input className={fieldClass} required maxLength={40} value={heroForm.year} onChange={(event) => updateHeroField("year", event.target.value)} />
          </Field>
          <Field label="Libellé accessible du carrousel">
            <input className={fieldClass} required maxLength={255} value={heroForm.chooseModelLabel} onChange={(event) => updateHeroField("chooseModelLabel", event.target.value)} />
          </Field>
          <Field label="Libellé des boutons de diapositive">
            <input className={fieldClass} required maxLength={160} value={heroForm.displayModelLabel} onChange={(event) => updateHeroField("displayModelLabel", event.target.value)} />
          </Field>
        </div>
        <div className="space-y-4 border-t border-black/10 pt-5 dark:border-white/10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">Section « Nouveautés / Arrivages »</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-black/55 dark:text-white/55">
              Les textes affichés au-dessus des produits nouveautés de l’accueil. Laissez un champ vide pour réutiliser le texte par défaut.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sur-titre de la section">
              <input className={fieldClass} maxLength={255} value={heroForm.newArrivalsEyebrow} onChange={(event) => updateHeroField("newArrivalsEyebrow", event.target.value)} placeholder={content.accueil.nouveautes.surTitre} />
            </Field>
            <Field label="Titre de la section">
              <input className={fieldClass} maxLength={255} value={heroForm.newArrivalsTitle} onChange={(event) => updateHeroField("newArrivalsTitle", event.target.value)} placeholder={content.accueil.nouveautes.titre} />
            </Field>
          </div>
          <Field label="Description de la section">
            <textarea className={`${fieldClass} min-h-20`} maxLength={10000} value={heroForm.newArrivalsDescription} onChange={(event) => updateHeroField("newArrivalsDescription", event.target.value)} placeholder={content.accueil.nouveautes.description} />
          </Field>
        </div>
        <button className={buttonPrimary} type="submit" disabled={busy || loading}>{busy ? "Enregistrement…" : "Enregistrer les textes du hero"}</button>
      </form>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">Autres grands visuels de l’accueil</p>
            <h3 className="mt-1 font-display text-xl font-bold">Bannières éditoriales <span className="text-sm font-normal text-black/45 dark:text-white/45">({banners.length})</span></h3>
            <p className="mt-2 text-sm leading-6 text-black/55 dark:text-white/55">Chaque bannière possède sa photo, son texte, son bouton et sa destination. La bannière Sherco actuelle peut être recréée ici puis gérée comme les autres.</p>
          </div>
          <div className={panelClass}>
            <ul className="divide-y divide-black/10 dark:divide-white/10">
              {banners.map((banner) => (
                <li key={banner.id} className="flex flex-wrap items-center gap-3 p-4">
                  <img src={banner.image} alt="" className="h-16 w-24 shrink-0 bg-black/[0.03] object-cover dark:bg-white/[0.04]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{banner.titleLine1} {banner.titleLine2}</p>
                    <p className="text-xs text-black/50 dark:text-white/50">{banner.eyebrow} · {banner.isActive ? "Active" : "Archivée"}</p>
                  </div>
                  <button type="button" className={buttonSecondary} disabled={busy} onClick={() => beginEditBanner(banner)}>Modifier</button>
                  {banner.isActive && <button type="button" className="min-h-11 px-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" disabled={busy} onClick={() => setArchiveTarget(banner)}>Archiver</button>}
                </li>
              ))}
              {banners.length === 0 && (
                <li className="space-y-3 p-5">
                  <p className="text-sm text-black/50 dark:text-white/50">Aucune bannière éditoriale enregistrée. Chargez le contenu Sherco déjà affiché pour le modifier, puis enregistrez-le comme contenu administrable.</p>
                  <button type="button" className={buttonSecondary} disabled={busy} onClick={() => { setEditingBannerId(null); setBannerForm(shercoStarterBanner()); }}>Charger le contenu actuel de Sherco</button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <form onSubmit={saveEditorialBanner} className={`${panelClass} min-w-0 space-y-5 p-5 sm:p-6`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingBannerId ? "Modification" : "Nouvelle bannière éditoriale"}</p>
            <h3 className="mt-1 font-display text-xl font-bold">Photo et texte du visuel</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre de repérage" hint="Utilisé pour proposer automatiquement un identifiant stable.">
              <input className={fieldClass} required maxLength={255} value={bannerForm.titleLine1} onChange={(event) => setBannerForm((current) => ({ ...current, titleLine1: event.target.value, id: editingBannerId || current.id ? current.id : slugify(event.target.value) }))} />
            </Field>
            <Field label="Identifiant stable" hint="Minuscules, chiffres et tirets ; figé après création.">
              <input className={fieldClass} required disabled={Boolean(editingBannerId)} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={bannerForm.id} onChange={(event) => setBannerForm((current) => ({ ...current, id: event.target.value.toLowerCase() }))} />
            </Field>
          </div>
          <Field label="Sur-titre">
            <input className={fieldClass} required maxLength={255} value={bannerForm.eyebrow} onChange={(event) => setBannerForm({ ...bannerForm, eyebrow: event.target.value })} placeholder="Ex. L’univers Sherco · À partir de 50 cc" />
          </Field>
          <Field label="Titre · deuxième ligne">
            <input className={fieldClass} required maxLength={255} value={bannerForm.titleLine2} onChange={(event) => setBannerForm({ ...bannerForm, titleLine2: event.target.value })} />
          </Field>
          <Field label="Description">
            <textarea className={`${fieldClass} min-h-24`} required maxLength={10000} value={bannerForm.description} onChange={(event) => setBannerForm({ ...bannerForm, description: event.target.value })} />
          </Field>
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">Photo grand format</p>
            <ImageFilePicker images={bannerForm.image ? [bannerForm.image] : []} onChange={(images) => setBannerForm({ ...bannerForm, image: images[0] ?? null })} disabled={busy} />
          </div>
          <Field label="Description de la photo (accessibilité)">
            <input className={fieldClass} required maxLength={255} value={bannerForm.alt} onChange={(event) => setBannerForm({ ...bannerForm, alt: event.target.value })} />
          </Field>
          <Field label="Texte du bouton">
            <input className={fieldClass} required maxLength={160} value={bannerForm.buttonText} onChange={(event) => setBannerForm({ ...bannerForm, buttonText: event.target.value })} />
          </Field>
          <TargetFields value={bannerForm} onChange={(field, value) => setBannerForm({ ...bannerForm, [field]: value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <DisplayOrder value={bannerForm.sortOrder} onChange={(sortOrder) => setBannerForm({ ...bannerForm, sortOrder })} />
            <StatusField value={bannerForm.isActive} onChange={(isActive) => setBannerForm({ ...bannerForm, isActive })} />
          </div>
          <div className="flex flex-wrap gap-3">
            {editingBannerId && <button type="button" className={buttonSecondary} disabled={busy} onClick={() => { setEditingBannerId(null); setBannerForm(emptyEditorialBanner()); }}>Annuler</button>}
            <button className={buttonPrimary} type="submit" disabled={busy}>{busy ? "Enregistrement…" : editingBannerId ? "Enregistrer la bannière" : "Créer la bannière"}</button>
          </div>
        </form>
      </div>

      {archiveTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setArchiveTarget(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="homepage-hero-archive-title" aria-describedby="homepage-hero-archive-description" className="w-full max-w-md border border-black/10 bg-white p-6 text-[#171816] shadow-2xl dark:border-white/10 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Confirmation</p>
            <h2 id="homepage-hero-archive-title" className="mt-2 font-display text-xl font-bold">Confirmer l’archivage ?</h2>
            <p id="homepage-hero-archive-description" className="mt-2 text-sm text-black/60 dark:text-white/60">Archiver cette bannière ? Elle sera retirée de l’accueil sans supprimer son historique.</p>
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

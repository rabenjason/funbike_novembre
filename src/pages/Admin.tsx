import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import ImageFilePicker, { type ImageSelection } from "../components/ImageFilePicker";
import BrandSectionAssociationsEditor, { type BrandSectionFormValue } from "../components/BrandSectionAssociationsEditor";
import SiteContentAdmin from "../components/SiteContentAdmin";
import { deleteUploadedImages, uploadImage } from "../lib/imageUploads";
import { announcePublicCatalogChange, graphqlRequest } from "../lib/graphqlClient";

type AdminUser = { id: string; email: string; role: string };
type ProductKind = "MOTORCYCLE" | "SPARE_PART" | "EQUIPMENT" | "ACCESSORY";
type ProductKindFilter = ProductKind | "ALL";
type ProductStatusFilter = "DRAFT" | "PUBLISHED" | "ALL";
type LookupKind = "FAMILY" | "SUBFAMILY" | "PART_TYPE" | "EQUIPMENT_TYPE" | "ACCESSORY_TYPE" | "CATEGORY" | "USAGE" | "CHARACTERISTIC";
type Lookup = { id: string; name: string; family?: { id: string; name: string } | null; unit?: string | null; applicableTo?: string | null; isActive: boolean; sortOrder?: number | null };
type BrandSectionRecord = {
  section: string;
  order: number;
  label: string | null;
  routeId: string | null;
  filterable: boolean | null;
  displayMode: string | null;
  homeFeatured: boolean | null;
  footerOrder: number | null;
  footerFeaturedOrder: number | null;
};
type Brand = { id: string; slug: string; name: string; logo?: string | null; logoAlt?: string | null; description?: string | null; isActive: boolean; sortOrder?: number | null; sections?: BrandSectionRecord[] };
type Category = { id: string; title: string; desc: string; src: string; to: string; brand?: string | null; isActive: boolean; sortOrder?: number | null };
type ProductSpec = { characteristic?: { id: string; name: string } | null; label: string; value: string };
type AdminProduct = {
  __typename: "Motorcycle" | "SparePart" | "Equipment" | "Accessory";
  id: string;
  name: string;
  reference?: string | null;
  price?: string | null;
  desc?: string | null;
  status: "DRAFT" | "PUBLISHED";
  brand?: { id: string; name: string } | null;
  subfamily?: { id: string; name: string } | null;
  image?: string | null;
  gallery?: string[] | null;
  family?: { id: string; name: string } | null;
  tag?: string | null;
  alt?: string | null;
  recommendation?: string | null;
  partType?: { id: string; name: string } | null;
  equipmentType?: { id: string; name: string } | null;
  accessoryType?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  universalCompatibility?: boolean | null;
  compatibleBrands?: Array<{ id: string; name: string }>;
  usages?: Array<{ id: string; name: string }>;
  sourceUrl?: string | null;
  specs?: ProductSpec[];
};
type ReferenceData = {
  brands: Brand[];
  families: Lookup[];
  subfamilies: Lookup[];
  partTypes: Lookup[];
  equipmentTypes: Lookup[];
  accessoryTypes: Lookup[];
  accessoryCategories: Lookup[];
  productUsages: Lookup[];
  characteristicDefinitions: Lookup[];
  adminBrands: Brand[];
  adminCategories: Category[];
};
type ProductForm = {
  id?: string;
  kind: ProductKind;
  name: string;
  reference: string;
  price: string;
  desc: string;
  brandId: string;
  subfamilyId: string;
  familyId: string;
  tag: string;
  alt: string;
  recommendation: string;
  partTypeId: string;
  equipmentTypeId: string;
  accessoryTypeId: string;
  categoryId: string;
  sourceUrl: string;
  universalCompatibility: string;
  compatibleBrandIds: string[];
  usageIds: string[];
  imageSelections: ImageSelection[];
  primaryImageId: string | null;
  specs: Array<{ characteristicId: string; value: string }>;
};
type LookupForm = { name: string; familyId: string; unit: string; applicableTo: string; sortOrder: string; isActive: boolean };
type BrandForm = { slug: string; name: string; logoImage: ImageSelection | null; logoAlt: string; description: string; sortOrder: string; isActive: boolean; sections: BrandSectionFormValue[] };
type CategoryForm = { title: string; desc: string; image: ImageSelection | null; to: string; brand: string; sortOrder: string; isActive: boolean };
type Tab = "products" | "classifications" | "brands" | "categories" | "siteContent" | "security";
type ArchiveRequest =
  | { type: "lookup"; id: string; label: string; lookupKind: LookupKind; successMessage: string }
  | { type: "brand"; id: string; label: string; successMessage: string }
  | { type: "category"; id: string; label: string; successMessage: string };

const LOOKUP_KINDS: Array<{ key: LookupKind; label: string }> = [
  { key: "FAMILY", label: "Catégories de motos" },
  { key: "SUBFAMILY", label: "Gammes et modèles" },
  { key: "PART_TYPE", label: "Types de pièces" },
  { key: "EQUIPMENT_TYPE", label: "Types d’équipement" },
  { key: "ACCESSORY_TYPE", label: "Types d’accessoires" },
  { key: "CATEGORY", label: "Catégories de produits (pièces & équipements)" },
  { key: "USAGE", label: "Usages possibles" },
  { key: "CHARACTERISTIC", label: "Caractéristiques à afficher" },
];

const PRODUCT_NAME_EXAMPLES: Record<ProductKind, string> = {
  MOTORCYCLE: "Ex. TVS Apache 200 4V",
  SPARE_PART: "Ex. Kit chaîne enduro Sherco",
  EQUIPMENT: "Ex. Casque intégral TVS Raider",
  ACCESSORY: "Ex. Protection moteur Sherco SEF 250",
};

const PRODUCT_DESCRIPTION_EXAMPLES: Record<ProductKind, string> = {
  MOTORCYCLE: "Ex. Moto polyvalente pour la ville et les trajets du quotidien.",
  SPARE_PART: "Ex. Kit chaîne compatible avec une moto Sherco SEF 250.",
  EQUIPMENT: "Ex. Casque intégral TVS confortable, adapté à la route.",
  ACCESSORY: "Ex. Protection moteur pour Sherco SEF 250, à vérifier selon l’année.",
};

const LOOKUP_NAME_EXAMPLES: Record<LookupKind, string> = {
  FAMILY: "Ex. Urbain ou Off-road",
  SUBFAMILY: "Ex. Sherco SEF 250",
  PART_TYPE: "Ex. Transmission (kit chaîne)",
  EQUIPMENT_TYPE: "Ex. Casque",
  ACCESSORY_TYPE: "Ex. Protection moteur",
  CATEGORY: "Ex. Freinage",
  USAGE: "Ex. Tout-terrain",
  CHARACTERISTIC: "Ex. Cylindrée",
};

const CHARACTERISTIC_SCOPES = [
  { value: "MOTORCYCLE", label: "Moto" },
  { value: "SPARE_PART", label: "Pièce détachée" },
  { value: "EQUIPMENT", label: "Équipement pilote" },
  { value: "ACCESSORY", label: "Accessoire moto" },
] as const;

const CATEGORY_DESTINATIONS = [
  { page: "home", label: "Accueil" },
  { page: "catalogue", label: "Tout le catalogue" },
  { page: "motos", label: "Motos" },
  { page: "equipements", label: "Équipements pilote" },
  { page: "spares", label: "Pièces détachées" },
  { page: "revendeurs", label: "Points de vente" },
  { page: "contact", label: "Contact" },
] as const;

const ADMIN_PAGE_SIZE = 20;

const REFERENCE_DATA_QUERY = `
  query AdminReferenceData {
    brands { id slug name isActive sortOrder }
    families { id name isActive sortOrder }
    subfamilies { id name family { id name } isActive sortOrder }
    partTypes { id name isActive sortOrder }
    equipmentTypes { id name isActive sortOrder }
    accessoryTypes { id name isActive sortOrder }
    accessoryCategories { id name isActive sortOrder }
    productUsages { id name isActive sortOrder }
    characteristicDefinitions { id name unit applicableTo isActive sortOrder }
    adminBrands {
      id slug name logo logoAlt description isActive sortOrder
      sections { section order label routeId filterable displayMode homeFeatured footerOrder footerFeaturedOrder }
    }
    adminCategories { id title desc src to brand isActive sortOrder }
  }
`;

const ADMIN_PRODUCTS_PAGE_QUERY = `
  query AdminProductsPage($status: ProductStatus, $kind: ProductKind, $brandId: ID, $search: String, $limit: Int, $offset: Int) {
    adminProductPage(status: $status, kind: $kind, brandId: $brandId, search: $search, limit: $limit, offset: $offset) {
      totalCount
      items {
        __typename id name reference price desc status image gallery
        brand { id name }
        subfamily { id name }
        ... on Motorcycle {
          family { id name }
          tag alt recommendation
          specs { characteristic { id name } label value }
        }
        ... on SparePart {
          partType { id name }
          category { id name }
          compatibleBrands { id name }
          universalCompatibility sourceUrl
          specs { characteristic { id name } label value }
        }
        ... on Equipment {
          equipmentType { id name }
          category { id name }
          usages { id name }
          sourceUrl
          specs { characteristic { id name } label value }
        }
        ... on Accessory {
          accessoryType { id name }
          category { id name }
          usages { id name }
          sourceUrl
          specs { characteristic { id name } label value }
        }
      }
    }
  }
`;

const emptyProductForm = (): ProductForm => ({
  kind: "MOTORCYCLE",
  name: "",
  reference: "",
  price: "",
  desc: "",
  brandId: "",
  subfamilyId: "",
  familyId: "",
  tag: "",
  alt: "",
  recommendation: "",
  partTypeId: "",
  equipmentTypeId: "",
  accessoryTypeId: "",
  categoryId: "",
  sourceUrl: "",
  universalCompatibility: "",
  compatibleBrandIds: [],
  usageIds: [],
  imageSelections: [],
  primaryImageId: null,
  specs: [],
});

const emptyLookupForm = (): LookupForm => ({ name: "", familyId: "", unit: "", applicableTo: "", sortOrder: "1", isActive: true });
const emptyBrandForm = (): BrandForm => ({ slug: "", name: "", logoImage: null, logoAlt: "", description: "", sortOrder: "0", isActive: true, sections: [] });
const emptyCategoryForm = (): CategoryForm => ({ title: "", desc: "", image: null, to: "", brand: "", sortOrder: "0", isActive: true });

const MAX_DISPLAY_ORDER = 100000;
const panelClass = "border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#1c1d1a]";
const fieldClass = "w-full min-w-0 border border-black/15 bg-white px-3 py-2.5 text-sm leading-5 text-[#171816] outline-none transition placeholder:text-black/35 focus:border-[#c49d00] focus:ring-2 focus:ring-[#ffd100]/20 dark:border-white/15 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] dark:placeholder:text-white/35";
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

function CheckboxGroupField({ label, hint, items, selectedIds, onChange, emptyLabel }: {
  label: string;
  hint?: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  emptyLabel: string;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">{label}</legend>
      {hint && <p className="text-xs leading-5 text-black/45 dark:text-white/45">{hint}</p>}
      {items.length === 0 ? (
        <p className="border border-dashed border-black/15 px-3 py-3 text-xs text-black/45 dark:border-white/15 dark:text-white/45">{emptyLabel}</p>
      ) : (
        <div className="grid max-h-56 gap-1.5 overflow-y-auto border border-black/15 p-3 sm:grid-cols-2 dark:border-white/15">
          {items.map((item) => (
            <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 px-2 text-sm leading-5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={(event) => onChange(event.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id))}
                className="accent-[#c49d00]"
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function formatDisplayOrder(value: number | null | undefined): string {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_DISPLAY_ORDER
    ? String(value)
    : "0";
}

function parseDisplayOrder(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_DISPLAY_ORDER ? parsed : 0;
}

const MAX_LIST_POSITION = MAX_DISPLAY_ORDER + 1;

function parseLookupPosition(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_LIST_POSITION ? parsed - 1 : 0;
}

function lookupPosition(row: Lookup, rows: Lookup[], kind: LookupKind): number {
  const siblings = kind === "SUBFAMILY"
    ? rows.filter((candidate) => candidate.family?.id === row.family?.id)
    : rows;
  const index = siblings.findIndex((candidate) => candidate.id === row.id);
  return index < 0 ? siblings.length + 1 : index + 1;
}

function nextLookupPosition(rows: Lookup[], kind: LookupKind, familyId: string): number {
  const siblings = kind === "SUBFAMILY"
    ? rows.filter((row) => row.family?.id === familyId)
    : rows;
  return siblings.length + 1;
}

function LookupPositionField({ value, onChange, hint }: { value: string; onChange: (value: string) => void; hint: string }) {
  return (
    <Field label="Position dans la liste" hint={hint}>
      <input
        className={fieldClass}
        type="number"
        min={1}
        max={MAX_LIST_POSITION}
        step={1}
        inputMode="numeric"
        required
        placeholder="Ex. 1"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === "" || (/^\d+$/.test(nextValue) && Number(nextValue) <= MAX_LIST_POSITION)) onChange(nextValue);
        }}
      />
    </Field>
  );
}

function DisplayOrderField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field label="Position dans la liste" hint="0 = en premier ; un nombre plus grand l’affiche plus loin.">
      <input
        className={fieldClass}
        type="number"
        min={0}
        max={MAX_DISPLAY_ORDER}
        step={1}
        inputMode="numeric"
        placeholder="Ex. 0"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === "" || (/^\d+$/.test(nextValue) && Number(nextValue) <= MAX_DISPLAY_ORDER)) onChange(nextValue);
        }}
      />
    </Field>
  );
}

function productKindLabel(kind: AdminProduct["__typename"] | ProductKind): string {
  switch (kind) {
    case "Motorcycle":
    case "MOTORCYCLE": return "Moto";
    case "SparePart":
    case "SPARE_PART": return "Pièce détachée";
    case "Equipment":
    case "EQUIPMENT": return "Équipement";
    case "Accessory":
    case "ACCESSORY": return "Accessoire";
  }
}

function productLoadErrorMessage(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : "Impossible de charger les produits.";
  const normalizedMessage = message.trim().toLocaleLowerCase();
  if (normalizedMessage === "unexpected error" || normalizedMessage === "unexpected error.") {
    return "Le serveur n’a pas pu charger le catalogue. Vérifiez que le backend est à jour et que les migrations MySQL ont été appliquées, puis réessayez.";
  }
  return message;
}

function kindFromTypename(name: AdminProduct["__typename"]): ProductKind {
  const kinds = { Motorcycle: "MOTORCYCLE", SparePart: "SPARE_PART", Equipment: "EQUIPMENT", Accessory: "ACCESSORY" } as const;
  return kinds[name];
}

function characteristicApplies(definition: Lookup, kind: ProductKind): boolean {
  if (!definition.applicableTo?.trim()) return true;
  const scope = definition.applicableTo.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (scope.includes("tous") || scope.includes("all") || scope.includes("produit")) return true;
  const scopes: Record<ProductKind, string[]> = {
    MOTORCYCLE: ["moto", "motorcycle"],
    SPARE_PART: ["piece", "spare"],
    EQUIPMENT: ["equipement", "equipment"],
    ACCESSORY: ["accessoire", "accessory"],
  };
  const knownScopes = Object.values(scopes).flat();
  if (!knownScopes.some((value) => scope.includes(value))) return true;
  return scopes[kind].some((value) => scope.includes(value));
}

function imageFromStoredUrl(url: string, id: string): ImageSelection {
  return { id, url, previewUrl: url, name: "Photo actuelle" };
}

async function resolveImageSelections(
  selections: ImageSelection[],
  accessToken: string,
  newlyUploadedUrls: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const selection of selections) {
    if (selection.file) {
      const url = await uploadImage(selection.file, accessToken);
      newlyUploadedUrls.push(url);
      urls.push(url);
    } else if (selection.url) {
      urls.push(selection.url);
    }
  }
  return urls;
}

function uploadedImagesRemoved(previousUrls: string[], nextUrls: string[]): string[] {
  return previousUrls.filter((url) => url.startsWith("/uploads/") && !nextUrls.includes(url));
}

function cleanupImages(urls: string[], accessToken: string): void {
  if (urls.length > 0) void deleteUploadedImages(urls, accessToken).catch(() => undefined);
}

function formFromProduct(product: AdminProduct): ProductForm {
  const imageSelections = (product.gallery?.length ? product.gallery : product.image ? [product.image] : [])
    .map((url, index) => imageFromStoredUrl(url, `product-${product.id}-${index}`));
  return {
    ...emptyProductForm(),
    id: product.id,
    kind: kindFromTypename(product.__typename),
    name: product.name,
    reference: product.reference ?? "",
    price: product.price ?? "",
    desc: product.desc ?? "",
    brandId: product.brand?.id ?? "",
    subfamilyId: product.subfamily?.id ?? "",
    familyId: product.family?.id ?? "",
    tag: product.tag ?? "",
    alt: product.alt ?? "",
    recommendation: product.recommendation ?? "",
    partTypeId: product.partType?.id ?? "",
    equipmentTypeId: product.equipmentType?.id ?? "",
    accessoryTypeId: product.accessoryType?.id ?? "",
    categoryId: product.category?.id ?? "",
    sourceUrl: product.sourceUrl ?? "",
    universalCompatibility: product.universalCompatibility === null || product.universalCompatibility === undefined
      ? ""
      : String(product.universalCompatibility),
    compatibleBrandIds: product.compatibleBrands?.map((brand) => brand.id) ?? [],
    usageIds: product.usages?.map((usage) => usage.id) ?? [],
    imageSelections,
    primaryImageId: imageSelections.find((image) => image.url === product.image)?.id ?? imageSelections[0]?.id ?? null,
    specs: (product.specs ?? []).map((spec) => ({ characteristicId: spec.characteristic?.id ?? "", value: spec.value })),
  };
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("funbike-admin-token"));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(Boolean(sessionStorage.getItem("funbike-admin-token")));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [archiveRequest, setArchiveRequest] = useState<ArchiveRequest | null>(null);
  const [tab, setTab] = useState<Tab>("products");
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [productKindFilter, setProductKindFilter] = useState<ProductKindFilter>("ALL");
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>("ALL");
  const [productBrandFilter, setProductBrandFilter] = useState<string>("ALL");
  const [productPage, setProductPage] = useState(1);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productTotalCount, setProductTotalCount] = useState(0);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [lookupKind, setLookupKind] = useState<LookupKind>("FAMILY");
  const [lookupRows, setLookupRows] = useState<Lookup[]>([]);
  const [lookupForm, setLookupForm] = useState<LookupForm>(emptyLookupForm);
  const [editingLookupId, setEditingLookupId] = useState<string | null>(null);
  const lookupPositionTouchedRef = useRef(false);
  const [brandForm, setBrandForm] = useState<BrandForm>(emptyBrandForm);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setUser(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void graphqlRequest<{ me: AdminUser | null }>("query CurrentAdmin { me { id email role } }", undefined, token)
      .then(({ me }) => {
        if (cancelled) return;
        if (!me || me.role !== "ADMIN") throw new Error("Session administrateur invalide.");
        setUser(me);
        setError("");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        sessionStorage.removeItem("funbike-admin-token");
        setToken(null);
        setUser(null);
        setError(reason instanceof Error ? reason.message : "Connexion expirée.");
      })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void graphqlRequest<ReferenceData>(REFERENCE_DATA_QUERY, undefined, token)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Impossible de charger les données.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, user, refreshKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setProductPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!token || !user) {
      setProducts([]);
      setProductTotalCount(0);
      setProductError("");
      setProductLoading(false);
      return;
    }
    if (tab !== "products") {
      setProductLoading(false);
      return;
    }
    let cancelled = false;
    setProductLoading(true);
    setProductError("");
    console.log("[AdminProducts] Recherche catalogue envoyée", {
      hasSearch: appliedSearch.length > 0,
      searchLength: appliedSearch.length,
      productKind: productKindFilter,
      productStatus: productStatusFilter,
      hasBrandFilter: productBrandFilter !== "ALL",
      page: productPage,
    });
    void graphqlRequest<{ adminProductPage: { items: AdminProduct[]; totalCount: number } }>(
      ADMIN_PRODUCTS_PAGE_QUERY,
      {
        status: productStatusFilter === "ALL" ? null : productStatusFilter,
        kind: productKindFilter === "ALL" ? null : productKindFilter,
        brandId: productBrandFilter === "ALL" ? null : productBrandFilter,
        search: appliedSearch || null,
        limit: ADMIN_PAGE_SIZE,
        offset: (productPage - 1) * ADMIN_PAGE_SIZE,
      },
      token,
    ).then(({ adminProductPage }) => {
      if (cancelled) return;
      console.log("[AdminProducts] Résultats du catalogue reçus", {
        returnedCount: adminProductPage.items.length,
        totalCount: adminProductPage.totalCount,
        page: productPage,
      });
      setProducts(adminProductPage.items);
      setProductTotalCount(adminProductPage.totalCount);
    }).catch((reason: unknown) => {
      if (cancelled) return;
      console.log("[AdminProducts] Échec de la recherche catalogue", {
        hasSearch: appliedSearch.length > 0,
        searchLength: appliedSearch.length,
        errorName: reason instanceof Error ? reason.name : typeof reason,
        errorMessage: reason instanceof Error ? reason.message : "Erreur inconnue",
      });
      setProducts([]);
      setProductTotalCount(0);
      setProductError(productLoadErrorMessage(reason));
    }).finally(() => { if (!cancelled) setProductLoading(false); });
    return () => { cancelled = true; };
  }, [token, user, tab, productStatusFilter, productKindFilter, productBrandFilter, appliedSearch, productPage, refreshKey]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(productTotalCount / ADMIN_PAGE_SIZE));
    if (productPage > totalPages) setProductPage(totalPages);
  }, [productPage, productTotalCount]);

  useEffect(() => {
    if (!token || !user || tab !== "classifications") return;
    let cancelled = false;
    void graphqlRequest<{ adminLookups: Lookup[] }>(
      "query AdminLookups($kind: LookupKind!) { adminLookups(kind: $kind) { id name family { id name } unit applicableTo isActive sortOrder } }",
      { kind: lookupKind },
      token,
    ).then(({ adminLookups }) => {
      if (cancelled) return;
      setLookupRows(adminLookups);
      if (!editingLookupId && !lookupPositionTouchedRef.current) {
        setLookupForm((current) => ({
          ...current,
          sortOrder: String(nextLookupPosition(adminLookups, lookupKind, current.familyId)),
        }));
      }
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Impossible de charger les classifications."); });
    return () => { cancelled = true; };
  }, [token, user, tab, lookupKind, refreshKey, editingLookupId]);

  useEffect(() => {
    if (!logoutModalOpen && !archiveRequest) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setLogoutModalOpen(false);
        setArchiveRequest(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [logoutModalOpen, archiveRequest, busy]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await graphqlRequest<{ login: { accessToken: string; user: AdminUser } }>(
        "mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { accessToken user { id email role } } }",
        { email, password },
      );
      sessionStorage.setItem("funbike-admin-token", result.login.accessToken);
      setToken(result.login.accessToken);
      setUser(result.login.user);
      setPassword("");
      setNotice("Connexion réussie.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Échec de connexion.");
    } finally {
      setBusy(false);
    }
  }

  function logout(message = "") {
    sessionStorage.removeItem("funbike-admin-token");
    setToken(null);
    setUser(null);
    setData(null);
    setPassword("");
    setNewAccountEmail("");
    setEmailCurrentPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNotice(message);
    setError("");
  }

  function reload() {
    setRefreshKey((value) => value + 1);
  }

  function startProductEdit(product: AdminProduct) {
    setProductForm(formFromProduct(product));
    setProductEditorOpen(true);
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setNotice("");
    const previousImageUrls = productForm.imageSelections.flatMap((image) => image.url ? [image.url] : []);
    const newlyUploadedUrls: string[] = [];
    try {
      if (productForm.imageSelections.some((image) => image.file)) setNotice("Importation des photos en cours…");
      const imageUrls = await resolveImageSelections(productForm.imageSelections, token, newlyUploadedUrls);
      const images = productForm.imageSelections.map((selection, index) => ({
        url: imageUrls[index]!,
        alt: productForm.alt.trim() || null,
        isPrimary: selection.id === productForm.primaryImageId,
        sortOrder: index,
      }));
      const specs = productForm.specs.filter((spec) => spec.characteristicId && spec.value.trim()).map((spec, index) => ({
        characteristicId: spec.characteristicId,
        value: spec.value.trim(),
        sortOrder: index,
      }));
      const input = {
        kind: productForm.kind,
        name: productForm.name,
        reference: productForm.reference || null,
        brandId: productForm.brandId || null,
        subfamilyId: productForm.subfamilyId || null,
        price: productForm.price || null,
        desc: productForm.desc || null,
        familyId: productForm.kind === "MOTORCYCLE" ? productForm.familyId || null : null,
        tag: productForm.kind === "MOTORCYCLE" ? productForm.tag || null : null,
        alt: productForm.kind === "MOTORCYCLE" ? productForm.alt || null : null,
        recommendation: productForm.kind === "MOTORCYCLE" ? productForm.recommendation || null : null,
        partTypeId: productForm.kind === "SPARE_PART" ? productForm.partTypeId || null : null,
        equipmentTypeId: productForm.kind === "EQUIPMENT" ? productForm.equipmentTypeId || null : null,
        accessoryTypeId: productForm.kind === "ACCESSORY" ? productForm.accessoryTypeId || null : null,
        categoryId: productForm.kind === "MOTORCYCLE" ? null : productForm.categoryId || null,
        sourceUrl: productForm.kind === "MOTORCYCLE" ? null : productForm.sourceUrl || null,
        compatibleBrandIds: productForm.kind === "SPARE_PART" ? productForm.compatibleBrandIds : [],
        universalCompatibility: productForm.kind === "SPARE_PART" && productForm.universalCompatibility !== ""
          ? productForm.universalCompatibility === "true"
          : null,
        usageIds: productForm.kind === "EQUIPMENT" || productForm.kind === "ACCESSORY" ? productForm.usageIds : [],
        images,
        specs,
      };
      if (productForm.id) {
        await graphqlRequest(
          "mutation UpdateProduct($id: ID!, $input: ProductInput!) { updateProduct(id: $id, input: $input) { id name status } }",
          { id: productForm.id, input },
          token,
        );
        setNotice("Produit mis à jour.");
      } else {
        await graphqlRequest(
          "mutation CreateProduct($input: ProductInput!) { createProduct(input: $input) { id name status } }",
          { input },
          token,
        );
        setNotice("Produit créé en brouillon. Publiez-le lorsqu’il est prêt.");
      }
      announcePublicCatalogChange();
      cleanupImages(uploadedImagesRemoved(previousImageUrls, imageUrls), token);
      setProductForm(emptyProductForm());
      setProductEditorOpen(false);
      reload();
    } catch (reason) {
      cleanupImages(newlyUploadedUrls, token);
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer le produit.");
    } finally {
      setBusy(false);
    }
  }

  async function changePublication(product: AdminProduct) {
    if (!token) return;
    const mutation = product.status === "PUBLISHED" ? "unpublishProduct" : "publishProduct";
    const label = product.status === "PUBLISHED" ? "retiré du catalogue" : "publié";
    setBusy(true);
    setError("");
    try {
      await graphqlRequest(
        `mutation SetPublication($id: ID!) { ${mutation}(id: $id) { id status } }`,
        { id: product.id },
        token,
      );
      setNotice(`« ${product.name} » a été ${label}.`);
      announcePublicCatalogChange();
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de modifier la publication.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!token || !window.confirm(`Supprimer définitivement « ${product.name} » ?`)) return;
    setBusy(true);
    setError("");
    try {
      await graphqlRequest("mutation DeleteProduct($id: ID!) { deleteProduct(id: $id) }", { id: product.id }, token);
      if (productForm.id === product.id) {
        setProductForm(emptyProductForm());
        setProductEditorOpen(false);
      }
      setNotice("Produit supprimé.");
      announcePublicCatalogChange();
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de supprimer le produit.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const input = {
        name: lookupForm.name,
        familyId: lookupKind === "SUBFAMILY" ? lookupForm.familyId || null : null,
        unit: lookupKind === "CHARACTERISTIC" ? lookupForm.unit || null : null,
        applicableTo: lookupKind === "CHARACTERISTIC" ? lookupForm.applicableTo || null : null,
        isActive: lookupForm.isActive,
        sortOrder: parseLookupPosition(lookupForm.sortOrder),
      };
      if (editingLookupId) {
        await graphqlRequest(
          "mutation UpdateLookup($kind: LookupKind!, $id: ID!, $input: LookupInput!) { updateLookup(kind: $kind, id: $id, input: $input) { id name } }",
          { kind: lookupKind, id: editingLookupId, input }, token,
        );
        setNotice("Classification mise à jour.");
      } else {
        await graphqlRequest(
          "mutation CreateLookup($kind: LookupKind!, $input: LookupInput!) { createLookup(kind: $kind, input: $input) { id name } }",
          { kind: lookupKind, input }, token,
        );
        setNotice("Classification créée.");
      }
      setEditingLookupId(null);
      lookupPositionTouchedRef.current = false;
      setLookupForm(emptyLookupForm());
      announcePublicCatalogChange();
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la classification.");
    } finally {
      setBusy(false);
    }
  }

  function editLookup(row: Lookup) {
    setEditingLookupId(row.id);
    lookupPositionTouchedRef.current = true;
    setLookupForm({
      name: row.name,
      familyId: row.family?.id ?? "",
      unit: row.unit ?? "",
      applicableTo: row.applicableTo ?? "",
      sortOrder: String(lookupPosition(row, lookupRows, lookupKind)),
      isActive: row.isActive,
    });
  }

  function archiveLookup(row: Lookup) {
    setArchiveRequest({
      type: "lookup",
      id: row.id,
      label: row.name,
      lookupKind,
      successMessage: "Classification archivée.",
    });
  }

  async function confirmArchive() {
    if (!token || !archiveRequest) return;
    const request = archiveRequest;
    setBusy(true);
    setError("");
    try {
      if (request.type === "lookup") {
        await graphqlRequest(
          "mutation ArchiveLookup($kind: LookupKind!, $id: ID!) { deleteLookup(kind: $kind, id: $id) }",
          { kind: request.lookupKind, id: request.id },
          token,
        );
      } else if (request.type === "brand") {
        await graphqlRequest(
          "mutation ArchiveBrand($id: ID!) { deleteBrand(id: $id) }",
          { id: request.id },
          token,
        );
      } else {
        await graphqlRequest(
          "mutation ArchiveCategory($id: ID!) { deleteCategory(id: $id) }",
          { id: request.id },
          token,
        );
      }
      setNotice(request.successMessage);
      setArchiveRequest(null);
      announcePublicCatalogChange();
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’archiver cet élément.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setNotice("");
    const previousImageUrls = brandForm.logoImage?.url ? [brandForm.logoImage.url] : [];
    const newlyUploadedUrls: string[] = [];
    try {
      if (brandForm.logoImage?.file) setNotice("Importation du logo en cours…");
      const logoUrls = await resolveImageSelections(brandForm.logoImage ? [brandForm.logoImage] : [], token, newlyUploadedUrls);
      const input = {
        slug: brandForm.slug,
        name: brandForm.name,
        logo: logoUrls[0] ?? null,
        logoAlt: brandForm.logoAlt || null,
        description: brandForm.description || null,
        sortOrder: parseDisplayOrder(brandForm.sortOrder),
        isActive: brandForm.isActive,
        sections: brandForm.sections.map((association) => ({
          section: association.section,
          order: parseDisplayOrder(association.order),
          label: association.label.trim() || null,
          routeId: association.routeId.trim() || null,
          filterable: association.filterable === "" ? null : association.filterable === "true",
          displayMode: association.displayMode || null,
          homeFeatured: association.homeFeatured === "" ? null : association.homeFeatured === "true",
          footerOrder: association.footerOrder === "" ? null : parseDisplayOrder(association.footerOrder),
          footerFeaturedOrder: association.footerFeaturedOrder === "" ? null : parseDisplayOrder(association.footerFeaturedOrder),
        })),
      };
      if (editingBrandId) {
        await graphqlRequest("mutation UpdateBrand($id: ID!, $input: BrandInput!) { updateBrand(id: $id, input: $input) { id name } }", { id: editingBrandId, input }, token);
        setNotice("Marque mise à jour.");
      } else {
        await graphqlRequest("mutation CreateBrand($input: BrandInput!) { createBrand(input: $input) { id name } }", { input }, token);
        setNotice("Marque créée.");
      }
      announcePublicCatalogChange();
      cleanupImages(uploadedImagesRemoved(previousImageUrls, logoUrls), token);
      setEditingBrandId(null);
      setBrandForm(emptyBrandForm());
      reload();
    } catch (reason) {
      cleanupImages(newlyUploadedUrls, token);
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la marque.");
    } finally {
      setBusy(false);
    }
  }

  function archiveBrand(brand: Brand) {
    setArchiveRequest({
      type: "brand",
      id: brand.id,
      label: brand.name,
      successMessage: "Marque archivée.",
    });
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (!categoryForm.image) {
      setError("Sélectionnez une photo pour cette carte d’accueil.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const previousImageUrls = categoryForm.image.url ? [categoryForm.image.url] : [];
    const newlyUploadedUrls: string[] = [];
    try {
      if (categoryForm.image.file) setNotice("Importation de la photo en cours…");
      const imageUrls = await resolveImageSelections([categoryForm.image], token, newlyUploadedUrls);
      const input = {
        title: categoryForm.title,
        desc: categoryForm.desc,
        src: imageUrls[0]!,
        to: categoryForm.to,
        brand: categoryForm.brand || null,
        sortOrder: parseDisplayOrder(categoryForm.sortOrder),
        isActive: categoryForm.isActive,
      };
      if (editingCategoryId) {
        await graphqlRequest("mutation UpdateCategory($id: ID!, $input: CategoryInput!) { updateCategory(id: $id, input: $input) { id title } }", { id: editingCategoryId, input }, token);
        setNotice("Carte d’accueil mise à jour.");
      } else {
        await graphqlRequest("mutation CreateCategory($input: CategoryInput!) { createCategory(input: $input) { id title } }", { input }, token);
        setNotice("Carte d’accueil créée.");
      }
      announcePublicCatalogChange();
      cleanupImages(uploadedImagesRemoved(previousImageUrls, imageUrls), token);
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm());
      reload();
    } catch (reason) {
      cleanupImages(newlyUploadedUrls, token);
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la carte d’accueil.");
    } finally {
      setBusy(false);
    }
  }

  function archiveCategory(category: Category) {
    setArchiveRequest({
      type: "category",
      id: category.id,
      label: category.title,
      successMessage: "Carte d’accueil archivée.",
    });
  }

  async function updateEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      await graphqlRequest(
        "mutation ChangeMyEmail($currentPassword: String!, $newEmail: String!) { changeMyEmail(currentPassword: $currentPassword, newEmail: $newEmail) }",
        { currentPassword: emailCurrentPassword, newEmail: newAccountEmail },
        token,
      );
      setNewAccountEmail("");
      setEmailCurrentPassword("");
      logout("Adresse e-mail modifiée. Reconnectez-vous avec la nouvelle adresse.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de modifier l’adresse e-mail.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await graphqlRequest(
        "mutation ChangeMyPassword($currentPassword: String!, $newPassword: String!) { changeMyPassword(currentPassword: $currentPassword, newPassword: $newPassword) }",
        { currentPassword, newPassword }, token,
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      logout("Mot de passe changé. Reconnectez-vous avec le nouveau mot de passe.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de changer le mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setError("");
    setNotice("");
  }

  const productTotalPages = Math.max(1, Math.ceil(productTotalCount / ADMIN_PAGE_SIZE));
  const characteristicOptions = (data?.characteristicDefinitions ?? []).filter((item) => item.isActive && characteristicApplies(item, productForm.kind));
  const firstProductNumber = productTotalCount === 0 ? 0 : (productPage - 1) * ADMIN_PAGE_SIZE + 1;
  const lastProductNumber = Math.min(productPage * ADMIN_PAGE_SIZE, productTotalCount);

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f6f1] text-sm text-black/55 dark:bg-[#141513] dark:text-white/55">Vérification de la session administrateur…</div>;
  }

  if (!token || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f6f1] px-4 py-10 text-[#171816] dark:bg-[#141513] dark:text-[#f2f0ea]">
        <section className="w-full max-w-md border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1c1d1a] sm:p-9">
          <a href="/" className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Funbike · Retour au site</a>
          <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#9a7900] dark:text-[#ffd100]">Espace privé</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Administration</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Connectez-vous avec le compte administrateur initialisé par l’exploitant.</p>
          {error && <p role="alert" className="mt-5 border-l-2 border-red-500 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
          {notice && <p className="mt-5 border-l-2 border-[#c49d00] bg-yellow-50 px-3 py-2.5 text-sm text-[#5f4b00] dark:bg-yellow-950/20 dark:text-yellow-100">{notice}</p>}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <Field label="Adresse e-mail"><input className={fieldClass} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label="Mot de passe"><input className={fieldClass} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            <button type="submit" className={`${buttonPrimary} w-full`} disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
          </form>
          <p className="mt-5 text-[11px] leading-relaxed text-black/45 dark:text-white/40">Les créations, modifications et suppressions du catalogue nécessitent une session administrateur.</p>
        </section>
      </main>
    );
  }

  const navigationGroups: Array<{ label: string; items: Array<{ id: Tab; label: string }> }> = [
    {
      label: "Catalogue",
      items: [
        { id: "products", label: "Produits" },
        { id: "classifications", label: "Listes du catalogue" }
      ],
    },
    {
      label: "Contenu du site",
      items: [
        { id: "brands", label: "Marques" },
        { id: "categories", label: "Cartes d’accueil" },
        { id: "siteContent", label: "Visuels & contenus" },
      ],
    },
    { label: "Compte", items: [{ id: "security", label: "Sécurité" }] },
  ];
  const tabs = navigationGroups.flatMap((group) => group.items);

  return (
    <main className="min-h-screen bg-[#f7f6f1] text-[#171816] dark:bg-[#141513] dark:text-[#f2f0ea]">
      <header className="sticky top-0 z-20 border-b-2 border-[#ffd100] bg-white/95 backdrop-blur dark:border-[#ffd100]/70 dark:bg-[#1c1d1a]/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <div>
            <a href="/" className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Funbike · Site public</a>
            <h1 className="mt-1 font-display text-xl font-bold sm:text-2xl">Administration</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-black/55 dark:text-white/55 sm:block">{user.email}</span>
            <button className={buttonSecondary} onClick={() => setLogoutModalOpen(true)}>Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row lg:items-start lg:gap-9 lg:px-10 lg:py-10">
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className={`${panelClass} sticky top-24 p-4`} aria-label="Navigation d’administration">
            <div className="border-b border-black/10 px-2 pb-4 dark:border-white/10">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8c6d00] dark:text-[#ffd100]">Espace admin</p>
              <p className="mt-1 text-xs text-black/45 dark:text-white/45">Navigation principale</p>
            </div>
            <div className="mt-5 space-y-6">
              {navigationGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/40 dark:text-white/40">{group.label}</p>
                  <div className="mt-2 space-y-1.5">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-current={tab === item.id ? "page" : undefined}
                        onClick={() => selectTab(item.id)}
                        className={`flex min-h-11 w-full items-center justify-between border-l-2 px-3 py-2.5 text-left text-sm font-bold transition ${tab === item.id ? "border-[#d2a900] bg-yellow-50 text-[#171816] dark:bg-yellow-400/10 dark:text-white" : "border-transparent text-black/55 hover:bg-black/[0.03] hover:text-black dark:text-white/55 dark:hover:bg-white/[0.04] dark:hover:text-white"}`}
                      >
                        <span>{item.label}</span>
                        {tab === item.id && <span className="text-[#8c6d00] dark:text-[#ffd100]" aria-hidden="true">›</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <nav className="flex gap-2 overflow-x-auto border-b border-black/10 pb-1 lg:hidden dark:border-white/10" aria-label="Sections d’administration">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => selectTab(item.id)}
                className={`min-h-12 shrink-0 border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${tab === item.id ? "border-[#d2a900] bg-yellow-50/70 text-[#171816] dark:bg-yellow-400/10 dark:text-white" : "border-transparent text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {(error || notice) && (
            <div className={`border-l-4 px-4 py-3.5 text-sm leading-6 ${error ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "border-[#c49d00] bg-yellow-50 text-[#5f4b00] dark:bg-yellow-950/20 dark:text-yellow-100"}`} role={error ? "alert" : "status"}>
              {error || notice}
            </div>
          )}
          {loading && <p className="text-xs text-black/45 dark:text-white/45" role="status">Chargement des données…</p>}

        {tab === "products" && (
          <section className="space-y-6">
            <div className="min-w-0 space-y-6">
              <div className="flex flex-col gap-4 border-b border-black/10 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Catalogue</p>
                  <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Produits</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55 dark:text-white/55">Gérez les fiches, leur publication et les informations visibles sur le site.</p>
                </div>
                <button type="button" className={productEditorOpen ? buttonSecondary : buttonPrimary} onClick={() => {
                  setError("");
                  setNotice("");
                  if (productEditorOpen) {
                    setProductForm(emptyProductForm());
                    setProductEditorOpen(false);
                  } else {
                    setProductForm(emptyProductForm());
                    setProductEditorOpen(true);
                  }
                }}>{productEditorOpen ? "Retour à la liste" : "+ Ajouter un produit"}</button>
              </div>
              {!productEditorOpen && <>
              <div className={`${panelClass} grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4 sm:gap-5`}>
                <Field label="Rechercher"><input className={fieldClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, référence, marque…" /></Field>
                <Field label="Type de produit"><select className={fieldClass} value={productKindFilter} onChange={(event) => { setProductKindFilter(event.target.value as ProductKindFilter); setProductPage(1); }}><option value="ALL">Tous les types</option><option value="MOTORCYCLE">Motos</option><option value="SPARE_PART">Pièces détachées</option><option value="EQUIPMENT">Équipements pilote</option><option value="ACCESSORY">Accessoires moto</option></select></Field>
                <Field label="Marque"><select className={fieldClass} value={productBrandFilter} onChange={(event) => { setProductBrandFilter(event.target.value); setProductPage(1); }}><option value="ALL">Toutes les marques</option>{(data?.adminBrands ?? []).map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.isActive ? "" : " (archivée)"}</option>)}</select></Field>
                <Field label="Publication"><select className={fieldClass} value={productStatusFilter} onChange={(event) => { setProductStatusFilter(event.target.value as ProductStatusFilter); setProductPage(1); }}><option value="ALL">Tous les statuts</option><option value="PUBLISHED">Publiés</option><option value="DRAFT">Brouillons</option></select></Field>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-black/55 dark:text-white/55">
                <span>{productError ? "Résultats indisponibles" : productLoading ? "Mise à jour des résultats…" : `${productTotalCount} produit${productTotalCount === 1 ? "" : "s"}`}</span>
                <span>{productError ? "Le compteur sera affiché une fois la connexion rétablie." : productTotalCount > 0 ? `Affichage ${firstProductNumber}–${lastProductNumber} sur ${productTotalCount}` : "Aucun résultat"}</span>
              </div>
              <div className={`${panelClass} overflow-hidden`}>
                {productError ? (
                  <div className="flex flex-col items-center gap-4 px-6 py-10 text-center" role="alert">
                    <p className="text-sm leading-6 text-red-700 dark:text-red-300">{productError}<br />Les résultats sont indisponibles : ce n’est pas une liste vide.</p>
                    <button type="button" className={buttonSecondary} disabled={productLoading} onClick={reload}>Réessayer</button>
                  </div>
                ) : productLoading && products.length === 0 ? <p className="px-6 py-12 text-center text-sm text-black/50 dark:text-white/50">Chargement des produits…</p> : products.length === 0 ? <p className="px-6 py-14 text-center text-sm leading-6 text-black/50 dark:text-white/50">Aucun produit ne correspond aux filtres.<br />Les nouveaux produits seront enregistrés en brouillon.</p> : (
                  <ul className="divide-y divide-black/10 dark:divide-white/10">
                    {products.map((product) => (
                      <li key={`${product.__typename}-${product.id}`} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 p-4 transition-colors hover:bg-black/[0.015] lg:grid-cols-[64px_minmax(0,1fr)_auto] lg:gap-5 lg:p-5 dark:hover:bg-white/[0.02]">
                        <div className="grid h-14 w-14 place-items-center overflow-hidden border border-black/10 bg-black/[0.025] lg:h-16 lg:w-16 dark:border-white/10 dark:bg-white/[0.03]">
                          {product.image ? <img src={product.image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <span className="text-[9px] font-bold text-black/35 dark:text-white/35">Sans photo</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><span className="min-w-0 break-words font-semibold leading-5">{product.name}</span><span className={`shrink-0 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${product.status === "PUBLISHED" ? "border-emerald-600/30 text-emerald-700 dark:text-emerald-300" : "border-black/15 text-black/50 dark:border-white/15 dark:text-white/50"}`}>{product.status === "PUBLISHED" ? "Publié" : "Brouillon"}</span></div>
                          <p className="mt-1 text-xs leading-5 text-black/50 dark:text-white/50">{productKindLabel(product.__typename)}{product.brand?.name ? ` · ${product.brand.name}` : ""}{product.reference ? ` · ${product.reference}` : ""}{product.price ? ` · ${product.price}` : ""}</p>
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-2 border-t border-black/10 pt-3 lg:col-span-1 lg:border-0 lg:pt-0 dark:border-white/10">
                          <button type="button" className={buttonSecondary} onClick={() => startProductEdit(product)}>Modifier</button>
                          <button type="button" className={buttonSecondary} disabled={busy} onClick={() => void changePublication(product)}>{product.status === "PUBLISHED" ? "Dépublier" : "Publier"}</button>
                          <button type="button" className="inline-flex min-h-11 items-center justify-center border border-red-300 px-4 text-xs font-bold uppercase tracking-[0.08em] text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30" disabled={busy} onClick={() => void deleteProduct(product)}>Supprimer</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!productError && <div className={`${panelClass} flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5`}>
                <p className="text-sm text-black/55 dark:text-white/55">Page <strong className="text-[#171816] dark:text-white">{productPage}</strong> sur {productTotalPages} <span className="mx-1 text-black/25 dark:text-white/25">·</span> 20 produits par page</p>
                <div className="flex gap-3">
                  <button type="button" className={buttonSecondary} disabled={productPage <= 1 || productLoading} onClick={() => setProductPage((current) => Math.max(1, current - 1))}>Précédent</button>
                  <button type="button" className={buttonSecondary} disabled={productPage >= productTotalPages || productLoading} onClick={() => setProductPage((current) => Math.min(productTotalPages, current + 1))}>Suivant</button>
                </div>
              </div>}
              </>}
            </div>

            {productEditorOpen && (
            <form onSubmit={saveProduct} className={`${panelClass} space-y-6 p-5 sm:p-7`}>
              <div className="flex flex-col gap-4 border-b border-black/10 pb-5 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8c6d00] dark:text-[#ffd100]">{productForm.id ? "Modifier le produit" : "Nouveau produit"}</p>
                  <h3 className="mt-1 font-display text-2xl font-bold">{productForm.id ? productForm.name : "Créer une fiche produit"}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">Renseignez les informations nécessaires. Les nouveaux produits sont enregistrés en brouillon.</p>
                </div>
                <button type="button" className={buttonSecondary} onClick={() => { setProductForm(emptyProductForm()); setProductEditorOpen(false); }}>Annuler</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Type de produit"><select className={fieldClass} value={productForm.kind} disabled={Boolean(productForm.id)} onChange={(event) => setProductForm((current) => ({ ...current, kind: event.target.value as ProductKind, familyId: "", subfamilyId: "", tag: "", alt: "", recommendation: "", partTypeId: "", equipmentTypeId: "", accessoryTypeId: "", categoryId: "", sourceUrl: "", universalCompatibility: "", compatibleBrandIds: [], usageIds: [], specs: [] }))}><option value="MOTORCYCLE">Moto</option><option value="SPARE_PART">Pièce détachée</option><option value="EQUIPMENT">Équipement pilote</option><option value="ACCESSORY">Accessoire moto</option></select></Field>
                <Field label="Nom du produit"><input className={fieldClass} required maxLength={255} placeholder={PRODUCT_NAME_EXAMPLES[productForm.kind]} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></Field>
                <Field label="Référence du fabricant (facultatif)" hint="Recopiez la référence indiquée sur la boîte ou la fiche du fabricant."><input className={fieldClass} maxLength={160} placeholder="Ex. TVS-428H-122L" value={productForm.reference} onChange={(event) => setProductForm({ ...productForm, reference: event.target.value })} /></Field>
                <Field label="Prix affiché" hint="Saisissez un montant ou indiquez « Sur devis »."><input className={fieldClass} maxLength={255} placeholder="Ex. 1 250 000 Ar ou Sur devis" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></Field>
                <Field label="Marque"><select className={fieldClass} value={productForm.brandId} onChange={(event) => setProductForm({ ...productForm, brandId: event.target.value })}><option value="">Choisir une marque (ex. TVS ou Sherco)</option>{(data?.brands ?? []).map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field>
              </div>
              {productForm.kind === "MOTORCYCLE" && (
                <section className="space-y-5 border-t border-black/10 pt-6 dark:border-white/10">
                  <div><h3 className="text-xs font-extrabold uppercase tracking-[0.14em]">Détails de la moto</h3><p className="mt-1 text-[11px] text-black/45 dark:text-white/45">Catégorie, gamme et éléments de présentation du modèle.</p></div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Field label="Catégorie de moto"><select className={fieldClass} value={productForm.familyId} onChange={(event) => { const familyId = event.target.value; const currentSubfamily = data?.subfamilies.find((item) => item.id === productForm.subfamilyId); setProductForm({ ...productForm, familyId, subfamilyId: currentSubfamily && currentSubfamily.family?.id !== familyId ? "" : productForm.subfamilyId }); }}><option value="">Choisir une catégorie de moto</option>{(data?.families ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                    <Field label="Gamme ou modèle associé (facultatif)" hint="Ex. Sherco SEF 250 ou TVS Apache."><select className={fieldClass} value={productForm.subfamilyId} onChange={(event) => setProductForm({ ...productForm, subfamilyId: event.target.value })}><option value="">Choisir une gamme ou un modèle</option>{(data?.subfamilies ?? []).filter((item) => !productForm.familyId || item.family?.id === productForm.familyId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                    <Field label="Petit badge (facultatif)" hint="Texte court mis en avant sur la fiche produit."><input className={fieldClass} placeholder="Ex. Nouveauté 2026" value={productForm.tag} onChange={(event) => setProductForm({ ...productForm, tag: event.target.value })} /></Field>
                    <Field label="Description de la photo" hint="Décrivez l’image en quelques mots pour les personnes qui ne la voient pas."><input className={fieldClass} placeholder="Ex. Sherco SEF 250 Factory 2026, vue de côté" value={productForm.alt} onChange={(event) => setProductForm({ ...productForm, alt: event.target.value })} /></Field>
                    <Field label="Phrase de mise en avant" hint="En une phrase, indiquez à qui ce modèle convient ou ce qui le distingue."><input className={fieldClass} placeholder="Ex. Idéale pour la ville et les trajets quotidiens" value={productForm.recommendation} onChange={(event) => setProductForm({ ...productForm, recommendation: event.target.value })} /></Field>
                  </div>
                </section>
              )}
              {productForm.kind === "SPARE_PART" && (
                <section className="space-y-5 border-t border-black/10 pt-6 dark:border-white/10">
                  <div><h3 className="text-xs font-extrabold uppercase tracking-[0.14em]">Pièce détachée</h3><p className="mt-1 text-[11px] text-black/45 dark:text-white/45">Précisez son type, sa catégorie et les motos compatibles.</p></div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Field label="Type de pièce"><select className={fieldClass} value={productForm.partTypeId} onChange={(event) => setProductForm({ ...productForm, partTypeId: event.target.value })}><option value="">Choisir un type</option>{(data?.partTypes ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                    <Field label="Catégorie de produit (pièce)"><select className={fieldClass} value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Choisir une catégorie de produit</option>{(data?.accessoryCategories ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                    <Field label="Compatible avec toutes les marques ?"><select className={fieldClass} value={productForm.universalCompatibility} onChange={(event) => setProductForm({ ...productForm, universalCompatibility: event.target.value, compatibleBrandIds: event.target.value === "true" ? [] : productForm.compatibleBrandIds })}><option value="">À préciser</option><option value="true">Oui, toutes les marques</option><option value="false">Non, compatibilité spécifique</option></select></Field>
                    {productForm.universalCompatibility !== "true" && <CheckboxGroupField label="Marques compatibles" hint="Cochez une ou plusieurs marques. Pour toutes les marques, choisissez « Oui » juste au-dessus." items={(data?.brands ?? []).filter((brand) => brand.isActive)} selectedIds={productForm.compatibleBrandIds} onChange={(compatibleBrandIds) => setProductForm({ ...productForm, compatibleBrandIds })} emptyLabel="Ajoutez d’abord les marques concernées dans la section « Marques »." />}
                    {productForm.universalCompatibility === "true" && <p className="border border-emerald-600/20 bg-emerald-50/60 px-3 py-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">Cette pièce sera proposée pour toutes les marques ; aucune sélection supplémentaire n’est nécessaire.</p>}
                    <div className="sm:col-span-2"><Field label="Lien vers la fiche du fabricant (facultatif)" hint="Un lien vers la page de ce produit chez la marque, si vous l’avez."><input className={fieldClass} type="url" placeholder="Ex. https://…" value={productForm.sourceUrl} onChange={(event) => setProductForm({ ...productForm, sourceUrl: event.target.value })} /></Field></div>
                  </div>
                </section>
              )}
              {(productForm.kind === "EQUIPMENT" || productForm.kind === "ACCESSORY") && (
                <section className="space-y-5 border-t border-black/10 pt-6 dark:border-white/10">
                  <div><h3 className="text-xs font-extrabold uppercase tracking-[0.14em]">{productForm.kind === "EQUIPMENT" ? "Équipement pilote" : "Accessoire moto"}</h3><p className="mt-1 text-[11px] text-black/45 dark:text-white/45">Choisissez le type de produit, sa catégorie et les usages pertinents.</p></div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Field label={productForm.kind === "EQUIPMENT" ? "Type d’équipement" : "Type d’accessoire"}><select className={fieldClass} value={productForm.kind === "EQUIPMENT" ? productForm.equipmentTypeId : productForm.accessoryTypeId} onChange={(event) => setProductForm({ ...productForm, [productForm.kind === "EQUIPMENT" ? "equipmentTypeId" : "accessoryTypeId"]: event.target.value })}><option value="">Choisir un type</option>{(productForm.kind === "EQUIPMENT" ? data?.equipmentTypes ?? [] : data?.accessoryTypes ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                    <Field label="Catégorie de produit (équipement ou accessoire)"><select className={fieldClass} value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Choisir une catégorie de produit</option>{(data?.accessoryCategories ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                    <CheckboxGroupField label="Utilisation prévue" hint="Cochez tous les usages concernés." items={(data?.productUsages ?? []).filter((item) => item.isActive)} selectedIds={productForm.usageIds} onChange={(usageIds) => setProductForm({ ...productForm, usageIds })} emptyLabel="Ajoutez d’abord les usages dans « Listes du catalogue »." />
                    <Field label="Lien vers la fiche du fabricant (facultatif)" hint="Un lien vers la page de ce produit chez la marque, si vous l’avez."><input className={fieldClass} type="url" placeholder="Ex. https://…" value={productForm.sourceUrl} onChange={(event) => setProductForm({ ...productForm, sourceUrl: event.target.value })} /></Field>
                  </div>
                </section>
              )}
              <div className="grid gap-6 border-t border-black/10 pt-6 dark:border-white/10 xl:grid-cols-2">
                <Field label="Description du produit" hint="Présentez le produit, ses points forts et, si besoin, les modèles compatibles."><textarea className={`${fieldClass} min-h-40 resize-y`} placeholder={PRODUCT_DESCRIPTION_EXAMPLES[productForm.kind]} value={productForm.desc} onChange={(event) => setProductForm({ ...productForm, desc: event.target.value })} /></Field>
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">Photos du produit</p>
                    <p className="mt-1 text-xs leading-5 text-black/45 dark:text-white/45">Ajoutez et ordonnez les images de cette fiche.</p>
                  </div>
                  <ImageFilePicker
                  multiple
                  maxImages={30}
                  images={productForm.imageSelections}
                  onChange={(imageSelections) => setProductForm((current) => ({
                    ...current,
                    imageSelections,
                    primaryImageId: imageSelections.some((image) => image.id === current.primaryImageId)
                      ? current.primaryImageId
                      : imageSelections[0]?.id ?? null,
                  }))}
                  primaryImageId={productForm.primaryImageId}
                  onSetPrimary={(primaryImageId) => setProductForm((current) => ({ ...current, primaryImageId }))}
                  disabled={busy}
                  />
                  <p className="text-xs leading-5 text-black/45 dark:text-white/45">La première photo est principale par défaut. Cliquez sur « Définir comme principale » pour en choisir une autre. Vous pouvez sélectionner plusieurs fichiers à la fois.</p>
                </div>
              </div>
              <div className="space-y-3 border-t border-black/10 pt-6 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">Caractéristiques du produit</span>
                    <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">Ex. « Cylindrée » : « 250 cc ».</p>
                  </div>
                  <button type="button" className="text-xs font-bold text-[#806300] underline underline-offset-2 dark:text-[#ffd100]" onClick={() => setProductForm({ ...productForm, specs: [...productForm.specs, { characteristicId: "", value: "" }] })}>+ Ajouter</button>
                </div>
                {productForm.specs.map((spec, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><select aria-label="Caractéristique du produit" className={fieldClass} value={spec.characteristicId} onChange={(event) => setProductForm({ ...productForm, specs: productForm.specs.map((row, rowIndex) => rowIndex === index ? { ...row, characteristicId: event.target.value } : row) })}><option value="">Choisir une caractéristique…</option>{characteristicOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.unit ? ` (${item.unit})` : ""}</option>)}</select><input aria-label="Valeur" className={fieldClass} placeholder="Ex. 250 cc" value={spec.value} onChange={(event) => setProductForm({ ...productForm, specs: productForm.specs.map((row, rowIndex) => rowIndex === index ? { ...row, value: event.target.value } : row) })} /><button type="button" aria-label="Retirer la caractéristique" className="px-2 text-red-600" onClick={() => setProductForm({ ...productForm, specs: productForm.specs.filter((_, rowIndex) => rowIndex !== index) })}>×</button></div>)}
              </div>
              <div className="flex flex-col gap-4 border-t border-black/10 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-black/50 dark:text-white/50">Les nouveaux produits restent en brouillon jusqu’à publication.</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={buttonSecondary} onClick={() => { setProductForm(emptyProductForm()); setProductEditorOpen(false); }}>Annuler</button>
                  <button type="submit" className={buttonPrimary} disabled={busy}>{busy ? "Enregistrement…" : productForm.id ? "Enregistrer les modifications" : "Créer le brouillon"}</button>
                </div>
              </div>
            </form>
            )}
          </section>
        )}

        {tab === "classifications" && (
          <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(230px,0.8fr)_minmax(290px,1fr)_minmax(260px,1fr)]">
            <div className="min-w-0 space-y-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Valeurs du catalogue</p><h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Listes du catalogue</h2><p className="mt-2 text-sm leading-6 text-black/55 dark:text-white/55">Gérez les listes utilisées par les formulaires produit : familles de motos, catégories de produits, types et caractéristiques. Ce ne sont pas les cartes éditoriales de l’accueil.</p></div><Field label="Liste à gérer"><select className={fieldClass} value={lookupKind} onChange={(event) => { lookupPositionTouchedRef.current = false; setLookupKind(event.target.value as LookupKind); setEditingLookupId(null); setLookupForm(emptyLookupForm()); }}>
              {LOOKUP_KINDS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select></Field><div className={panelClass}><ul className="divide-y divide-black/10 dark:divide-white/10">{lookupRows.map((row) => <li key={row.id} className="flex items-center gap-3 px-4 py-3.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffd100]/30 text-xs font-extrabold text-[#171816] dark:text-[#ffd100]">{lookupPosition(row, lookupRows, lookupKind)}</span><button className="min-w-0 flex-1 text-left" onClick={() => editLookup(row)}><span className="block truncate text-sm font-semibold">{row.name}</span><span className="text-[10px] text-black/45 dark:text-white/45">{row.family?.name ? `${row.family.name} · ` : ""}{row.isActive ? "Actif" : "Archivé"}</span></button><button className="inline-flex min-h-11 items-center px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => void archiveLookup(row)}>Archiver</button></li>)}{lookupRows.length === 0 && <li className="p-4 text-sm text-black/45 dark:text-white/45">Aucune valeur enregistrée.</li>}</ul></div></div>
            <form onSubmit={saveLookup} className={`${panelClass} space-y-5 p-5 sm:p-6`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingLookupId ? "Modification" : "Nouvelle valeur"}</p>
                <h3 className="mt-1 font-display text-xl font-bold">{LOOKUP_KINDS.find((item) => item.key === lookupKind)?.label}</h3>
              </div>
              <Field
                label={lookupKind === "SUBFAMILY" ? "Nom de la gamme ou du modèle" : lookupKind === "FAMILY" ? "Nom de la catégorie de moto" : lookupKind === "CATEGORY" ? "Nom de la catégorie de produit" : "Nom à afficher"}
                hint="Ce libellé sera proposé dans les formulaires du catalogue."
              >
                <input className={fieldClass} required maxLength={160} placeholder={LOOKUP_NAME_EXAMPLES[lookupKind]} value={lookupForm.name} onChange={(event) => setLookupForm({ ...lookupForm, name: event.target.value })} />
              </Field>
              {lookupKind === "SUBFAMILY" && <Field label="Catégorie de moto associée" hint="Choisissez la catégorie à laquelle cette gamme ou ce modèle appartient.">
                <select required className={fieldClass} value={lookupForm.familyId} onChange={(event) => { const familyId = event.target.value; lookupPositionTouchedRef.current = false; setLookupForm((current) => ({ ...current, familyId, sortOrder: String(nextLookupPosition(lookupRows, lookupKind, familyId)) })); }}>
                  <option value="">Choisir une catégorie…</option>
                  {(data?.families ?? []).map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
                </select>
              </Field>}
              {lookupKind === "CHARACTERISTIC" && <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unité de mesure (facultatif)" hint="Ex. cc, mm ou kg.">
                  <input className={fieldClass} value={lookupForm.unit} onChange={(event) => setLookupForm({ ...lookupForm, unit: event.target.value })} placeholder="Ex. cc, mm, kg…" />
                </Field>
                <Field label="Type de produit concerné" hint="Laissez « Tous les types » pour proposer la caractéristique partout.">
                  <select className={fieldClass} value={lookupForm.applicableTo} onChange={(event) => setLookupForm({ ...lookupForm, applicableTo: event.target.value })}>
                    <option value="">Tous les types</option>
                    {lookupForm.applicableTo && !CHARACTERISTIC_SCOPES.some((scope) => scope.value === lookupForm.applicableTo) && <option value={lookupForm.applicableTo}>Valeur actuelle à vérifier : {lookupForm.applicableTo}</option>}
                    {CHARACTERISTIC_SCOPES.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
                  </select>
                </Field>
              </div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <LookupPositionField
                  value={lookupForm.sortOrder}
                  hint={lookupKind === "SUBFAMILY" && !lookupForm.familyId
                    ? "Choisissez d’abord la catégorie de moto ; la prochaine position sera calculée pour cette liste."
                    : "1 = premier ; une position occupée insère la valeur à cet endroit et décale les suivantes. Laisser la valeur proposée ajoute à la fin."}
                  onChange={(sortOrder) => { lookupPositionTouchedRef.current = true; setLookupForm((current) => ({ ...current, sortOrder })); }}
                />
                <Field label="Statut"><select className={fieldClass} value={String(lookupForm.isActive)} onChange={(event) => setLookupForm({ ...lookupForm, isActive: event.target.value === "true" })}><option value="true">Actif</option><option value="false">Archivé</option></select></Field>
              </div>
              <div className="flex flex-wrap gap-3">
                {editingLookupId && <button type="button" className={buttonSecondary} onClick={() => { setEditingLookupId(null); lookupPositionTouchedRef.current = false; setLookupForm(emptyLookupForm()); }}>Annuler</button>}
                <button className={buttonPrimary} type="submit" disabled={busy}>{editingLookupId ? "Enregistrer" : "Créer"}</button>
              </div>
            </form>
            <aside className={`${panelClass} p-5 text-sm leading-relaxed text-black/60 dark:text-white/60`}><h3 className="font-display text-lg font-bold text-[#171816] dark:text-white">Listes des fiches produit</h3><p className="mt-2">Les valeurs créées ici sont proposées dans les formulaires du catalogue. « Catégories de motos » classe les motos ; « Catégories de produits » concerne les pièces, équipements et accessoires.</p><p className="mt-3">Les cartes illustrées de la page d’accueil se gèrent séparément dans « Cartes d’accueil » : elles ne servent pas à classer les produits.</p><p className="mt-3">Les positions commencent à 1. Choisir une position occupée insère la valeur à cet endroit et décale les suivantes ; les gammes et modèles sont ordonnés séparément dans chaque catégorie de moto.</p><p className="mt-3">Archiver une valeur la retire des nouveaux choix sans la supprimer des produits déjà enregistrés.</p></aside>
          </section>
        )}

        {tab === "brands" && (
          <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"><div className="min-w-0 space-y-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Marques vendues par Funbike</p><h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Marques</h2><p className="mt-2 text-sm leading-6 text-black/55 dark:text-white/55">Gérez les marques affichées dans le catalogue et les filtres du site.</p></div><div className={panelClass}><ul className="divide-y divide-black/10 dark:divide-white/10">{(data?.adminBrands ?? []).map((brand) => <li key={brand.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{brand.name}</p><p className="text-xs text-black/45 dark:text-white/45">{brand.isActive ? "Active sur le site" : "Archivée"}</p></div><button className={buttonSecondary} onClick={() => { setEditingBrandId(brand.id); setBrandForm({ slug: brand.slug, name: brand.name, logoImage: brand.logo ? imageFromStoredUrl(brand.logo, `brand-${brand.id}-logo`) : null, logoAlt: brand.logoAlt ?? "", description: brand.description ?? "", sortOrder: formatDisplayOrder(brand.sortOrder), isActive: brand.isActive, sections: (brand.sections ?? []).map((association) => ({ section: association.section, order: String(association.order ?? 0), label: association.label ?? "", routeId: association.routeId ?? "", filterable: association.filterable == null ? "" : String(association.filterable), displayMode: association.displayMode ?? "", homeFeatured: association.homeFeatured == null ? "" : String(association.homeFeatured), footerOrder: association.footerOrder == null ? "" : String(association.footerOrder), footerFeaturedOrder: association.footerFeaturedOrder == null ? "" : String(association.footerFeaturedOrder) })) }); }}>Modifier</button><button className="inline-flex min-h-11 items-center px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => void archiveBrand(brand)}>Archiver</button></li>)}{!data?.adminBrands.length && <li className="p-5 text-sm text-black/45 dark:text-white/45">Aucune marque enregistrée.</li>}</ul></div></div>
            <form onSubmit={saveBrand} className={`${panelClass} space-y-5 p-5 sm:p-6`}><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingBrandId ? "Modification" : "Nouvelle marque"}</p><h3 className="mt-1 font-display text-xl font-bold">Fiche marque</h3></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom de la marque"><input className={fieldClass} required placeholder="Ex. Sherco" value={brandForm.name} onChange={(event) => setBrandForm({ ...brandForm, name: event.target.value })} /></Field><Field label="Nom court utilisé dans l’adresse de la page" hint="Écrivez en minuscules, sans espaces. Exemple : sherco ou tvs."><input className={fieldClass} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="Ex. sherco" value={brandForm.slug} onChange={(event) => setBrandForm({ ...brandForm, slug: event.target.value.toLowerCase() })} /></Field><Field label="Description du logo (accessibilité)" hint="Quelques mots pour décrire le logo aux personnes qui ne le voient pas."><input className={fieldClass} placeholder="Ex. Logo Sherco" value={brandForm.logoAlt} onChange={(event) => setBrandForm({ ...brandForm, logoAlt: event.target.value })} /></Field></div><div className="space-y-3"><p className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">Logo de la marque</p><ImageFilePicker images={brandForm.logoImage ? [brandForm.logoImage] : []} onChange={(images) => setBrandForm({ ...brandForm, logoImage: images[0] ?? null })} disabled={busy} /></div><Field label="Présentation de la marque"><textarea className={`${fieldClass} min-h-24`} placeholder="Ex. Motos et équipements TVS proposés par Funbike." value={brandForm.description} onChange={(event) => setBrandForm({ ...brandForm, description: event.target.value })} /></Field><BrandSectionAssociationsEditor value={brandForm.sections} onChange={(sections) => setBrandForm({ ...brandForm, sections })} disabled={busy} /><div className="grid gap-4 sm:grid-cols-2"><DisplayOrderField value={brandForm.sortOrder} onChange={(sortOrder) => setBrandForm({ ...brandForm, sortOrder })} /><Field label="Statut"><select className={fieldClass} value={String(brandForm.isActive)} onChange={(event) => setBrandForm({ ...brandForm, isActive: event.target.value === "true" })}><option value="true">Active</option><option value="false">Archivée</option></select></Field></div><div className="flex flex-wrap gap-3">{editingBrandId && <button type="button" className={buttonSecondary} onClick={() => { setEditingBrandId(null); setBrandForm(emptyBrandForm()); }}>Annuler</button>}<button className={buttonPrimary} type="submit" disabled={busy}>{editingBrandId ? "Enregistrer" : "Créer la marque"}</button></div></form>
          </section>
        )}

        {tab === "categories" && (
          <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"><div className="min-w-0 space-y-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Accueil</p><h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Cartes éditoriales de l’accueil</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-black/55 dark:text-white/55">Créez les cartes illustrées affichées dans la section « Choisir son univers » de la page d’accueil : titre, photo, description et destination. Elles ne classent pas les produits ; les catégories de produits se gèrent séparément dans « Listes du catalogue ».</p></div><div className={panelClass}><ul className="divide-y divide-black/10 dark:divide-white/10">{(data?.adminCategories ?? []).map((category) => <li key={category.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{category.title}</p><p className="truncate text-xs text-black/45 dark:text-white/45">{CATEGORY_DESTINATIONS.find((destination) => destination.page === category.to)?.label ?? category.to} · {category.isActive ? "Active" : "Archivée"}</p></div><button className={buttonSecondary} onClick={() => { setEditingCategoryId(category.id); setCategoryForm({ title: category.title, desc: category.desc, image: imageFromStoredUrl(category.src, `category-${category.id}-image`), to: category.to, brand: category.brand ?? "", sortOrder: formatDisplayOrder(category.sortOrder), isActive: category.isActive }); }}>Modifier</button><button className="inline-flex min-h-11 items-center px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => void archiveCategory(category)}>Archiver</button></li>)}{!data?.adminCategories.length && <li className="p-5 text-sm text-black/45 dark:text-white/45">Aucune carte d’accueil enregistrée.</li>}</ul></div></div>
            <form onSubmit={saveCategory} className={`${panelClass} space-y-5 p-5 sm:p-6`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingCategoryId ? "Modification" : "Nouvelle carte d’accueil"}</p>
                <h3 className="mt-1 font-display text-xl font-bold">Carte éditoriale</h3>
              </div>
              <Field label="Titre de la carte" hint="Ex. Motos TVS & urbain.">
                <input className={fieldClass} required placeholder="Ex. Motos TVS & urbain" value={categoryForm.title} onChange={(event) => setCategoryForm({ ...categoryForm, title: event.target.value })} />
              </Field>
              <Field label="Courte description" hint="Expliquez en une phrase ce que le visiteur trouvera.">
                <textarea className={`${fieldClass} min-h-20`} required placeholder="Ex. Découvrez les motos TVS pour vos trajets quotidiens." value={categoryForm.desc} onChange={(event) => setCategoryForm({ ...categoryForm, desc: event.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 min-w-0 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-black/60 dark:text-white/60">Photo de la carte</p>
                  <ImageFilePicker images={categoryForm.image ? [categoryForm.image] : []} onChange={(images) => setCategoryForm({ ...categoryForm, image: images[0] ?? null })} disabled={busy} />
                </div>
                <Field label="Page à ouvrir au clic" hint="Choisissez où le visiteur sera dirigé.">
                  <select className={fieldClass} required value={categoryForm.to} onChange={(event) => setCategoryForm({ ...categoryForm, to: event.target.value })}>
                    <option value="">Choisir une page…</option>
                    {categoryForm.to && !CATEGORY_DESTINATIONS.some((destination) => destination.page === categoryForm.to) && <option value={categoryForm.to}>Valeur actuelle à vérifier : {categoryForm.to}</option>}
                    {CATEGORY_DESTINATIONS.map((destination) => <option key={destination.page} value={destination.page}>{destination.label}</option>)}
                  </select>
                </Field>
                <Field label="Marque à afficher (facultatif)" hint="À utiliser si cette catégorie mène à une gamme précise.">
                  <select className={fieldClass} value={categoryForm.brand} onChange={(event) => setCategoryForm({ ...categoryForm, brand: event.target.value })}>
                    <option value="">Aucune marque en particulier</option>
                    {categoryForm.brand && !data?.adminBrands.some((brand) => brand.slug === categoryForm.brand) && <option value={categoryForm.brand}>Valeur actuelle : {categoryForm.brand}</option>}
                    {(data?.adminBrands ?? []).map((brand) => <option key={brand.id} value={brand.slug}>{brand.name}</option>)}
                  </select>
                </Field>
                <DisplayOrderField value={categoryForm.sortOrder} onChange={(sortOrder) => setCategoryForm({ ...categoryForm, sortOrder })} />
                <Field label="Statut"><select className={fieldClass} value={String(categoryForm.isActive)} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.value === "true" })}><option value="true">Active</option><option value="false">Archivée</option></select></Field>
              </div>
              <div className="flex flex-wrap gap-3">
                {editingCategoryId && <button type="button" className={buttonSecondary} onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategoryForm()); }}>Annuler</button>}
                <button className={buttonPrimary} type="submit" disabled={busy}>{editingCategoryId ? "Enregistrer la carte" : "Créer la carte"}</button>
              </div>
            </form>
          </section>
        )}

        {tab === "siteContent" && <SiteContentAdmin token={token} />}

        {tab === "security" && (
          <section className="mx-auto max-w-2xl space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Compte administrateur</p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Sécurité</h2>
              <p className="mt-2 text-sm text-black/55 dark:text-white/55">
                Connecté en tant que <strong>{user.email}</strong>. Chaque changement vérifie le mot de passe actuel,
                révoque les sessions actives et vous demande de vous reconnecter.
              </p>
            </div>

            <form onSubmit={updateEmail} className={`${panelClass} space-y-5 p-5 sm:p-6`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">Identifiant</p>
                <h3 className="mt-1 font-display text-xl font-bold">Modifier l’adresse e-mail</h3>
              </div>
              <Field label="Nouvelle adresse e-mail">
                <input className={fieldClass} type="email" autoComplete="email" required maxLength={254} value={newAccountEmail} onChange={(event) => setNewAccountEmail(event.target.value)} />
              </Field>
              <Field label="Mot de passe actuel">
                <input className={fieldClass} type="password" autoComplete="current-password" required value={emailCurrentPassword} onChange={(event) => setEmailCurrentPassword(event.target.value)} />
              </Field>
              <button className={buttonPrimary} type="submit" disabled={busy}>{busy ? "Mise à jour…" : "Changer l’e-mail"}</button>
            </form>

            <form onSubmit={updatePassword} className={`${panelClass} space-y-5 p-5 sm:p-6`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">Authentification</p>
                <h3 className="mt-1 font-display text-xl font-bold">Modifier le mot de passe</h3>
              </div>
              <Field label="Mot de passe actuel">
                <input className={fieldClass} type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              </Field>
              <Field label="Nouveau mot de passe" hint="Au moins 12 caractères, 72 octets maximum.">
                <input className={fieldClass} type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </Field>
              <Field label="Confirmer le nouveau mot de passe">
                <input className={fieldClass} type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </Field>
              <button className={buttonPrimary} type="submit" disabled={busy}>{busy ? "Mise à jour…" : "Changer le mot de passe"}</button>
            </form>

            <div className={`${panelClass} p-5 text-sm leading-relaxed text-black/55 dark:text-white/55`}>
              <h3 className="font-bold text-[#171816] dark:text-white">Conseils</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Choisissez un mot de passe unique et ne le partagez pas.</li>
                <li>Le jeton de connexion est conservé uniquement dans l’onglet de navigateur courant.</li>
                <li>La modification d’e-mail change l’identifiant utilisé lors de la prochaine connexion.</li>
              </ul>
            </div>
          </section>
        )}
        </div>
      </div>
      <footer className="border-t border-black/10 px-4 py-6 text-center text-[11px] text-black/40 dark:border-white/10 dark:text-white/40">Funbike · Interface d’administration protégée</footer>

      {logoutModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setLogoutModalOpen(false); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-description"
            className="w-full max-w-md border border-black/10 bg-white p-6 text-[#171816] shadow-2xl dark:border-white/10 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Confirmation</p>
            <h2 id="logout-modal-title" className="mt-2 font-display text-xl font-bold">Se déconnecter ?</h2>
            <p id="logout-modal-description" className="mt-2 text-sm text-black/60 dark:text-white/60">
              Voulez-vous vraiment quitter votre session administrateur ?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" autoFocus className={buttonSecondary} onClick={() => setLogoutModalOpen(false)}>
                Non
              </button>
              <button type="button" className={buttonPrimary} onClick={() => { setLogoutModalOpen(false); logout(); }}>
                Oui, me déconnecter
              </button>
            </div>
          </section>
        </div>
      )}

      {archiveRequest && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setArchiveRequest(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-modal-title"
            aria-describedby="archive-modal-description"
            className="w-full max-w-md border border-black/10 bg-white p-6 text-[#171816] shadow-2xl dark:border-white/10 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Confirmation</p>
            <h2 id="archive-modal-title" className="mt-2 font-display text-xl font-bold">Confirmer l’archivage ?</h2>
            <p id="archive-modal-description" className="mt-2 text-sm text-black/60 dark:text-white/60">
              Archiver « <strong>{archiveRequest.label}</strong> » ? L’élément sera retiré des choix actifs, sans supprimer son historique.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" autoFocus className={buttonSecondary} disabled={busy} onClick={() => setArchiveRequest(null)}>
                Non
              </button>
              <button type="button" className={buttonPrimary} disabled={busy} onClick={() => void confirmArchive()}>
                {busy ? "Archivage…" : "Oui, archiver"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

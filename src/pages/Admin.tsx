import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { graphqlRequest } from "../lib/graphqlClient";

type AdminUser = { id: string; email: string; role: string };
type ProductKind = "MOTORCYCLE" | "SPARE_PART" | "EQUIPMENT" | "ACCESSORY";
type LookupKind = "FAMILY" | "SUBFAMILY" | "PART_TYPE" | "EQUIPMENT_TYPE" | "ACCESSORY_TYPE" | "CATEGORY" | "USAGE" | "CHARACTERISTIC";
type Lookup = { id: string; name: string; family?: { id: string; name: string } | null; unit?: string | null; applicableTo?: string | null; isActive: boolean; sortOrder?: number | null };
type Brand = { id: string; slug: string; name: string; logo?: string | null; logoAlt?: string | null; description?: string | null; isActive: boolean; sortOrder?: number | null };
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
  products: AdminProduct[];
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
  imageUrls: string;
  specs: Array<{ characteristicId: string; value: string }>;
};
type LookupForm = { name: string; familyId: string; unit: string; applicableTo: string; sortOrder: string; isActive: boolean };
type BrandForm = { slug: string; name: string; logo: string; logoAlt: string; description: string; sortOrder: string; isActive: boolean };
type CategoryForm = { title: string; desc: string; src: string; to: string; brand: string; sortOrder: string; isActive: boolean };
type Tab = "products" | "classifications" | "brands" | "categories" | "security";
type ArchiveRequest =
  | { type: "lookup"; id: string; label: string; lookupKind: LookupKind; successMessage: string }
  | { type: "brand"; id: string; label: string; successMessage: string }
  | { type: "category"; id: string; label: string; successMessage: string };

const LOOKUP_KINDS: Array<{ key: LookupKind; label: string }> = [
  { key: "FAMILY", label: "Familles moto" },
  { key: "SUBFAMILY", label: "Sous-familles" },
  { key: "PART_TYPE", label: "Types de pièces" },
  { key: "EQUIPMENT_TYPE", label: "Types d’équipement" },
  { key: "ACCESSORY_TYPE", label: "Types d’accessoire" },
  { key: "CATEGORY", label: "Catégories catalogue" },
  { key: "USAGE", label: "Usages" },
  { key: "CHARACTERISTIC", label: "Caractéristiques" },
];

const PRODUCTS_QUERY = `
  query AdminData {
    products: adminProducts(limit: 200) {
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
    brands { id slug name isActive sortOrder }
    families { id name isActive sortOrder }
    subfamilies { id name family { id name } isActive sortOrder }
    partTypes { id name isActive sortOrder }
    equipmentTypes { id name isActive sortOrder }
    accessoryTypes { id name isActive sortOrder }
    accessoryCategories { id name isActive sortOrder }
    productUsages { id name isActive sortOrder }
    characteristicDefinitions { id name unit applicableTo isActive sortOrder }
    adminBrands { id slug name logo logoAlt description isActive sortOrder }
    adminCategories { id title desc src to brand isActive sortOrder }
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
  imageUrls: "",
  specs: [],
});

const emptyLookupForm = (): LookupForm => ({ name: "", familyId: "", unit: "", applicableTo: "", sortOrder: "0", isActive: true });
const emptyBrandForm = (): BrandForm => ({ slug: "", name: "", logo: "", logoAlt: "", description: "", sortOrder: "0", isActive: true });
const emptyCategoryForm = (): CategoryForm => ({ title: "", desc: "", src: "", to: "", brand: "", sortOrder: "0", isActive: true });

const fieldClass = "w-full border border-black/15 bg-white px-3 py-2.5 text-sm text-[#171816] outline-none transition focus:border-[#c49d00] dark:border-white/15 dark:bg-[#1c1d1a] dark:text-[#f2f0ea]";
const buttonPrimary = "inline-flex min-h-10 items-center justify-center gap-2 bg-[#ffd100] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#171816] transition hover:bg-[#ffe36b] disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary = "inline-flex min-h-10 items-center justify-center gap-2 border border-black/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#171816] transition hover:border-[#c49d00] dark:border-white/20 dark:text-[#f2f0ea]";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-black/45 dark:text-white/45">{hint}</span>}
    </label>
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

function kindFromTypename(name: AdminProduct["__typename"]): ProductKind {
  const kinds = { Motorcycle: "MOTORCYCLE", SparePart: "SPARE_PART", Equipment: "EQUIPMENT", Accessory: "ACCESSORY" } as const;
  return kinds[name];
}

function formFromProduct(product: AdminProduct): ProductForm {
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
    imageUrls: (product.gallery?.length ? product.gallery : product.image ? [product.image] : []).join("\n"),
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
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [lookupKind, setLookupKind] = useState<LookupKind>("FAMILY");
  const [lookupRows, setLookupRows] = useState<Lookup[]>([]);
  const [lookupForm, setLookupForm] = useState<LookupForm>(emptyLookupForm);
  const [editingLookupId, setEditingLookupId] = useState<string | null>(null);
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
    void graphqlRequest<ReferenceData>(PRODUCTS_QUERY, undefined, token)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Impossible de charger les données.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, user, refreshKey]);

  useEffect(() => {
    if (!token || !user || tab !== "classifications") return;
    let cancelled = false;
    void graphqlRequest<{ adminLookups: Lookup[] }>(
      "query AdminLookups($kind: LookupKind!) { adminLookups(kind: $kind) { id name family { id name } unit applicableTo isActive sortOrder } }",
      { kind: lookupKind },
      token,
    ).then(({ adminLookups }) => { if (!cancelled) setLookupRows(adminLookups); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Impossible de charger les classifications."); });
    return () => { cancelled = true; };
  }, [token, user, tab, lookupKind, refreshKey]);

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
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setNotice("");
    const images = productForm.imageUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean).map((url, index) => ({
      url,
      alt: productForm.alt.trim() || null,
      isPrimary: index === 0,
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
    try {
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
      setProductForm(emptyProductForm());
      reload();
    } catch (reason) {
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
      if (productForm.id === product.id) setProductForm(emptyProductForm());
      setNotice("Produit supprimé.");
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
        sortOrder: Number(lookupForm.sortOrder) || 0,
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
      setLookupForm(emptyLookupForm());
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la classification.");
    } finally {
      setBusy(false);
    }
  }

  function editLookup(row: Lookup) {
    setEditingLookupId(row.id);
    setLookupForm({
      name: row.name,
      familyId: row.family?.id ?? "",
      unit: row.unit ?? "",
      applicableTo: row.applicableTo ?? "",
      sortOrder: String(row.sortOrder ?? 0),
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
    try {
      const input = { ...brandForm, sortOrder: Number(brandForm.sortOrder) || 0, logo: brandForm.logo || null, logoAlt: brandForm.logoAlt || null, description: brandForm.description || null };
      if (editingBrandId) {
        await graphqlRequest("mutation UpdateBrand($id: ID!, $input: BrandInput!) { updateBrand(id: $id, input: $input) { id name } }", { id: editingBrandId, input }, token);
        setNotice("Marque mise à jour.");
      } else {
        await graphqlRequest("mutation CreateBrand($input: BrandInput!) { createBrand(input: $input) { id name } }", { input }, token);
        setNotice("Marque créée.");
      }
      setEditingBrandId(null);
      setBrandForm(emptyBrandForm());
      reload();
    } catch (reason) {
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
    setBusy(true);
    setError("");
    try {
      const input = { ...categoryForm, brand: categoryForm.brand || null, sortOrder: Number(categoryForm.sortOrder) || 0 };
      if (editingCategoryId) {
        await graphqlRequest("mutation UpdateCategory($id: ID!, $input: CategoryInput!) { updateCategory(id: $id, input: $input) { id title } }", { id: editingCategoryId, input }, token);
        setNotice("Catégorie mise à jour.");
      } else {
        await graphqlRequest("mutation CreateCategory($input: CategoryInput!) { createCategory(input: $input) { id title } }", { input }, token);
        setNotice("Catégorie créée.");
      }
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm());
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la catégorie.");
    } finally {
      setBusy(false);
    }
  }

  function archiveCategory(category: Category) {
    setArchiveRequest({
      type: "category",
      id: category.id,
      label: category.title,
      successMessage: "Catégorie archivée.",
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

  const filteredProducts = (data?.products ?? []).filter((product) => {
    const term = search.trim().toLowerCase();
    return !term || `${product.name} ${product.reference ?? ""} ${product.brand?.name ?? ""}`.toLowerCase().includes(term);
  });

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

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "products", label: "Produits" },
    { id: "classifications", label: "Classifications" },
    { id: "brands", label: "Marques" },
    { id: "categories", label: "Catégories" },
    { id: "security", label: "Sécurité" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f6f1] text-[#171816] dark:bg-[#141513] dark:text-[#f2f0ea]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#1c1d1a]/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <a href="/" className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Funbike · Site public</a>
            <h1 className="mt-1 font-display text-xl font-bold sm:text-2xl">Administration</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-black/55 dark:text-white/55 sm:block">{user.email}</span>
            <button className={buttonSecondary} onClick={() => setLogoutModalOpen(true)}>Déconnexion</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Sections d’administration">
          {tabs.map((item) => (
            <button key={item.id} onClick={() => { setTab(item.id); setError(""); setNotice(""); }} className={`min-h-11 shrink-0 border-b-2 px-3 text-xs font-bold uppercase tracking-[0.08em] transition sm:px-4 ${tab === item.id ? "border-[#d2a900] text-[#171816] dark:text-white" : "border-transparent text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white"}`}>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {(error || notice) && (
          <div className={`mb-5 border-l-2 px-4 py-3 text-sm ${error ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "border-[#c49d00] bg-yellow-50 text-[#5f4b00] dark:bg-yellow-950/20 dark:text-yellow-100"}`} role={error ? "alert" : "status"}>
            {error || notice}
          </div>
        )}
        {loading && <p className="mb-4 text-xs text-black/45 dark:text-white/45">Chargement des données…</p>}

        {tab === "products" && (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(330px,0.95fr)]">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Catalogue</p><h2 className="mt-1 font-display text-2xl font-bold">Produits</h2></div>
                <button className={buttonPrimary} onClick={() => { setProductForm(emptyProductForm()); setError(""); setNotice(""); }}>+ Nouveau produit</button>
              </div>
              <Field label="Rechercher"><input className={fieldClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, référence ou marque" /></Field>
              <div className="overflow-hidden border border-black/10 bg-white dark:border-white/10 dark:bg-[#1c1d1a]">
                {filteredProducts.length === 0 ? <p className="p-6 text-sm text-black/50 dark:text-white/50">Aucun produit trouvé. Les nouveaux produits sont enregistrés en brouillon.</p> : (
                  <ul className="divide-y divide-black/10 dark:divide-white/10">
                    {filteredProducts.map((product) => (
                      <li key={`${product.__typename}-${product.id}`} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold">{product.name}</span><span className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${product.status === "PUBLISHED" ? "border-emerald-600/30 text-emerald-700 dark:text-emerald-300" : "border-black/15 text-black/50 dark:border-white/15 dark:text-white/50"}`}>{product.status === "PUBLISHED" ? "Publié" : "Brouillon"}</span></div>
                          <p className="mt-1 truncate text-xs text-black/50 dark:text-white/50">{productKindLabel(product.__typename)}{product.reference ? ` · ${product.reference}` : ""}{product.price ? ` · ${product.price}` : ""}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className={buttonSecondary} onClick={() => startProductEdit(product)}>Modifier</button>
                          <button className={buttonSecondary} disabled={busy} onClick={() => void changePublication(product)}>{product.status === "PUBLISHED" ? "Dépublier" : "Publier"}</button>
                          <button className="min-h-10 border border-red-300 px-3 text-[10px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30" disabled={busy} onClick={() => void deleteProduct(product)}>Supprimer</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <form onSubmit={saveProduct} className="space-y-4 border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1c1d1a] sm:p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c6d00] dark:text-[#ffd100]">{productForm.id ? "Modifier" : "Créer"}</p><h2 className="mt-1 font-display text-xl font-bold">{productForm.id ? "Fiche produit" : "Nouveau produit"}</h2></div>{productForm.id && <button type="button" className={buttonSecondary} onClick={() => setProductForm(emptyProductForm())}>Annuler</button>}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Type"><select className={fieldClass} value={productForm.kind} disabled={Boolean(productForm.id)} onChange={(event) => setProductForm({ ...productForm, kind: event.target.value as ProductKind })}><option value="MOTORCYCLE">Moto</option><option value="SPARE_PART">Pièce détachée</option><option value="EQUIPMENT">Équipement</option><option value="ACCESSORY">Accessoire</option></select></Field>
                <Field label="Nom"><input className={fieldClass} required maxLength={255} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></Field>
                <Field label="Référence commerciale"><input className={fieldClass} maxLength={160} value={productForm.reference} onChange={(event) => setProductForm({ ...productForm, reference: event.target.value })} /></Field>
                <Field label="Prix (texte libre)"><input className={fieldClass} maxLength={255} placeholder="Ex. 1 250 000 Ar ou Sur devis" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></Field>
                <Field label="Marque fabricant"><select className={fieldClass} value={productForm.brandId} onChange={(event) => setProductForm({ ...productForm, brandId: event.target.value })}><option value="">Aucune</option>{(data?.brands ?? []).map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field>
                <Field label="Sous-famille"><select className={fieldClass} value={productForm.subfamilyId} onChange={(event) => setProductForm({ ...productForm, subfamilyId: event.target.value })}><option value="">Aucune</option>{(data?.subfamilies ?? []).filter((item) => productForm.kind !== "MOTORCYCLE" || !productForm.familyId || item.family?.id === productForm.familyId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              </div>
              {productForm.kind === "MOTORCYCLE" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Famille moto"><select className={fieldClass} value={productForm.familyId} onChange={(event) => { const familyId = event.target.value; const currentSubfamily = data?.subfamilies.find((item) => item.id === productForm.subfamilyId); setProductForm({ ...productForm, familyId, subfamilyId: currentSubfamily && currentSubfamily.family?.id !== familyId ? "" : productForm.subfamilyId }); }}><option value="">Aucune</option>{(data?.families ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Tag"><input className={fieldClass} value={productForm.tag} onChange={(event) => setProductForm({ ...productForm, tag: event.target.value })} /></Field><Field label="Texte alternatif"><input className={fieldClass} value={productForm.alt} onChange={(event) => setProductForm({ ...productForm, alt: event.target.value })} /></Field><Field label="Recommandation"><input className={fieldClass} value={productForm.recommendation} onChange={(event) => setProductForm({ ...productForm, recommendation: event.target.value })} /></Field></div>}
              {productForm.kind === "SPARE_PART" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Type de pièce"><select className={fieldClass} value={productForm.partTypeId} onChange={(event) => setProductForm({ ...productForm, partTypeId: event.target.value })}><option value="">Aucun</option>{(data?.partTypes ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Catégorie catalogue"><select className={fieldClass} value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Aucune</option>{(data?.accessoryCategories ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Compatibilité universelle"><select className={fieldClass} value={productForm.universalCompatibility} onChange={(event) => setProductForm({ ...productForm, universalCompatibility: event.target.value })}><option value="">Non renseignée</option><option value="true">Oui</option><option value="false">Non</option></select></Field><Field label="Marques compatibles"><select multiple className={`${fieldClass} min-h-24`} value={productForm.compatibleBrandIds} onChange={(event) => setProductForm({ ...productForm, compatibleBrandIds: Array.from(event.currentTarget.selectedOptions, (option) => option.value) })}>{(data?.brands ?? []).map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field><div className="sm:col-span-2"><Field label="URL source"><input className={fieldClass} value={productForm.sourceUrl} onChange={(event) => setProductForm({ ...productForm, sourceUrl: event.target.value })} /></Field></div></div>}
              {(productForm.kind === "EQUIPMENT" || productForm.kind === "ACCESSORY") && <div className="grid gap-3 sm:grid-cols-2"><Field label={productForm.kind === "EQUIPMENT" ? "Type d’équipement" : "Type d’accessoire"}><select className={fieldClass} value={productForm.kind === "EQUIPMENT" ? productForm.equipmentTypeId : productForm.accessoryTypeId} onChange={(event) => setProductForm({ ...productForm, [productForm.kind === "EQUIPMENT" ? "equipmentTypeId" : "accessoryTypeId"]: event.target.value })}><option value="">Aucun</option>{(productForm.kind === "EQUIPMENT" ? data?.equipmentTypes ?? [] : data?.accessoryTypes ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Catégorie catalogue"><select className={fieldClass} value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Aucune</option>{(data?.accessoryCategories ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Usages"><select multiple className={`${fieldClass} min-h-24`} value={productForm.usageIds} onChange={(event) => setProductForm({ ...productForm, usageIds: Array.from(event.currentTarget.selectedOptions, (option) => option.value) })}>{(data?.productUsages ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="URL source"><input className={fieldClass} value={productForm.sourceUrl} onChange={(event) => setProductForm({ ...productForm, sourceUrl: event.target.value })} /></Field></div>}
              <Field label="Description"><textarea className={`${fieldClass} min-h-24 resize-y`} value={productForm.desc} onChange={(event) => setProductForm({ ...productForm, desc: event.target.value })} /></Field>
              <Field label="Images · une URL par ligne" hint="La première image devient l’image principale."><textarea className={`${fieldClass} min-h-20 resize-y`} value={productForm.imageUrls} onChange={(event) => setProductForm({ ...productForm, imageUrls: event.target.value })} /></Field>
              <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">Spécifications</span><button type="button" className="text-xs font-bold text-[#806300] underline underline-offset-2 dark:text-[#ffd100]" onClick={() => setProductForm({ ...productForm, specs: [...productForm.specs, { characteristicId: "", value: "" }] })}>+ Ajouter</button></div>{productForm.specs.map((spec, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><select aria-label="Caractéristique" className={fieldClass} value={spec.characteristicId} onChange={(event) => setProductForm({ ...productForm, specs: productForm.specs.map((row, rowIndex) => rowIndex === index ? { ...row, characteristicId: event.target.value } : row) })}><option value="">Caractéristique…</option>{(data?.characteristicDefinitions ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}{item.unit ? ` (${item.unit})` : ""}</option>)}</select><input aria-label="Valeur" className={fieldClass} placeholder="Valeur" value={spec.value} onChange={(event) => setProductForm({ ...productForm, specs: productForm.specs.map((row, rowIndex) => rowIndex === index ? { ...row, value: event.target.value } : row) })} /><button type="button" aria-label="Retirer la spécification" className="px-2 text-red-600" onClick={() => setProductForm({ ...productForm, specs: productForm.specs.filter((_, rowIndex) => rowIndex !== index) })}>×</button></div>)}</div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10"><p className="text-[11px] text-black/45 dark:text-white/45">Les nouveaux produits restent en brouillon jusqu’à publication.</p><button type="submit" className={buttonPrimary} disabled={busy}>{busy ? "Enregistrement…" : productForm.id ? "Enregistrer" : "Créer le produit"}</button></div>
            </form>
          </section>
        )}

        {tab === "classifications" && (
          <section className="grid gap-6 lg:grid-cols-[minmax(240px,0.7fr)_minmax(320px,1fr)_minmax(300px,1fr)]">
            <div className="space-y-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Référentiels</p><h2 className="mt-1 font-display text-2xl font-bold">Classifications</h2></div><Field label="Type"><select className={fieldClass} value={lookupKind} onChange={(event) => { setLookupKind(event.target.value as LookupKind); setEditingLookupId(null); setLookupForm(emptyLookupForm()); }}>
              {LOOKUP_KINDS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select></Field><div className="border border-black/10 bg-white dark:border-white/10 dark:bg-[#1c1d1a]"><ul className="divide-y divide-black/10 dark:divide-white/10">{lookupRows.map((row) => <li key={row.id} className="flex items-center gap-2 p-3"><button className="min-w-0 flex-1 text-left" onClick={() => editLookup(row)}><span className="block truncate text-sm font-semibold">{row.name}</span><span className="text-[10px] text-black/45 dark:text-white/45">{row.family?.name ? `${row.family.name} · ` : ""}{row.isActive ? "Actif" : "Archivé"}</span></button><button className="text-xs text-red-600 dark:text-red-300" onClick={() => void archiveLookup(row)}>Archiver</button></li>)}{lookupRows.length === 0 && <li className="p-4 text-sm text-black/45 dark:text-white/45">Aucune valeur enregistrée.</li>}</ul></div></div>
            <form onSubmit={saveLookup} className="space-y-4 border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1c1d1a]"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingLookupId ? "Modification" : "Nouvelle valeur"}</p><h3 className="mt-1 font-display text-xl font-bold">{LOOKUP_KINDS.find((item) => item.key === lookupKind)?.label}</h3></div><Field label="Nom"><input className={fieldClass} required maxLength={160} value={lookupForm.name} onChange={(event) => setLookupForm({ ...lookupForm, name: event.target.value })} /></Field>{lookupKind === "SUBFAMILY" && <Field label="Famille parente"><select required className={fieldClass} value={lookupForm.familyId} onChange={(event) => setLookupForm({ ...lookupForm, familyId: event.target.value })}><option value="">Choisir…</option>{(data?.families ?? []).map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select></Field>}{lookupKind === "CHARACTERISTIC" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Unité"><input className={fieldClass} value={lookupForm.unit} onChange={(event) => setLookupForm({ ...lookupForm, unit: event.target.value })} placeholder="cm³, mm, kg…" /></Field><Field label="Applicable à"><input className={fieldClass} value={lookupForm.applicableTo} onChange={(event) => setLookupForm({ ...lookupForm, applicableTo: event.target.value })} placeholder="Moto, pièce…" /></Field></div>}<div className="grid gap-3 sm:grid-cols-2"><Field label="Ordre d’affichage"><input className={fieldClass} type="number" value={lookupForm.sortOrder} onChange={(event) => setLookupForm({ ...lookupForm, sortOrder: event.target.value })} /></Field><Field label="Statut"><select className={fieldClass} value={String(lookupForm.isActive)} onChange={(event) => setLookupForm({ ...lookupForm, isActive: event.target.value === "true" })}><option value="true">Actif</option><option value="false">Archivé</option></select></Field></div><div className="flex gap-2">{editingLookupId && <button type="button" className={buttonSecondary} onClick={() => { setEditingLookupId(null); setLookupForm(emptyLookupForm()); }}>Annuler</button>}<button className={buttonPrimary} type="submit" disabled={busy}>{editingLookupId ? "Enregistrer" : "Créer"}</button></div></form>
            <aside className="border border-black/10 bg-white p-5 text-sm leading-relaxed text-black/60 dark:border-white/10 dark:bg-[#1c1d1a] dark:text-white/60"><h3 className="font-display text-lg font-bold text-[#171816] dark:text-white">Valeurs administrables</h3><p className="mt-2">Les classifications sont stockées comme des enregistrements en base de données. Vous pouvez créer de nouvelles familles, types, catégories, usages ou caractéristiques sans modifier le code.</p><p className="mt-3">L’archivage masque une valeur des choix publics sans supprimer les associations historiques des produits.</p></aside>
          </section>
        )}

        {tab === "brands" && (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"><div className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Fabricants</p><h2 className="mt-1 font-display text-2xl font-bold">Marques</h2></div><div className="border border-black/10 bg-white dark:border-white/10 dark:bg-[#1c1d1a]"><ul className="divide-y divide-black/10 dark:divide-white/10">{(data?.adminBrands ?? []).map((brand) => <li key={brand.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{brand.name}</p><p className="text-xs text-black/45 dark:text-white/45">{brand.slug} · {brand.isActive ? "Active" : "Archivée"}</p></div><button className={buttonSecondary} onClick={() => { setEditingBrandId(brand.id); setBrandForm({ slug: brand.slug, name: brand.name, logo: brand.logo ?? "", logoAlt: brand.logoAlt ?? "", description: brand.description ?? "", sortOrder: String(brand.sortOrder ?? 0), isActive: brand.isActive }); }}>Modifier</button><button className="text-xs font-bold text-red-600 dark:text-red-300" onClick={() => void archiveBrand(brand)}>Archiver</button></li>)}{!data?.adminBrands.length && <li className="p-5 text-sm text-black/45 dark:text-white/45">Aucune marque enregistrée.</li>}</ul></div></div>
            <form onSubmit={saveBrand} className="space-y-4 border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1c1d1a]"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingBrandId ? "Modification" : "Nouvelle marque"}</p><h3 className="mt-1 font-display text-xl font-bold">Fiche marque</h3></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Nom"><input className={fieldClass} required value={brandForm.name} onChange={(event) => setBrandForm({ ...brandForm, name: event.target.value })} /></Field><Field label="Identifiant URL (slug)"><input className={fieldClass} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="ex. yamaha-motor" value={brandForm.slug} onChange={(event) => setBrandForm({ ...brandForm, slug: event.target.value.toLowerCase() })} /></Field><Field label="Logo · URL"><input className={fieldClass} value={brandForm.logo} onChange={(event) => setBrandForm({ ...brandForm, logo: event.target.value })} /></Field><Field label="Texte alternatif du logo"><input className={fieldClass} value={brandForm.logoAlt} onChange={(event) => setBrandForm({ ...brandForm, logoAlt: event.target.value })} /></Field></div><Field label="Description"><textarea className={`${fieldClass} min-h-24`} value={brandForm.description} onChange={(event) => setBrandForm({ ...brandForm, description: event.target.value })} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Ordre"><input className={fieldClass} type="number" value={brandForm.sortOrder} onChange={(event) => setBrandForm({ ...brandForm, sortOrder: event.target.value })} /></Field><Field label="Statut"><select className={fieldClass} value={String(brandForm.isActive)} onChange={(event) => setBrandForm({ ...brandForm, isActive: event.target.value === "true" })}><option value="true">Active</option><option value="false">Archivée</option></select></Field></div><div className="flex gap-2">{editingBrandId && <button type="button" className={buttonSecondary} onClick={() => { setEditingBrandId(null); setBrandForm(emptyBrandForm()); }}>Annuler</button>}<button className={buttonPrimary} type="submit" disabled={busy}>{editingBrandId ? "Enregistrer" : "Créer la marque"}</button></div></form>
          </section>
        )}

        {tab === "categories" && (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]"><div className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Accueil</p><h2 className="mt-1 font-display text-2xl font-bold">Catégories éditoriales</h2></div><div className="border border-black/10 bg-white dark:border-white/10 dark:bg-[#1c1d1a]"><ul className="divide-y divide-black/10 dark:divide-white/10">{(data?.adminCategories ?? []).map((category) => <li key={category.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{category.title}</p><p className="truncate text-xs text-black/45 dark:text-white/45">{category.to} · {category.isActive ? "Active" : "Archivée"}</p></div><button className={buttonSecondary} onClick={() => { setEditingCategoryId(category.id); setCategoryForm({ title: category.title, desc: category.desc, src: category.src, to: category.to, brand: category.brand ?? "", sortOrder: String(category.sortOrder ?? 0), isActive: category.isActive }); }}>Modifier</button><button className="text-xs font-bold text-red-600 dark:text-red-300" onClick={() => void archiveCategory(category)}>Archiver</button></li>)}{!data?.adminCategories.length && <li className="p-5 text-sm text-black/45 dark:text-white/45">Aucune catégorie enregistrée.</li>}</ul></div></div>
            <form onSubmit={saveCategory} className="space-y-4 border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1c1d1a]"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6d00] dark:text-[#ffd100]">{editingCategoryId ? "Modification" : "Nouvelle catégorie"}</p><h3 className="mt-1 font-display text-xl font-bold">Lien éditorial</h3></div><Field label="Titre"><input className={fieldClass} required value={categoryForm.title} onChange={(event) => setCategoryForm({ ...categoryForm, title: event.target.value })} /></Field><Field label="Description"><textarea className={`${fieldClass} min-h-20`} required value={categoryForm.desc} onChange={(event) => setCategoryForm({ ...categoryForm, desc: event.target.value })} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Image · URL"><input className={fieldClass} required value={categoryForm.src} onChange={(event) => setCategoryForm({ ...categoryForm, src: event.target.value })} /></Field><Field label="Route"><input className={fieldClass} required placeholder="/motos" value={categoryForm.to} onChange={(event) => setCategoryForm({ ...categoryForm, to: event.target.value })} /></Field><Field label="Marque (facultatif)"><input className={fieldClass} value={categoryForm.brand} onChange={(event) => setCategoryForm({ ...categoryForm, brand: event.target.value })} /></Field><Field label="Ordre"><input className={fieldClass} type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: event.target.value })} /></Field><Field label="Statut"><select className={fieldClass} value={String(categoryForm.isActive)} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.value === "true" })}><option value="true">Active</option><option value="false">Archivée</option></select></Field></div><div className="flex gap-2">{editingCategoryId && <button type="button" className={buttonSecondary} onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategoryForm()); }}>Annuler</button>}<button className={buttonPrimary} type="submit" disabled={busy}>{editingCategoryId ? "Enregistrer" : "Créer la catégorie"}</button></div></form>
          </section>
        )}

        {tab === "security" && (
          <section className="mx-auto max-w-2xl space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c6d00] dark:text-[#ffd100]">Compte administrateur</p>
              <h2 className="mt-1 font-display text-2xl font-bold">Sécurité</h2>
              <p className="mt-2 text-sm text-black/55 dark:text-white/55">
                Connecté en tant que <strong>{user.email}</strong>. Chaque changement vérifie le mot de passe actuel,
                révoque les sessions actives et vous demande de vous reconnecter.
              </p>
            </div>

            <form onSubmit={updateEmail} className="space-y-4 border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1c1d1a]">
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

            <form onSubmit={updatePassword} className="space-y-4 border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1c1d1a]">
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

            <div className="border border-black/10 bg-white p-5 text-sm leading-relaxed text-black/55 dark:border-white/10 dark:bg-[#1c1d1a] dark:text-white/55">
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

import type { ReactNode } from "react";

export type BrandSectionFormValue = {
  section: string;
  order: string;
  label: string;
  routeId: string;
  filterable: string;
  displayMode: string;
  homeFeatured: string;
  footerOrder: string;
  footerFeaturedOrder: string;
};

const sections = [
  { value: "motos", label: "Motos" },
  { value: "equipements", label: "Équipements pilote" },
  { value: "pieces-detachees", label: "Pièces détachées" },
  { value: "partenaires", label: "Partenaires / logos d’accueil" },
] as const;

const sectionLabel = (section: string) => sections.find((item) => item.value === section)?.label ?? section;
const fieldClass = "w-full min-w-0 border border-black/15 bg-white px-3 py-2.5 text-sm leading-5 text-[#171816] outline-none transition placeholder:text-black/35 focus:border-[#c49d00] focus:ring-2 focus:ring-[#ffd100]/20 dark:border-white/15 dark:bg-[#1c1d1a] dark:text-[#f2f0ea] dark:placeholder:text-white/35";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[10px] font-bold uppercase leading-4 tracking-[0.1em] text-black/55 dark:text-white/55">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-4 text-black/45 dark:text-white/45">{hint}</span>}
    </label>
  );
}

function emptyAssociation(section: string, order: number): BrandSectionFormValue {
  return {
    section,
    order: String(order),
    label: "",
    routeId: "",
    filterable: "",
    displayMode: "",
    homeFeatured: "",
    footerOrder: "",
    footerFeaturedOrder: "",
  };
}

function TriStateField({
  label,
  value,
  onChange,
  yes,
  no,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  yes: string;
  no: string;
}) {
  return (
    <Field label={label}>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Valeur par défaut du site</option>
        <option value="true">{yes}</option>
        <option value="false">{no}</option>
      </select>
    </Field>
  );
}

export default function BrandSectionAssociationsEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: BrandSectionFormValue[];
  onChange: (value: BrandSectionFormValue[]) => void;
  disabled?: boolean;
}) {
  function toggleSection(section: string, checked: boolean) {
    if (checked) {
      if (value.some((association) => association.section === section)) return;
      onChange([...value, emptyAssociation(section, value.length)]);
      return;
    }
    onChange(value.filter((association) => association.section !== section));
  }

  function updateAssociation(index: number, patch: Partial<BrandSectionFormValue>) {
    onChange(value.map((association, currentIndex) => currentIndex === index ? { ...association, ...patch } : association));
  }

  return (
    <fieldset className="space-y-4 border-t border-black/10 pt-5 dark:border-white/10">
      <legend className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-black/65 dark:text-white/65">Rubriques associées</legend>
      <p className="-mt-2 text-xs leading-5 text-black/45 dark:text-white/45">
        Choisissez les zones du site où la marque apparaît, puis réglez son ordre, son libellé et ses options.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sections.map((option) => (
          <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 border border-black/10 px-3 text-sm hover:bg-black/[0.025] dark:border-white/10 dark:hover:bg-white/[0.035]">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.some((association) => association.section === option.value)}
              onChange={(event) => toggleSection(option.value, event.target.checked)}
              className="accent-[#c49d00]"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {value.map((association, index) => (
        <section key={association.section} className="space-y-4 border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-display text-base font-bold">{sectionLabel(association.section)}</h4>
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleSection(association.section, false)}
              className="text-[10px] font-bold uppercase tracking-[0.08em] text-red-700 underline underline-offset-2 disabled:opacity-50 dark:text-red-300"
            >
              Retirer cette rubrique
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ordre dans cette rubrique">
              <input className={fieldClass} type="number" min={0} max={100000} step={1} inputMode="numeric" disabled={disabled} value={association.order} onChange={(event) => updateAssociation(index, { order: event.target.value })} />
            </Field>
            <Field label="Libellé affiché (facultatif)" hint="Par défaut, le nom de la marque est utilisé.">
              <input className={fieldClass} maxLength={160} disabled={disabled} value={association.label} onChange={(event) => updateAssociation(index, { label: event.target.value })} />
            </Field>
            <Field label="Identifiant de route ou filtre (facultatif)">
              <input className={fieldClass} maxLength={160} disabled={disabled} value={association.routeId} onChange={(event) => updateAssociation(index, { routeId: event.target.value })} placeholder="Ex. spare-tvs" />
            </Field>
            <Field label="Mode d’affichage">
              <select className={fieldClass} disabled={disabled} value={association.displayMode} onChange={(event) => updateAssociation(index, { displayMode: event.target.value })}>
                <option value="">Par défaut</option>
                <option value="catalogue">Catalogue</option>
                <option value="partner-info">Fiche partenaire / sur demande</option>
              </select>
            </Field>
            <TriStateField label="Utilisable comme filtre" value={association.filterable} onChange={(filterable) => updateAssociation(index, { filterable })} yes="Oui" no="Non" />
            <TriStateField label="Mise en avant sur l’accueil" value={association.homeFeatured} onChange={(homeFeatured) => updateAssociation(index, { homeFeatured })} yes="Oui" no="Non" />
            <Field label="Ordre dans le pied de page (facultatif)">
              <input className={fieldClass} type="number" min={0} max={100000} step={1} inputMode="numeric" disabled={disabled} value={association.footerOrder} onChange={(event) => updateAssociation(index, { footerOrder: event.target.value })} />
            </Field>
            <Field label="Ordre de mise en avant du pied de page (facultatif)">
              <input className={fieldClass} type="number" min={0} max={100000} step={1} inputMode="numeric" disabled={disabled} value={association.footerFeaturedOrder} onChange={(event) => updateAssociation(index, { footerFeaturedOrder: event.target.value })} />
            </Field>
          </div>
        </section>
      ))}
      {value.length === 0 && <p className="border border-dashed border-black/15 px-3 py-3 text-xs text-black/45 dark:border-white/15 dark:text-white/45">Aucune rubrique associée.</p>}
    </fieldset>
  );
}

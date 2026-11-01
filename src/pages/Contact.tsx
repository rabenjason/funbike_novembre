import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faClock, faEnvelope, faLocationDot, faPhone } from "@fortawesome/free-solid-svg-icons";
import { PageHeader } from "../components/Layout";
import { PARTS, TVS_PARTS, SHERCO_PARTS, FANTIC_PARTS, TVS_ACCESSORIES } from "../data";
import { content } from "../constants";

const CONTACT_EMAIL = content.site.email;
const CONTACT_ICONS = [faLocationDot, faClock, faPhone, faEnvelope];
const CONTACT_INFO = content.contact.infos.map((item, index) => ({
  ...item,
  icon: CONTACT_ICONS[index],
  href: index === 2 ? content.site.telephoneLien : index === 3 ? `mailto:${CONTACT_EMAIL}` : undefined,
}));

export default function Contact({ inquiryId }: { inquiryId?: string }) {
  const [sent, setSent] = useState(false);
  const accessory = [...TVS_ACCESSORIES, ...PARTS, ...TVS_PARTS, ...SHERCO_PARTS, ...FANTIC_PARTS].find(
    (item) => item.id === inquiryId,
  );
  const inquirySubject = accessory?.kind === "tvs" ? "tvs-accessoires" : accessory ? "pieces" : "";

  return (
    <div className="bg-white dark:bg-[#141513]">
      <PageHeader title={content.contact.titre} subtitle={content.contact.description} />

      <div className="mx-auto grid w-full max-w-(--container-site) gap-8 px-4 py-10 sm:gap-10 sm:px-7 sm:py-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-10 lg:py-14">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="fluid-eyebrow font-bold uppercase text-[#98741b] dark:text-[#ffd100]">{content.contact.surTitre}</p>
          <h2 className="fluid-h2 mt-3 max-w-sm font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
            {content.contact.titreAside}
          </h2>
          <div className="mt-8 border-t border-black/15 dark:border-white/15">
            {CONTACT_INFO.map((item) => (
              <div key={item.label} className="grid grid-cols-[1.5rem_1fr] gap-3 border-b border-black/15 py-4 dark:border-white/15">
                <FontAwesomeIcon icon={item.icon} className="mt-1 text-xs text-[#98741b] dark:text-[#ffd100]" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/45 dark:text-white/45">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="mt-1 inline-block text-sm font-medium text-[#171816] hover:text-[#98741b] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]">
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-[#171816] dark:text-[#f2f0ea]">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-black/50 dark:text-white/50">
            {content.contact.aideChat}
          </p>
        </motion.aside>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            const subject = (form.elements.namedItem("subject") as HTMLSelectElement).selectedOptions[0]?.textContent ?? content.contact.sujetEmailDefaut;
            const body = [
              content.contact.salutationEmail,
              "",
              String(values.get("message") ?? ""),
              "",
              `${content.contact.nomEmail}${String(values.get("name") ?? "")}`,
              `${content.contact.telephoneEmail}${String(values.get("phone") ?? "")}`,
              `${content.contact.emailEmail}${String(values.get("email") ?? "")}`,
              String(values.get("whatsapp") ?? "")
                ? `${content.contact.whatsappEmail}${String(values.get("whatsapp"))}`
                : content.contact.whatsappNonRenseigne,
            ].join("\n");
            window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            setSent(true);
          }}
          className="glass-panel border-t border-black/20 p-5 dark:border-white/20 sm:p-8"
        >
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="fluid-eyebrow font-bold uppercase text-[#98741b] dark:text-[#ffd100]">{content.contact.formulaireSurTitre}</p>
              <h2 className="fluid-h3 mt-2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">{content.contact.formulaireTitre}</h2>
            </div>
            <span className="hidden font-display text-xs text-black/35 sm:block dark:text-white/35">{content.contact.compteur}</span>
          </div>

          <div className="grid gap-x-6 sm:grid-cols-2">
            {[
              { label: content.contact.nomComplet, name: "name" },
              { label: content.contact.telephone, name: "phone" },
            ].map(({ label, name }) => (
              <label key={label} className="mb-5 block">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">{label}</span>
                <input required name={name} className="mt-1.5 w-full border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition placeholder:text-black/30 focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:placeholder:text-white/30 dark:focus:border-[#ffd100]" />
              </label>
            ))}
          </div>
          <label className="mb-5 block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">{content.contact.email}</span>
            <input type="email" required name="email" className="mt-1.5 w-full border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:focus:border-[#ffd100]" />
          </label>

          <label className="mb-1.5 block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">
              {content.contact.whatsapp} <span className="font-semibold normal-case tracking-normal text-black/35 dark:text-white/35">{content.contact.optionnel}</span>
            </span>
            <input
              type="tel"
              inputMode="tel"
              name="whatsapp"
              placeholder={content.contact.whatsappPlaceholder}
              className="mt-1.5 w-full border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition placeholder:text-black/30 focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:placeholder:text-white/30 dark:focus:border-[#ffd100]"
            />
          </label>
          <p className="mb-5 text-[11px] leading-5 text-black/45 dark:text-white/45">
            {content.contact.whatsappNote}
          </p>

          <label className="mb-5 block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">{content.contact.sujet}</span>
            <select
              required
              name="subject"
              defaultValue={inquirySubject}
              className="contact-subject mt-1.5 min-h-11 w-full cursor-pointer border-x-0 border-b border-t-0 border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition focus:border-[#98741b] focus:outline-none focus:ring-0 dark:border-white/20 dark:text-[#f2f0ea] dark:focus:border-[#ffd100]"
            >
              <option value="" disabled className="text-black/50">{content.contact.choisirSujet}</option>
              {content.contact.sujets.map((subject) => (
                <option key={subject.value} value={subject.value}>{subject.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">{content.contact.message}</span>
            <textarea
              required
              name="message"
              rows={4}
              defaultValue={accessory
                ? `${content.contact.demandePiecePrefix}${accessory.name}${content.contact.demandePieceSuffix}`
                : ""}
              className="mt-1.5 w-full resize-y border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:focus:border-[#ffd100]"
            />
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button className="inline-flex items-center gap-3 bg-[#ffd100] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#171816] transition hover:bg-[#ffe36b]">
              {content.contact.envoyer} <FontAwesomeIcon icon={faArrowRight} />
            </button>
            <AnimatePresence>
              {sent && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
                >
                  {content.contact.confirmation}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-black/40 dark:text-white/40">
            {content.contact.noteEnvoi}
          </p>
        </motion.form>
      </div>
    </div>
  );
}
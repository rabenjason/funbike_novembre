import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { getImageContentType, IMAGE_FILE_ACCEPT, MAX_IMAGE_UPLOAD_SIZE } from "../lib/imageUploads";

export type ImageSelection = {
  id: string;
  url: string | null;
  previewUrl: string;
  name: string;
  file?: File;
};

type ImageFilePickerProps = {
  images: ImageSelection[];
  onChange: (images: ImageSelection[]) => void;
  multiple?: boolean;
  maxImages?: number;
  disabled?: boolean;
  primaryImageId?: string | null;
  onSetPrimary?: (imageId: string) => void;
};

const secondaryButton = "inline-flex min-h-10 items-center justify-center border border-black/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#171816] transition hover:border-[#c49d00] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-[#f2f0ea]";

export default function ImageFilePicker({
  images,
  onChange,
  multiple = false,
  maxImages = 1,
  disabled = false,
  primaryImageId = null,
  onSetPrimary,
}: ImageFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previousImages = useRef(images);
  const [pickerError, setPickerError] = useState("");

  useEffect(() => {
    const currentIds = new Set(images.map((image) => image.id));
    for (const previousImage of previousImages.current) {
      if (previousImage.file && !currentIds.has(previousImage.id)) {
        URL.revokeObjectURL(previousImage.previewUrl);
      }
    }
    previousImages.current = images;
  }, [images]);

  useEffect(() => () => {
    for (const image of previousImages.current) {
      if (image.file) URL.revokeObjectURL(image.previewUrl);
    }
  }, []);

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    setPickerError("");
    if (files.length === 0) return;

    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      if (!getImageContentType(file)) {
        rejected.push(`${file.name} : format non pris en charge.`);
      } else if (file.size === 0 || file.size > MAX_IMAGE_UPLOAD_SIZE) {
        rejected.push(`${file.name} : taille vide ou supérieure à 10 Mo.`);
      } else {
        accepted.push(file);
      }
    }

    const available = multiple ? Math.max(0, maxImages - images.length) : 1;
    const chosen = accepted.slice(0, available);
    if (accepted.length > chosen.length) {
      rejected.push(`La limite est de ${maxImages} photo${maxImages > 1 ? "s" : ""}.`);
    }
    if (rejected.length > 0) setPickerError(rejected.join(" "));
    if (chosen.length === 0) return;

    const additions = chosen.map((file): ImageSelection => ({
      id: crypto.randomUUID(),
      url: null,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      file,
    }));
    onChange(multiple ? [...images, ...additions] : additions);
  }

  function removeImage(image: ImageSelection) {
    setPickerError("");
    onChange(images.filter((selected) => selected.id !== image.id));
  }

  const addDisabled = disabled || (multiple && images.length >= maxImages);
  const buttonLabel = multiple ? "Ajouter des photos" : images.length > 0 ? "Remplacer la photo" : "Ajouter une photo";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-black/50 dark:text-white/50">
          {images.length === 0
            ? "Aucune photo sélectionnée."
            : `${images.length} photo${images.length === 1 ? "" : "s"} sélectionnée${images.length === 1 ? "" : "s"}.`}
        </p>
        <button
          type="button"
          className={secondaryButton}
          disabled={addDisabled}
          onClick={() => inputRef.current?.click()}
        >
          {buttonLabel}
        </button>
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        multiple={multiple}
        tabIndex={-1}
        aria-label={multiple ? "Choisir des photos" : "Choisir une photo"}
        onChange={handleFilesSelected}
      />
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={image.id} className="min-w-0 overflow-hidden border border-black/10 dark:border-white/10">
              <div className="aspect-[4/3] bg-black/[0.03] dark:bg-white/[0.04]">
                <img
                  src={image.previewUrl}
                  alt=""
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2 p-2">
                <span className="min-w-0 truncate text-[10px] text-black/55 dark:text-white/55" title={`Photo ${index + 1} · ${image.file?.name ?? "actuelle"}`}>
                  Photo {index + 1} · {image.file?.name ?? "actuelle"}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[10px] font-bold uppercase text-red-700 underline underline-offset-2 dark:text-red-300"
                  disabled={disabled}
                  aria-label={`Supprimer la photo ${index + 1}`}
                  onClick={() => removeImage(image)}
                >
                  Supprimer
                </button>
              </div>
              {onSetPrimary && (
                <div className="px-2 pb-2">
                  {primaryImageId === image.id ? (
                    <span className="inline-flex bg-[#ffd100] px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#171816]">
                      Image principale
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-[9px] font-bold uppercase tracking-wide text-black/55 underline underline-offset-2 hover:text-[#806300] disabled:opacity-50 dark:text-white/55 dark:hover:text-[#ffd100]"
                      disabled={disabled}
                      onClick={() => onSetPrimary(image.id)}
                    >
                      Définir comme principale
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-black/40 dark:text-white/40">JPG, PNG, WebP, GIF ou AVIF · 10 Mo maximum par photo.</p>
      {pickerError && <p className="text-xs text-red-700 dark:text-red-300" role="alert">{pickerError}</p>}
    </div>
  );
}

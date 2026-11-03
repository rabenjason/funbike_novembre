export const MAX_IMAGE_UPLOAD_SIZE = 10 * 1024 * 1024;
export const IMAGE_FILE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export function getImageContentType(file: File): string | null {
  const type = file.type.toLowerCase().split(";")[0].trim();
  if (Object.values(IMAGE_MIME_TYPES).includes(type)) return type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_TYPES[extension] ?? null;
}

async function readUploadResponse(response: Response): Promise<{ url?: string }> {
  let result: { url?: string; error?: string };
  try {
    result = (await response.json()) as { url?: string; error?: string };
  } catch {
    throw new Error(`Le serveur d’images a renvoyé une réponse invalide (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result.error || `Échec de l’importation de l’image (${response.status}).`);
  }
  return result;
}

function unsupportedFormatMessage(file: File): string {
  const lowerName = file.name.toLowerCase();
  const isHeic = /\.(heic|heif)$/.test(lowerName) || file.type === "image/heic" || file.type === "image/heif";
  if (isHeic) {
    return `Photo HEIC/HEIF non prise en charge : ${file.name}. Convertissez-la en JPG ou PNG avant de l’importer.`;
  }
  return `Format d’image non pris en charge : ${file.name}. Utilisez JPG, PNG, WebP, GIF ou AVIF.`;
}

export async function uploadImage(file: File, accessToken: string): Promise<string> {
  const contentType = getImageContentType(file);
  if (!contentType) throw new Error(unsupportedFormatMessage(file));
  if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
    throw new Error(`${file.name} dépasse la limite de 10 Mo.`);
  }

  const response = await fetch("/admin/uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: file,
  });
  const result = await readUploadResponse(response);
  if (!result.url) throw new Error("Le serveur n’a pas retourné l’adresse de l’image importée.");
  return result.url;
}

export async function deleteUploadedImages(urls: string[], accessToken: string): Promise<void> {
  const uploadedUrls = urls.filter((url) => url.startsWith("/uploads/"));
  if (uploadedUrls.length === 0) return;

  const response = await fetch("/admin/uploads", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: uploadedUrls }),
  });
  if (response.ok) return;
  let result: { error?: string } = {};
  try {
    result = (await response.json()) as { error?: string };
  } catch {
    // Cleanup is best effort and must not obscure the original save result.
  }
  throw new Error(result.error || `Échec du nettoyage des images (${response.status}).`);
}

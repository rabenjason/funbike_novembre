/** Détection du format d’une image par ses octets de signature (magic bytes). */

const AVIF_BRANDS = new Set(["avif", "avis"]);
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1"]);

/** Marques de boîte `ftyp` (ISO BMFF) présentes dans un fichier AVIF ou HEIF. */
function readFtypBrands(buffer: Buffer): string[] | null {
  if (buffer.length < 16 || buffer.toString("ascii", 4, 8) !== "ftyp") return null;
  const limit = Math.min(buffer.length, 64);
  const brands = [buffer.toString("ascii", 8, 12)];
  // Offset 12 = version mineure : les marques compatibles commencent à 16.
  for (let offset = 16; offset + 4 <= limit; offset += 4) {
    brands.push(buffer.toString("ascii", offset, offset + 4));
  }
  return brands;
}

/** Retourne le type MIME image détecté, ou null si le contenu n’est pas une image reconnue. */
export function detectImageMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return "image/gif";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  const brands = readFtypBrands(buffer);
  if (brands?.some((brand) => AVIF_BRANDS.has(brand))) return "image/avif";
  return null;
}

/**
 * Explique un contenu non pris en charge lorsqu’il correspond à un format
 * connu mais non accepté (HEIC, SVG, TIFF, BMP, PDF), sinon null.
 */
export function describeUnsupportedImage(buffer: Buffer): string | null {
  const brands = readFtypBrands(buffer);
  if (brands?.some((brand) => HEIF_BRANDS.has(brand))) {
    return "Ce fichier est une photo au format HEIC/HEIF, qui n’est pas pris en charge. Convertissez-la en JPG ou PNG, puis réessayez.";
  }
  const head = buffer
    .toString("utf8", 0, Math.min(buffer.length, 256))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return "Ce fichier est une image vectorielle SVG. Exportez-la en JPG ou PNG, puis réessayez.";
  }
  if (head.startsWith("%pdf")) {
    return "Ce fichier est un document PDF, pas une image. Exportez la page en JPG ou PNG, puis réessayez.";
  }
  if (buffer.length >= 4) {
    const magic = buffer.toString("binary", 0, 4);
    if (magic === "II*\u0000" || magic === "MM\u0000*") {
      return "Ce fichier est une image TIFF, qui n’est pas prise en charge. Convertissez-la en JPG ou PNG, puis réessayez.";
    }
    if (buffer.length >= 14 && buffer.toString("ascii", 0, 2) === "BM") {
      return "Ce fichier est une image BMP, qui n’est pas prise en charge. Convertissez-la en JPG ou PNG, puis réessayez.";
    }
  }
  return null;
}

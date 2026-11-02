import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import type { RowDataPacket } from "mysql2/promise";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { authenticateRequest, requireAdmin } from "./auth.js";
import { queryRows } from "./db.js";

type DbRow = RowDataPacket & { isProductImage: number | boolean; isBrandLogo: number | boolean; isCategoryImage: number | boolean };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_CLEANUP_BODY_BYTES = 64 * 1024;
const mimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const extensionMimes = Object.fromEntries(Object.entries(mimeExtensions).map(([mime, extension]) => [extension, mime]));
const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const uploadDirectory = resolve(backendRoot, process.env.UPLOAD_DIR ?? "uploads");
const uploadNamePattern = /^[0-9a-f-]{36}\.(?:jpg|png|webp|gif|avif)$/;

function sendJson(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  if (response.headersSent) return;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function sendNotFound(response: ServerResponse): void {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  response.end("Not found");
}

function fetchHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    result.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return result;
}

async function authorizeAdmin(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  try {
    const user = await authenticateRequest(fetchHeaders(request.headers));
    requireAdmin({ user });
    return true;
  } catch {
    request.resume();
    sendJson(response, 401, { error: "Une session administrateur valide est requise pour importer des photos." });
    return false;
  }
}

async function readRequestBody(request: IncomingMessage, limit: number): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (tooLarge) continue;
    size += buffer.length;
    if (size > limit) {
      tooLarge = true;
      chunks.length = 0;
      continue;
    }
    chunks.push(buffer);
  }
  return tooLarge ? null : Buffer.concat(chunks, size);
}

function declaredMimeType(request: IncomingMessage): string {
  const value = request.headers["content-type"];
  return (Array.isArray(value) ? value[0] : value ?? "").split(";")[0].trim().toLowerCase();
}

function detectImageMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return "image/gif";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.length >= 16 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const limit = Math.min(buffer.length, 40);
    for (let offset = 8; offset + 4 <= limit; offset += offset === 8 ? 8 : 4) {
      const brand = buffer.toString("ascii", offset, offset + 4);
      if (brand === "avif" || brand === "avis") return "image/avif";
    }
  }
  return null;
}

async function createUpload(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const mimeType = declaredMimeType(request);
  if (!Object.hasOwn(mimeExtensions, mimeType)) {
    request.resume();
    sendJson(response, 415, { error: "Format non pris en charge. Utilisez JPG, PNG, WebP, GIF ou AVIF." });
    return;
  }

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    request.resume();
    sendJson(response, 413, { error: "Chaque photo doit faire 10 Mo maximum." });
    return;
  }

  let contents: Buffer | null;
  try {
    contents = await readRequestBody(request, MAX_IMAGE_BYTES);
  } catch {
    sendJson(response, 400, { error: "Impossible de lire le fichier image envoyé." });
    return;
  }
  if (contents === null) {
    sendJson(response, 413, { error: "Chaque photo doit faire 10 Mo maximum." });
    return;
  }
  if (contents.length === 0) {
    sendJson(response, 400, { error: "Le fichier image est vide." });
    return;
  }
  if (detectImageMimeType(contents) !== mimeType) {
    sendJson(response, 415, { error: "Le contenu du fichier ne correspond pas à un format d’image accepté." });
    return;
  }

  const fileId = randomUUID();
  const extension = mimeExtensions[mimeType];
  const temporaryPath = join(uploadDirectory, `${fileId}.tmp`);
  const finalName = `${fileId}.${extension}`;
  const finalPath = join(uploadDirectory, finalName);
  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(temporaryPath, contents, { flag: "wx", mode: 0o644 });
    await rename(temporaryPath, finalPath);
    sendJson(response, 201, { url: `/uploads/${finalName}` });
  } catch {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    sendJson(response, 500, { error: "Impossible d’enregistrer la photo sur le serveur." });
  }
}

function storedUploadName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^\/uploads\/([0-9a-f-]{36}\.(?:jpg|png|webp|gif|avif))$/.exec(value);
  return match?.[1] && uploadNamePattern.test(match[1]) ? match[1] : null;
}

async function removeIfUnused(url: string): Promise<boolean> {
  const fileName = storedUploadName(url);
  if (!fileName) return false;
  const rows = await queryRows<DbRow>(
    `SELECT
       EXISTS (SELECT 1 FROM product_images WHERE image_url = ?) AS isProductImage,
       EXISTS (SELECT 1 FROM brands WHERE logo_url = ?) AS isBrandLogo,
       EXISTS (SELECT 1 FROM categories WHERE image_url = ?) AS isCategoryImage`,
    [url, url, url],
  );
  const row = rows[0];
  if (row && (Boolean(row.isProductImage) || Boolean(row.isBrandLogo) || Boolean(row.isCategoryImage))) return false;
  try {
    await rm(join(uploadDirectory, fileName));
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function cleanupUploads(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_CLEANUP_BODY_BYTES) {
    request.resume();
    sendJson(response, 413, { error: "La requête de nettoyage est trop volumineuse." });
    return;
  }
  let body: Buffer | null;
  try {
    body = await readRequestBody(request, MAX_CLEANUP_BODY_BYTES);
  } catch {
    sendJson(response, 400, { error: "Impossible de lire la requête de nettoyage." });
    return;
  }
  if (!body) {
    sendJson(response, 413, { error: "La requête de nettoyage est invalide ou trop volumineuse." });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    sendJson(response, 400, { error: "La requête de nettoyage n’est pas un JSON valide." });
    return;
  }
  const urls = parsed && typeof parsed === "object" && "urls" in parsed ? parsed.urls : undefined;
  if (!Array.isArray(urls) || urls.length > 100 || urls.some((url) => typeof url !== "string")) {
    sendJson(response, 400, { error: "La liste des photos à nettoyer est invalide." });
    return;
  }

  try {
    const deleted: string[] = [];
    for (const url of new Set(urls as string[])) {
      if (await removeIfUnused(url)) deleted.push(url);
    }
    sendJson(response, 200, { deleted });
  } catch {
    sendJson(response, 500, { error: "Impossible de nettoyer les anciennes photos." });
  }
}

async function serveUpload(request: IncomingMessage, response: ServerResponse, pathname: string): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    response.end();
    return;
  }
  const fileName = pathname.slice("/uploads/".length);
  if (!uploadNamePattern.test(fileName)) {
    sendNotFound(response);
    return;
  }
  const filePath = join(uploadDirectory, fileName);
  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendNotFound(response);
      return;
    }
    const mimeType = extensionMimes[extname(fileName).slice(1)];
    if (!mimeType) {
      sendNotFound(response);
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": fileStats.size,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream(filePath);
    stream.on("error", () => {
      if (response.headersSent) response.destroy();
      else sendNotFound(response);
    });
    stream.pipe(response);
  } catch {
    sendNotFound(response);
  }
}

export async function handleUploadRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname.startsWith("/uploads/")) {
    await serveUpload(request, response, pathname);
    return true;
  }
  if (pathname !== "/admin/uploads") return false;

  if (request.method !== "POST" && request.method !== "DELETE") {
    response.writeHead(405, { Allow: "POST, DELETE", "Cache-Control": "no-store" });
    response.end();
    return true;
  }
  if (!await authorizeAdmin(request, response)) return true;
  if (request.method === "POST") await createUpload(request, response);
  else await cleanupUploads(request, response);
  return true;
}

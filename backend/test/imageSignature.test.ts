import assert from "node:assert/strict";
import test from "node:test";
import { describeUnsupportedImage, detectImageMimeType } from "../src/imageSignature.ts";

function ftypFile(majorBrand: string, compatibleBrands: string[]): Buffer {
  const payload = Buffer.concat([
    Buffer.from("ftyp", "ascii"),
    Buffer.from(majorBrand, "ascii"),
    Buffer.from([0, 0, 0, 0]),
    ...compatibleBrands.map((brand) => Buffer.from(brand, "ascii")),
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length + 4);
  return Buffer.concat([size, payload]);
}

test("détecte les formats pris en charge par leur signature", () => {
  assert.equal(detectImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])), "image/jpeg");
  assert.equal(detectImageMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectImageMimeType(Buffer.from("GIF89a,image", "ascii")), "image/gif");
  assert.equal(detectImageMimeType(Buffer.from("GIF87a,image", "ascii")), "image/gif");
  assert.equal(
    detectImageMimeType(Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("WEBP", "ascii")])),
    "image/webp",
  );
  assert.equal(detectImageMimeType(ftypFile("avif", ["mif1"])), "image/avif");
  assert.equal(detectImageMimeType(ftypFile("mif1", ["miaf", "avif"])), "image/avif");
});

test("ne détecte pas un contenu non reconnu", () => {
  assert.equal(detectImageMimeType(Buffer.from("just some text", "utf8")), null);
  assert.equal(detectImageMimeType(Buffer.from([0x00, 0x01, 0x02, 0x03])), null);
  assert.equal(detectImageMimeType(Buffer.alloc(0)), null);
});

test("explique un fichier HEIC/HEIF non pris en charge", () => {
  const heic = ftypFile("mif1", ["miaf", "heic"]);
  assert.equal(detectImageMimeType(heic), null);
  const hint = describeUnsupportedImage(heic);
  assert.ok(hint?.includes("HEIC/HEIF"));
  assert.ok(hint?.includes("JPG ou PNG"));
});

test("explique un SVG, un TIFF, un BMP et un PDF non pris en charge", () => {
  assert.ok(describeUnsupportedImage(Buffer.from('<?xml version="1.0"?><svg xmlns="x"></svg>', "utf8"))?.includes("SVG"));
  assert.ok(describeUnsupportedImage(Buffer.from("<svg xmlns=\"x\"></svg>", "utf8"))?.includes("SVG"));
  assert.ok(describeUnsupportedImage(Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00]))?.includes("TIFF"));
  assert.ok(describeUnsupportedImage(Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x00, 0x00]))?.includes("TIFF"));
  assert.ok(describeUnsupportedImage(Buffer.concat([Buffer.from("BM", "ascii"), Buffer.alloc(12)]))?.includes("BMP"));
  assert.ok(describeUnsupportedImage(Buffer.from("%PDF-1.7\n%", "ascii"))?.includes("PDF"));
});

test("revient à null pour un contenu inconnu", () => {
  assert.equal(describeUnsupportedImage(Buffer.from("random bytes that mean nothing", "utf8")), null);
  assert.equal(describeUnsupportedImage(Buffer.alloc(0)), null);
});

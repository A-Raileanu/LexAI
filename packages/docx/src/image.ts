/** Imaginile din document: formatul, dimensiunea și octeții unei adrese `src`. */

export type ImageExt = "png" | "jpg" | "gif" | "bmp" | "webp";

export const IMAGE_MIME: Record<ImageExt, string> = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" };

/** Octeții și formatul unei imagini, pentru export. */
export interface ImageData {
  data: Uint8Array;
  ext: ImageExt;
}

/** Cum ajunge exportul la octeții unei imagini după `src` (implicit: doar data URL-uri). */
export type ImageResolver = (src: string) => ImageData | undefined;

/** Formatul după primii octeți; EMF, WMF și TIFF nu pot fi afișate în browser. */
export function sniffImage(d: Uint8Array): ImageExt | undefined {
  if (d[0] === 0x89 && d[1] === 0x50 && d[2] === 0x4e && d[3] === 0x47) return "png";
  if (d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff) return "jpg";
  if (d[0] === 0x47 && d[1] === 0x49 && d[2] === 0x46) return "gif";
  if (d[0] === 0x42 && d[1] === 0x4d) return "bmp";
  if (d[0] === 0x52 && d[1] === 0x49 && d[2] === 0x46 && d[3] === 0x46 && d[8] === 0x57 && d[9] === 0x45 && d[10] === 0x42 && d[11] === 0x50) return "webp";
  return undefined;
}

export function dataUrlOf(img: ImageData): string {
  return `data:${IMAGE_MIME[img.ext]};base64,${Buffer.from(img.data).toString("base64")}`;
}

export const decodeDataUrl: ImageResolver = (src) => {
  const m = /^data:image\/[\w.+-]+;base64,(.*)$/s.exec(src);
  if (!m) return undefined;
  const data = new Uint8Array(Buffer.from(m[1], "base64"));
  const ext = sniffImage(data);
  return ext ? { data, ext } : undefined;
};

/** Dimensiunea în pixeli citită din antetul fișierului (PNG, JPEG, GIF, BMP). */
export function imageSize(d: Uint8Array): { width: number; height: number } | undefined {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const ext = sniffImage(d);
  try {
    if (ext === "png") return { width: v.getUint32(16), height: v.getUint32(20) };
    if (ext === "gif") return { width: v.getUint16(6, true), height: v.getUint16(8, true) };
    if (ext === "bmp") return { width: Math.abs(v.getInt32(18, true)), height: Math.abs(v.getInt32(22, true)) };
    if (ext === "jpg") {
      let i = 2;
      while (i + 9 < d.length) {
        if (d[i] !== 0xff) return undefined;
        const marker = d[i + 1];
        const len = v.getUint16(i + 2);
        // SOF0–SOF15, fără DHT (C4), JPG (C8) și DAC (CC)
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: v.getUint16(i + 7), height: v.getUint16(i + 5) };
        i += 2 + len;
      }
    }
  } catch {
    // fișier trunchiat
  }
  return undefined;
}

/**
 * Dimensiunea afișată (px): cea din document, altfel cea naturală, micșorată proporțional ca să
 * încapă în lățimea `maxWidth`.
 */
export function displaySize(attrs: Record<string, unknown> | undefined, img: ImageData | undefined, maxWidth: number): { width: number; height: number } {
  const natural = img ? imageSize(img.data) : undefined;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : typeof x === "string" && Number(x) > 0 ? Number(x) : undefined);
  let width = num(attrs?.width);
  let height = num(attrs?.height);
  if (!width && !height) {
    width = natural?.width ?? 200;
    height = natural?.height ?? 150;
  } else if (!width) width = natural ? (height! * natural.width) / natural.height : height;
  else if (!height) height = natural ? (width * natural.height) / natural.width : width;
  if (width! > maxWidth) {
    height = (height! * maxWidth) / width!;
    width = maxWidth;
  }
  return { width: Math.max(1, Math.round(width!)), height: Math.max(1, Math.round(height!)) };
}

"use client";

/** Numele din `Content-Disposition` (preferă `filename*`, UTF-8). */
export function fileNameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      // cădem pe filename=
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? fallback;
}

/** Descarcă un fișier generat de server; aruncă eroare cu mesajul serverului dacă eșuează. */
export async function downloadFile(url: string, fallbackName: string): Promise<{ name: string; blob: Blob }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let msg = "Nu am putut genera fișierul.";
    try {
      const j = (await res.json()) as { eroare?: string };
      if (j.eroare) msg = j.eroare;
    } catch {
      // răspuns fără JSON
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const name = fileNameFromDisposition(res.headers.get("content-disposition"), fallbackName);
  saveBlob(blob, name);
  return { name, blob };
}

export function saveBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
}

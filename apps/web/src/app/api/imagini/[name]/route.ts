import { readImage } from "@/server/images";

/** Imaginile din documente; numele e hash-ul conținutului, deci răspunsul nu se schimbă niciodată. */
export async function GET(_req: Request, ctx: RouteContext<"/api/imagini/[name]">) {
  const { name } = await ctx.params;
  const img = readImage(name);
  if (!img) return new Response("Imaginea nu există.", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(img.data.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

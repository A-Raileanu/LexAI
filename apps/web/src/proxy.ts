import { NextResponse, type NextRequest } from "next/server";

/**
 * Aplicația nu are autentificare: e folosită doar de pe calculatorul pe care rulează. Serverul
 * ascultă pe 127.0.0.1, iar aici respingem ce ar putea veni din afara aplicației:
 * - un Host care nu e local (o pagină de pe internet care își îndreaptă domeniul spre 127.0.0.1,
 *   „DNS rebinding”);
 * - cererile trimise de alte site-uri deschise în browser (Sec-Fetch-Site: cross-site), în afară
 *   de navigarea obișnuită, și cererile care modifică date cu altă origine.
 * Vechile pagini /login și /setup duc acasă.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isLocalHost(host: string): boolean {
  const name = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  return name === "localhost" || name === "127.0.0.1" || name === "::1" || name.endsWith(".localhost");
}

const forbidden = (req: NextRequest) =>
  req.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json({ eroare: "Acces permis doar din aplicație, de pe acest calculator." }, { status: 403 })
    : new NextResponse("Acces permis doar din aplicație, de pe acest calculator.", { status: 403 });

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (!isLocalHost(host)) return forbidden(req);

  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site" && req.headers.get("sec-fetch-mode") !== "navigate") return forbidden(req);
  if (!SAFE_METHODS.has(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && origin !== "null") {
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        // origine invalidă: respinsă mai jos
      }
      if (originHost !== host) return forbidden(req);
    }
  }

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/setup") return NextResponse.redirect(new URL("/", req.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico|woff2?)$).*)"],
};

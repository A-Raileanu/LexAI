import { z } from "zod";
import { urlInDomains, type FetchFn } from "./fetch";
import { RESULT_SCHEMAS } from "./schemas";
import { CAPABILITIES, CAPABILITY_METHOD, SourceError, type Capability, type CapabilityParams, type CapabilityResult, type LegalSource, type SourceCallContext } from "./types";

/**
 * Sursă la distanță: implementează `LegalSource` apelând un serviciu separat, cu JSON peste HTTP,
 * ca o sursă să poată rula în alt proces (sau pe altă mașină).
 *
 * Endpoint-uri așteptate la `baseUrl`:
 *
 *   GET  {baseUrl}/manifest
 *        → 200 { "id": string, "label": string, "description"?: string,
 *                "capabilities": Capability[], "trustedDomains"?: string[] }
 *        (folosit doar de `connectHttpSource`)
 *
 *   POST {baseUrl}/{capabilitate}          ex. POST /cauta_act, POST /citeste_articol
 *        antete: Content-Type: application/json
 *                X-LexAI-Run: <id-ul analizei>  (același pe toată durata unei analize;
 *                                               serviciul își poate păstra starea per analiză)
 *        corp:   { "params": <CapabilityParams> }   (aceleași câmpuri ca în tipurile din ./types,
 *                                                    ex. { "actId": 798, "articol": "11", "alineat": null, "data": "2024-03-15" })
 *        → 200 <CapabilityResult>   (formele din ./types, validate cu ./schemas; dovezile sunt
 *                                    `EvidenceDraft`, fără id și fără sourceId — le adaugă registrul)
 *        → 4xx/5xx { "error": string, "url"?: string, "kind"?: "indisponibil" | "refuz" }
 *
 * Mesajele de activitate nu traversează HTTP; adaptorul raportează doar apelul.
 */

export interface HttpSourceOptions {
  id: string;
  label: string;
  description?: string;
  capabilities: readonly Capability[];
  /** domeniile garantate ca oficiale pentru dovezile acestei surse; implicit, orice adresă https */
  trustedDomains?: readonly string[];
  headers?: Record<string, string>;
  fetch?: FetchFn;
  timeoutMs?: number;
}

const ErrorBody = z.object({ error: z.string(), url: z.string().optional(), kind: z.enum(["indisponibil", "refuz"]).optional() });

const RUN_KEY = "http:run";

export function createHttpSource(baseUrl: string, opts: HttpSourceOptions): LegalSource {
  const base = baseUrl.replace(/\/+$/, "");
  const doFetch = opts.fetch ?? fetch;

  async function call<C extends Capability>(cap: C, params: CapabilityParams<C>, ctx: SourceCallContext): Promise<CapabilityResult<C>> {
    let run = ctx.state.get(RUN_KEY) as string | undefined;
    if (!run) ctx.state.set(RUN_KEY, (run = crypto.randomUUID()));
    const url = `${base}/${cap}`;
    const timeout = AbortSignal.timeout(opts.timeoutMs ?? 120_000);
    let res: Response;
    try {
      res = await doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-LexAI-Run": run, ...(opts.headers ?? {}) },
        body: JSON.stringify({ params }),
        signal: ctx.signal ? AbortSignal.any([timeout, ctx.signal]) : timeout,
      });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      throw new SourceError(`${opts.label} nu a putut fi accesată (${timedOut ? "nu a răspuns la timp" : "eroare de rețea"})`, { url, sourceId: opts.id });
    }
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = ErrorBody.safeParse(body);
      throw new SourceError(err.success ? err.data.error : `${opts.label} a răspuns cu ${res.status}`, {
        url: err.success ? (err.data.url ?? url) : url,
        sourceId: opts.id,
        kind: err.success ? err.data.kind : undefined,
      });
    }
    const parsed = RESULT_SCHEMAS[cap].safeParse(body);
    if (!parsed.success) throw new SourceError(`${opts.label} a întors un răspuns invalid pentru „${cap}”`, { url, sourceId: opts.id });
    return parsed.data as CapabilityResult<C>;
  }

  const source: LegalSource = {
    id: opts.id,
    label: opts.label,
    description: opts.description,
    capabilities: new Set(opts.capabilities),
    ...(opts.trustedDomains ? { trustsUrl: (u: string) => urlInDomains(u, opts.trustedDomains!) } : {}),
  };
  for (const cap of opts.capabilities) {
    (source as unknown as Record<string, unknown>)[CAPABILITY_METHOD[cap]] = (p: CapabilityParams<typeof cap>, ctx: SourceCallContext) => {
      ctx.activity?.(`Consult ${opts.label} (${cap})`);
      return call(cap, p, ctx);
    };
  }
  return source;
}

const Manifest = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  capabilities: z.array(z.enum(CAPABILITIES)),
  trustedDomains: z.array(z.string()).optional(),
});

/** Citește manifestul serviciului (GET /manifest) și creează sursa corespunzătoare. */
export async function connectHttpSource(baseUrl: string, opts: Partial<HttpSourceOptions> = {}): Promise<LegalSource> {
  const base = baseUrl.replace(/\/+$/, "");
  const doFetch = opts.fetch ?? fetch;
  let body: unknown;
  try {
    const res = await doFetch(`${base}/manifest`, { headers: opts.headers, signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000) });
    if (!res.ok) throw new Error(String(res.status));
    body = await res.json();
  } catch (e) {
    throw new SourceError(`Serviciul de la ${base} nu a putut fi contactat (${e instanceof Error ? e.message : String(e)})`, { url: `${base}/manifest` });
  }
  const m = Manifest.safeParse(body);
  if (!m.success) throw new SourceError(`Manifestul serviciului de la ${base} este invalid`, { url: `${base}/manifest` });
  return createHttpSource(base, { ...m.data, ...opts, capabilities: opts.capabilities ?? m.data.capabilities });
}

import { EvidenceStore, type SourceRegistry } from "@lexai/sources";
import { containsLoose } from "../text/normalize";
import type { Evidence, FindingEvidence } from "../types";

/**
 * Registrul de dovezi al unei analize (din @lexai/sources) și validarea lor de către cod.
 * Orice text normativ citit prin instrumente este înregistrat acolo; constatările pot cita
 * doar dovezi din registru.
 */
export { EvidenceStore };

/** Dovezile acceptate ca oficiale (sursa lor este activă și garantează adresa). */
export type TrustPolicy = (ev: Evidence) => boolean;

/** Politica implicită, fără registru: doar adrese https. */
export const httpsOnly: TrustPolicy = (ev) => /^https:\/\//i.test(ev.url);

/** Politica registrului: sursa care a furnizat dovada este activă și îi garantează adresa. */
export function trustFrom(registry: SourceRegistry): TrustPolicy {
  return (ev) => registry.trusts(ev);
}

/** Elimină marcajele adăugate de noi în textul prezentat agentului. */
function stripMarkers(s: string): string {
  return s.replace(/\[(Notă de modificare|Notă)\]\s*/g, "");
}

/**
 * Verificarea făcută de cod (nu de model) pentru o dovadă:
 * - dovada există în registru
 * - sursa este una acceptată (politica `trusts`)
 * - fragmentul citat apare efectiv în textul sursei
 */
export function validateEvidence(store: EvidenceStore, evidenceId: string, fragment: string, trusts: TrustPolicy = httpsOnly): FindingEvidence | { error: string } {
  const ev = store.get(evidenceId);
  if (!ev) return { error: `Dovada ${evidenceId} nu există în această sesiune.` };
  if (!trusts(ev)) {
    return { evidence: ev, fragment, validare: "respinsa", motivRespingere: "Sursa nu provine de pe un domeniu oficial permis." };
  }
  const frag = stripMarkers(fragment ?? "").trim();
  if (frag.length < 3) {
    return { evidence: ev, fragment, validare: "respinsa", motivRespingere: "Fragmentul citat lipsește sau este prea scurt." };
  }
  if (!containsLoose(stripMarkers(ev.text), frag)) {
    return { evidence: ev, fragment, validare: "respinsa", motivRespingere: "Fragmentul nu apare în textul sursei citite." };
  }
  return { evidence: ev, fragment: frag, validare: "confirmata" };
}

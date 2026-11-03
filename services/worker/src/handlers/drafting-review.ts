import { blockPlainText, type ChatBlock } from "@lexai/core/chat";
import { looseKey } from "@lexai/sources/text";

/**
 * Verificarea de completitudine a proiectului, la predare: articole goale
 * sau subțiri și secțiuni anunțate în plan care lipsesc din proiect. Problemele se întorc
 * agentului o singură dată, ca să completeze documentul înainte de predare.
 */

export interface DraftPlan {
  analiza: string;
  elemente: { element: string; motiv: string }[];
  sectiuni: string[];
}

interface ProiectLike {
  articole: { titlu: string; alineate: (string | ChatBlock)[] }[];
}

/** Secțiunile planului care nu sunt articole (părțile, încheierea, semnăturile, anexele). */
const NOT_ARTICLE = /preambul|p[aă]r[tț]ile|identificarea p[aă]r[tț]ilor|[iî]ncheiere|semn[aă]tur|anex|dispozi[tț]ii introductive$/i;
const MIN_ARTICLE_CHARS = 60;

/** „Art. 3. Prețul și plata” → „pretul si plata” (fără numerotare), pentru potrivirea cu planul. */
function topic(title: string): string {
  return looseKey(title.replace(/^\s*(art(icolul)?\.?\s*[\divxlc]+(\^\d+)?\.?|cap(itolul)?\.?\s*[\divxlc]+\.?|[\divxlc]+[.)])\s*[-–—:.]?\s*/i, ""));
}

export function completenessIssues(proiect: ProiectLike, plan: DraftPlan | null): string[] {
  const issues: string[] = [];
  for (const a of proiect.articole) {
    const text = a.alineate.map((x) => (typeof x === "string" ? x : blockPlainText(x))).join(" ").trim();
    if (!a.alineate.length || text.length < MIN_ARTICLE_CHARS) issues.push(`„${a.titlu}” nu are conținut dezvoltat (alineate cu obligații, termene și condiții concrete).`);
  }
  if (plan) {
    const titles = proiect.articole.map((a) => topic(a.titlu));
    const missing = plan.sectiuni
      .filter((s) => !NOT_ARTICLE.test(s))
      .filter((s) => {
        const t = topic(s);
        return t.length > 2 && !titles.some((x) => x.includes(t) || t.includes(x));
      });
    if (missing.length) issues.push(`Secțiuni anunțate în plan care lipsesc din proiect: ${missing.slice(0, 10).map((s) => `„${s}”`).join(", ")}${missing.length > 10 ? " …" : ""}. Scrie-le sau explică în temeiuri de ce nu se aplică.`);
  }
  return issues;
}

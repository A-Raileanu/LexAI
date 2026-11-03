import { describe, expect, it } from "vitest";
import { validateChanges } from "@lexai/core/chat";
import { CHAT_SYSTEM, MISSING_ANSWER_NUDGE, MISSING_TOOL_NUDGE, announcesChange, buildChatRequest, describeDocument, describeHistory, describeScope, fallbackNudge } from "../src/handlers/chat-prompt";

const segments = [
  { id: "p1", text: "CONTRACT DE ÎNCHIRIERE", kind: "titlu" },
  { id: "p2", text: "Chiria este de 1.000 lei.", kind: "paragraf" },
  { id: "p3", text: "Preavizul este de 15 zile.", kind: "paragraf" },
];

describe("contextul chatului din editor", () => {
  it("listează documentul pe segmente, cu id-urile lor", () => {
    expect(describeDocument(segments, null)).toBe("<document>\n[p1] (titlu) CONTRACT DE ÎNCHIRIERE\n[p2] Chiria este de 1.000 lei.\n[p3] Preavizul este de 15 zile.\n</document>");
  });

  it("descrie selecția cu pozițiile și textul exact", () => {
    const out = describeScope({ segments: [{ segmentId: "p3", start: 18, end: 25 }], text: "15 zile" }, segments);
    expect(out).toContain("[p3] caracterele 18–25: «15 zile»");
    expect(out).toContain("DOAR");
  });

  it("include conversația anterioară cu starea modificărilor", () => {
    const out = describeHistory([
      { role: "utilizator", content: "Mărește chiria.", scope: null, proposals: null },
      { role: "asistent", content: "Propun 1.200 lei.", scope: null, proposals: [{ id: "m1", segmentId: "p2", start: 15, textOriginal: "1.000 lei", textNou: "1.200 lei", explicatie: "", status: "aplicata" }] },
    ]);
    expect(out).toContain("Utilizator: Mărește chiria.");
    expect(out).toContain("- [aplicată] p2: «1.000 lei» → «1.200 lei»");
  });

  it("cererea fără selecție privește tot documentul", () => {
    const out = buildChatRequest({ segments, scope: null, history: [], request: "Ce termen de preaviz are?", title: "Contract" });
    expect(out).toContain("nu există selecție");
    expect(out).toContain("<cerere>\nCe termen de preaviz are?\n</cerere>");
    expect(out).not.toContain("conversatie_anterioara");
  });

  it("o cerere de continuare vine imediat după conversație, care îi dă subiectul", () => {
    const history = [
      { role: "utilizator" as const, content: "Adaugă un calendar de implementare.", scope: null, proposals: null },
      { role: "asistent" as const, content: "Documentul are deja un calendar, în Art. 9.", scope: null, proposals: null },
    ];
    const out = buildChatRequest({ segments, scope: null, history, request: "Fă-l mai detaliat.", title: "Contract" });
    expect(out).toContain("privește pasajul sau subiectul discutat în conversație");
    expect(out.indexOf("</conversatie_anterioara>")).toBeLessThan(out.indexOf("<cerere>"));
    expect(out.indexOf("<document>")).toBeLessThan(out.indexOf("<conversatie_anterioara>"));
  });
});

describe("modificările structurale în prompt", () => {
  it("promptul descrie felurile noi, cu exemple, fără limitarea veche", () => {
    expect(CHAT_SYSTEM).not.toMatch(/Nu poți crea paragrafe noi/);
    for (const k of ["„inserare”", "„inlocuire_blocuri”", "„stergere_blocuri”", '"tip":"tabel"', '"tip":"salt_pagina"']) expect(CHAT_SYSTEM).toContain(k);
    expect(CHAT_SYSTEM).toMatch(/TOATE modificările/);
    expect(CHAT_SYSTEM).toMatch(/TREI propuneri/);
    expect(CHAT_SYSTEM).toMatch(/O\.G\. nr\. 13\/2011/);
  });

  it("documentul arată listele, tabelele și salturile de pagină", () => {
    const segs = [
      { id: "a", text: "Art. 1.", kind: "paragraf", top: 0, container: null },
      { id: "l1", text: "unu", kind: "paragraf", top: 1, container: "lista" as const },
      { id: "x", text: "celulă", kind: "tabel", top: 2, container: "tabel" as const },
      { id: "an", text: "ANEXA", kind: "titlu", top: 4, container: null },
    ];
    expect(describeDocument(segs, null, [3, 5])).toBe("<document>\n[a] Art. 1.\n[l1] (listă) unu\n[x] (tabel) celulă\n[— salt de pagină —]\n[an] (titlu) ANEXA\n[— salt de pagină —]\n</document>");
  });

  it("istoricul descrie propunerile structurale", () => {
    const out = describeHistory([
      {
        role: "asistent",
        content: "Propun tabelul.",
        scope: null,
        proposals: [
          { kind: "inlocuire_blocuri", id: "m1", segmentId: "c1", segmentIds: ["c1", "c2"], textOriginal: ["Etapa 1", "Etapa 2"], blocuri: [{ tip: "tabel", antet: ["A", "B"], randuri: [["1", "2"]] }], explicatie: "", status: "aplicata" },
          { kind: "inserare", id: "m2", segmentId: "a4", pozitie: "dupa", blocuri: [{ tip: "salt_pagina" }], explicatie: "", status: "propusa" },
        ],
      },
    ]);
    expect(out).toContain("- [aplicată] înlocuire c1…c2 («Etapa 1») cu tabel 2 coloane × 1 rânduri (antet: A | B)");
    expect(out).toContain("- [în așteptare] inserare după a4: salt de pagină");
  });
});

describe("răspunsul care anunță modificări fără să le propună", () => {
  it("recunoaște verbele la persoana I, nu și negațiile", () => {
    for (const t of [
      "Propun să înlocuiesc placeholderul cu plafonul legal, formulat prin trimitere la lege.",
      "Am reformulat clauza ca pact comisoriu.",
      "Voi adăuga o clauză de confidențialitate după art. 4.",
      "Completez câmpul cu plafonul legal.",
      "Nu am pus o cifră fixă. Propun formularea de mai jos.",
    ])
      expect(announcesChange(t), t).toBe(true);
    for (const t of [
      "Nu propun nicio modificare: clauza respectă legea.",
      "Textul e corect, nu e nevoie să modific nimic.",
      "Art. 5 din O.G. nr. 13/2011 prevede plafonul dobânzii.",
      "Clauza propusă de părți e validă.",
      "Nicio modificare nu e necesară; n-am ce să adaug.",
    ])
      expect(announcesChange(t), t).toBe(false);
  });

  it("după o tură fără apelul final cere modificările concrete doar când textul le anunță", () => {
    expect(fallbackNudge("")).toBe(MISSING_ANSWER_NUDGE);
    expect(fallbackNudge("Propun să înlocuiesc placeholderul cu plafonul legal.")).toBe(MISSING_TOOL_NUDGE);
    expect(fallbackNudge("Termenul de preaviz este de 15 zile, conform art. 7.")).toBeNull();
  });

  it("cazul câmpului de completat: propunerea de tip text îl înlocuiește", () => {
    const segs = [{ id: "c34", text: "3.4. Penalitățile de întârziere sunt de [● procent]% pe zi din suma datorată." }];
    const scope = { segments: [{ segmentId: "c34", start: 0, end: segs[0].text.length }], text: segs[0].text };
    const r = validateChanges(
      [{ tip: "text", segment_id: "c34", text_original: "de [● procent]% pe zi", text_nou: "nu mai mari decât plafonul prevăzut de art. 5 alin. (1) din O.G. nr. 13/2011, calculat la data încheierii contractului,", explicatie: "Plafon legal." }],
      segs,
      scope,
    );
    expect(r.ok).toBe(true);
    const req = buildChatRequest({ segments: segs.map((s) => ({ ...s, kind: "paragraf" })), scope, history: [], request: "Maximul legal pe zi", title: "Contract" });
    expect(req).toContain("[● procent]");
    expect(CHAT_SYSTEM).toMatch(/câmp de completat|„\[● indicație\]”/);
  });
});

describe("formatare în loc de markdown", () => {
  it("promptul cere formatare, nu markdown, și istoricul descrie formatările", () => {
    expect(CHAT_SYSTEM).toContain("„formatare”");
    expect(CHAT_SYSTEM).toMatch(/Editorul nu afișează markdown/);
    expect(CHAT_SYSTEM).toMatch(/Titlurile sunt blocuri de tip „titlu”, nu „#”/);
    const out = describeHistory([
      { role: "asistent", content: "Propun îngroșarea.", scope: null, proposals: [{ kind: "formatare", id: "m1", segmentId: "a2", start: 0, textOriginal: "Art. 2.", stiluri: { bold: true, italic: false }, explicatie: "", status: "propusa" }] },
    ]);
    expect(out).toContain("- [în așteptare] formatare a2: «Art. 2.» → aldin, fără cursiv");
  });
});

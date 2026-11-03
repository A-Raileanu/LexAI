import { z } from "zod";
import type { EvidenceDraft } from "./evidence";
import type { Capability, CapabilityResult } from "./types";

/**
 * Schemele rezultatelor normalizate. Validează răspunsurile surselor care rulează în alt
 * proces (vezi `createHttpSource`); aceleași forme le întorc și sursele locale.
 */

const actId = z.union([z.number(), z.string()]);
const opt = <T extends z.ZodType>(s: T) => s.optional();

export const ActRefSchema = z.object({ baseId: actId, titlu: z.string(), tip: opt(z.string()), numar: opt(z.string()), an: opt(z.string()) });

export const VersionRefSchema = z.object({
  id: actId,
  data: z.string().nullable(),
  tip: z.enum(["consolidare", "republicare", "baza"]),
  eticheta: z.string(),
});

export const EvidenceDraftSchema: z.ZodType<EvidenceDraft> = z.object({
  type: z.enum(["text_articol", "articol_inexistent", "act_negasit", "actiuni_act", "fisa_act", "cautare_in_act", "sursa_web", "decizie"]),
  act: opt(ActRefSchema),
  versiune: opt(VersionRefSchema),
  unitate: opt(z.string()),
  text: z.string(),
  url: z.string(),
  accesatLa: z.string(),
  dataReferinta: opt(z.string()),
  ultimaFormaId: opt(actId),
});

const ActHitSchema = z.object({
  actId,
  eticheta: z.string(),
  titlu: z.string(),
  descriere: z.string(),
  emitent: z.string(),
  publicat: z.string(),
  intrareInVigoare: z.string().nullable(),
  intrareInVigoareText: z.string(),
  republicare: z.boolean(),
});

const DecizieGasitaSchema = z.object({
  id: z.string(),
  titlu: z.string(),
  descriere: z.string(),
  instanta: z.enum(["ccr", "iccj"]).nullable(),
  fel: z.enum(["ccr_exceptie", "ccr_obiectie", "ccr_alta", "iccj_hp", "iccj_ril", "iccj_alta", "alta"]),
  data: z.string().nullable(),
  publicat: z.string(),
  url: z.string(),
  potrivire: opt(z.enum(["articol", "posibil"])),
  nota: opt(z.string()),
});

export const RESULT_SCHEMAS: { [C in Capability]: z.ZodType<CapabilityResult<C>> } = {
  cauta_act: z.object({
    rezultate: z.array(ActHitSchema),
    total: z.number().nullable(),
    url: z.string(),
    accesatLa: z.string(),
    dovada: opt(EvidenceDraftSchema),
    nota: opt(z.string()),
  }),
  info_act: z.object({ act: ActRefSchema, versiune: opt(VersionRefSchema), fisa: EvidenceDraftSchema, actiuni: opt(EvidenceDraftSchema), nota: opt(z.string()) }),
  citeste_articol: z.union([
    z.object({
      gasit: z.literal(true),
      dovada: EvidenceDraftSchema,
      text: z.string(),
      abrogat: z.boolean(),
      potrivireAproximativa: opt(z.string()),
      alineatNegasit: opt(z.string()),
      actiuniPeArticol: z.array(z.string()),
    }),
    z.object({ gasit: z.literal(false), dovada: EvidenceDraftSchema, text: z.string(), actiuniPeArticol: z.array(z.string()) }),
    z.object({
      gasit: z.literal(false),
      redirect: z.object({
        nota: z.string(),
        coduri: z.array(z.object({ actId, eticheta: z.string(), intrareInVigoare: z.string().nullable() })),
      }),
    }),
  ]),
  cauta_in_act: z.object({
    forma: z.string(),
    rezultate: z.array(z.object({ articol: z.string(), pasaj: opt(z.string()), text: z.string(), dovada: EvidenceDraftSchema })),
    dovada: opt(EvidenceDraftSchema),
  }),
  cauta_decizii: z.object({
    rezultate: z.array(DecizieGasitaSchema),
    total: z.number().nullable(),
    complet: z.boolean(),
    url: z.string(),
    accesatLa: z.string(),
    nota: opt(z.string()),
  }),
  citeste_decizie: z.object({
    decizie: DecizieGasitaSchema.extend({ solutie: z.string().nullable(), dispozitiv: z.string().nullable() }),
    dovada: EvidenceDraftSchema,
    pasaje: z.array(z.string()),
  }),
  citeste_pagina: z.object({ url: z.string(), titlu: z.string(), dovada: EvidenceDraftSchema }),
};

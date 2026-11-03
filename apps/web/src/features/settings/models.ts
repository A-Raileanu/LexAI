/** Modelele Claude disponibile în Setări (valoarea salvată în `settings.model`). */
export const MODELS = [
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", description: "Echilibrat: atent și rapid. Recomandat." },
  { id: "claude-opus-5-5", label: "Opus 5.5", description: "Cel mai atent, dar consumă limita mai repede." },
  { id: "claude-haiku-5-5", label: "Haiku 5.5", description: "Rapid și economic, pentru documente simple." },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];
export const MODEL_IDS = MODELS.map((m) => m.id) as [ModelId, ...ModelId[]];
export const DEFAULT_MODEL: ModelId = "claude-sonnet-5-5";

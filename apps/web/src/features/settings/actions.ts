"use server";

import { eq, getDb, sourceCache, sources } from "@lexai/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateSettings } from "@/server/settings";
import type { ClaudeAccount } from "./claude-account";
import { readClaudeAccount } from "./claude-status";
import { listSources } from "./data";
import { MODEL_IDS } from "./models";
import { moveInOrder, priorities } from "./source-order";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const Model = z.enum(MODEL_IDS, { error: "Model necunoscut." });
const Concurrency = z.number({ error: "Valoare invalidă." }).int().min(1, "Minimum 1.").max(4, "Maximum 4.");
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data trebuie să fie în formatul aaaa-ll-zz.")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s) && s >= "1900-01-01" && s <= "2100-12-31";
  }, "Data nu este validă.");
const SourceId = z.string().min(1).max(100);

function revalidate() {
  revalidatePath("/setari");
}

export async function setModel(model: string): Promise<ActionResult> {
  const parsed = Model.safeParse(model);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  updateSettings(getDb(), { model: parsed.data });
  revalidate();
  return ok(undefined);
}

export async function setWorkerConcurrency(value: number): Promise<ActionResult> {
  const parsed = Concurrency.safeParse(value);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  updateSettings(getDb(), { workerConcurrency: parsed.data });
  revalidate();
  return ok(undefined);
}

/** `null` = ziua curentă; altfel o dată fixă (aaaa-ll-zz). */
export async function setDefaultReferenceDate(value: string | null): Promise<ActionResult> {
  const parsed = IsoDate.nullable().safeParse(value);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  updateSettings(getDb(), { defaultReferenceDate: parsed.data });
  revalidate();
  return ok(undefined);
}

export async function setSourceEnabled(id: string, enabled: boolean): Promise<ActionResult> {
  const parsed = z.object({ id: SourceId, enabled: z.boolean() }).safeParse({ id, enabled });
  if (!parsed.success) return fail("Date invalide.");
  const db = getDb();
  const res = db.update(sources).set({ enabled: parsed.data.enabled }).where(eq(sources.id, parsed.data.id)).run();
  if (res.changes === 0) return fail("Sursa nu există.");
  revalidate();
  return ok(undefined);
}

export async function moveSource(id: string, dir: "sus" | "jos"): Promise<ActionResult> {
  const parsed = z.object({ id: SourceId, dir: z.enum(["sus", "jos"]) }).safeParse({ id, dir });
  if (!parsed.success) return fail("Date invalide.");
  const db = getDb();
  const current = listSources(db).map((s) => s.id);
  if (!current.includes(parsed.data.id)) return fail("Sursa nu există.");
  const next = priorities(moveInOrder(current, parsed.data.id, parsed.data.dir));
  db.transaction((tx) => {
    for (const p of next) tx.update(sources).set({ priority: p.priority }).where(eq(sources.id, p.id)).run();
  });
  revalidate();
  return ok(undefined);
}

export async function clearSourceCache(id: string): Promise<ActionResult<{ removed: number }>> {
  const parsed = SourceId.safeParse(id);
  if (!parsed.success) return fail("Date invalide.");
  const res = getDb().delete(sourceCache).where(eq(sourceCache.sourceId, parsed.data)).run();
  revalidate();
  return ok({ removed: res.changes });
}

/** „Verifică din nou”: rulează `claude auth status`. */
export async function checkClaudeAccount(): Promise<ClaudeAccount> {
  return readClaudeAccount();
}

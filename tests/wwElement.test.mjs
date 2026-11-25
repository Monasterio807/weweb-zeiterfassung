// wwElement.test.mjs — Zeiterfassung (Imploya). Lauf: npm test (Node-Test-Runner, keine neuen Abhaengigkeiten).
// A-020 / Frontend-Audit G6-24. Muster wie zeit-chef: <script> ausschneiden, als ESM laden, Optionen mit Fake-`this` pruefen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sfc = readFileSync(join(here, "..", "src", "wwElement.vue"), "utf8");
const a = sfc.indexOf("<script>");
const b = sfc.indexOf("\n</script>");
assert.ok(a > -1 && b > a, "Script-Block nicht gefunden");
const dir = mkdtempSync(join(tmpdir(), "zeiterfassung-test-"));
const modPath = join(dir, "opts.mjs");
writeFileSync(modPath, sfc.slice(a + 8, b), "utf8");
const options = (await import(pathToFileURL(modPath).href)).default;

function makeVm(over = {}) {
  const vm = { ...JSON.parse(JSON.stringify(options.data.call({}))), content: { apiKey: "k", authToken: "t" }, emitted: [], $refs: {},
    $emit(n, p) { this.emitted.push({ n, p }); }, $nextTick(f) { f && f(); }, ...over };
  for (const [n, fn] of Object.entries(options.computed)) Object.defineProperty(vm, n, { get: () => fn.call(vm), configurable: true });
  for (const [n, fn] of Object.entries(options.methods)) vm[n] = fn.bind(vm);
  return vm;
}
const okRes = (row) => ({ status: 200, ok: true, json: async () => [row] });
const tag = (o) => ({ date: "2026-11-23", weekday: "Mo", start: "08:00", end: "16:30", pause: 30, note: "", entryId: "e1", source: "clock",
  workedMinutes: 480, saving: false, saved: true, error: "", hinweis: "", ...o });

test("G6-24: Zeit eines Stempel-Eintrags ändern -> Hinweis auf «Zeit anpassen», Speichern klappt trotzdem", async () => {
  const vm = makeVm({ selectedEmployee: "emp1", vorEintritt: () => null });
  vm.authedFetch = async () => okRes({ id: "e1", worked_minutes: 450 });
  const day = tag({});
  vm.markiereGeladen(day);           // Stand wie nach dem Laden
  day.end = "16:00";
  await vm.saveDay(day);
  assert.equal(day.error, "");
  assert.match(day.hinweis, /Stempeluhr/);
  assert.match(day.hinweis, /Zeit anpassen/);
});
test("G6-24: nur Notiz geändert oder Eintrag von Hand -> kein Hinweis", async () => {
  const vm = makeVm({ selectedEmployee: "emp1", vorEintritt: () => null });
  vm.authedFetch = async () => okRes({ id: "e1", worked_minutes: 480 });
  const d1 = tag({}); vm.markiereGeladen(d1); d1.note = "Inventur";
  await vm.saveDay(d1);
  assert.equal(d1.hinweis, "");
  const d2 = tag({ source: "manual" }); vm.markiereGeladen(d2); d2.end = "16:00";
  await vm.saveDay(d2);
  assert.equal(d2.hinweis, "");
});
test("G6-24: Zeit unverändert (Stempel-Eintrag) -> kein Hinweis", async () => {
  const vm = makeVm({ selectedEmployee: "emp1", vorEintritt: () => null });
  vm.authedFetch = async () => okRes({ id: "e1", worked_minutes: 480 });
  const day = tag({}); vm.markiereGeladen(day);
  await vm.saveDay(day);
  assert.equal(day.hinweis, "");
});
test("Nachbesserung: Merkstand ist der gesendete Stand, nicht der Stand nach dem Request", async () => {
  const vm = makeVm({ selectedEmployee: "emp1", vorEintritt: () => null });
  const day = tag({}); vm.markiereGeladen(day);
  day.end = "16:00";
  vm.authedFetch = async () => { day.end = "15:00"; return okRes({ id: "e1", worked_minutes: 450 }); }; // tippt weiter während des Sendens
  await vm.saveDay(day);
  assert.equal(day.stempelSig, "08:00|16:00|30", "Merkstand = gesendeter Stand");
  assert.equal(day.saved, false, "Zeile wurde seit dem Senden geändert");
  // Zweiter Speichervorgang mit der neuen Zeit: wieder Hinweis, weil 15:00 noch nie gespeichert war
  vm.authedFetch = async () => okRes({ id: "e1", worked_minutes: 390 });
  await vm.saveDay(day);
  assert.match(day.hinweis, /Zeit anpassen/);
});
test("Nachbesserung: Eintritts-Hinweis und Stempel-Hinweis stehen zusammen", async () => {
  const vm = makeVm({ selectedEmployee: "emp1", vorEintritt: () => "2026-11-30" });
  vm.authedFetch = async () => okRes({ id: "e1", worked_minutes: 450 });
  const day = tag({}); vm.markiereGeladen(day);
  day.end = "16:00";
  await vm.saveDay(day);
  assert.match(day.hinweis, /vor dem Eintritt am 30\.11\.2026/);
  assert.match(day.hinweis, /Zeit anpassen/);
});
test("Texte: kein scharfes s", () => { assert.ok(!/ß/.test(sfc)); });

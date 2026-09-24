# weweb-zeiterfassung — Zeiterfassung (Wochenansicht)

WeWeb Coded Component für Imploya. Editierbare Wochenübersicht (Mo–So) pro Mitarbeiter:in,
liest/schreibt `time_entries` über Supabase REST (Anon-Key + User-JWT, RLS schützt).

## Dateien

- `src/wwElement.vue` — Template + Logik + Design-Tokens (scoped)
- `ww-config.js` — Editor-Properties + Trigger-Events
- `dist/manager.js` — Build-Artefakt (`npm run build -- name=weweb-zeiterfassung type=wwobject`)

## Properties

| Property | Typ | Zweck |
|---|---|---|
| `authToken` | Text | User-JWT (Supabase Auth). Wird live gelesen: Prop → wwLib-Auth-Kontext → localStorage; bei 401 GoTrue-Refresh + Retry. |
| `apiKey` | Text | Anon-/Publishable-Key. Nie `service_role`. |
| `supabaseUrl` | Text | Default Imploya Zürich (`ztvqsxdudzdyqgeylujr`). |
| `employeeId` | Text | Optional: Mitarbeiter vorwählen (UUID). Leer → Auswahl im Widget; dann gilt auch `?mitarbeiter=<uuid>` aus der URL, sofern die Person in der eigenen Liste steht. |
| `weekOffset` | Number | 0 = aktuelle Woche, −1 = Vorwoche. Navigation überschreibt intern. |
| `readonly` | OnOff | Nur lesen. |
| `aboUrl` | Text | Ziel des «Zum Abo»-Buttons im Zusatzmodul-Hinweis. Default `/abo`. |
| `backUrl` | Text | Optionaler «Zurück»-Link. |

## Events

| Event | Payload | Wann |
|---|---|---|
| `loaded` | `{ count }` | Woche/Mitarbeiterliste geladen |
| `saved` | `{ date, worked_minutes }` | Tageseintrag gespeichert |
| `error` | `{ reason }` | `auth` / `network` / `save` / `addon` |
| `addon-blocked` | `{}` | Zusatzmodul Zeiterfassung nicht gebucht (Gate aktiv) |

## Zusatzmodul-Gate (2026-07-27)

Beim Start fragt die Komponente die SECURITY-DEFINER-RPC `has_addon_access(p_user_id, 'zeiterfassung')`
ab (User-ID aus dem JWT-`sub`-Claim, kein Zusatz-Request). Der Kill-Switch
`legal_constants system/addon_enforcement` steckt in der RPC selbst (`off` → immer `true`).

- **Gate aktiv (false):** warmer Hinweis mit «Zum Abo»-Button (`aboUrl`). Bestehende Einträge
  bleiben les- und editierbar (serverseitig ist nur INSERT per RESTRICTIVE-Policy gesperrt) —
  nur der Speichern-Knopf für **neue** Einträge ist deaktiviert.
- **Fail-open:** Netzfehler beim Gate-Check zeigen keinen Banner — die RLS bleibt die echte Sperre.
- **403 beim Anlegen:** wird zuerst gegen das Gate re-gecheckt, damit kein irreführendes
  «Bitte neu anmelden» erscheint.

## Fix-Runde Vollaudit Kundensicht (24.09.2026, Bündel F24)

- Gespeicherte Zeilen zeigen das Häkchen mit «Gespeichert», bis die Zeile wieder geändert wird
  (auch beim Laden der Woche). Kein 3-Sekunden-Timeout mehr.
- Stunden als «7 Std. 45 Min.», «7 Std.», «45 Min.», Null «0 Std.» (gleich wie dienstplan).
- Unter 768 px klebt die Speichern-Spalte am rechten Rand: Speichern ohne seitliches Wischen.
  Tag-Karten statt Tabelle sind ein eigenes Projekt (G3).
- `?mitarbeiter=<uuid>` wählt die Person vor (nur UUID-Format, nur aus der eigenen Liste).

## Sicherheit

- Nur Anon-/Publishable-Key + User-JWT, alles über Properties. RLS ist der Schutz.
- Keine Tokens/IDs/PII in Console-Logs.

## Test-Checkliste

- [ ] Editor + Production-Build (wwEditor-Blöcke entfernt → kein Crash)
- [ ] Happy Path: Woche lädt, Eintrag speichern → `saved` feuert, Netto/Wochentotal stimmen
- [ ] Unhappy Path: fehlendes JWT → «Bitte neu anmelden»; Netzfehler → globaler Hinweis
- [ ] Gate: `addon_enforcement='hard'` ohne `subscription_addons`-Zeile → Banner sichtbar,
      neuer Eintrag gesperrt, bestehender Eintrag editierbar; mit aktiver Addon-Zeile → kein Banner
- [ ] Pausen-Hinweis erscheint bei `break_compliant=false` (Serverwert)
- [ ] Responsive 375 px + 1440 px; kein ß; keine Secrets im Log

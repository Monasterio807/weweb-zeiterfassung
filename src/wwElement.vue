<template>
  <div class="hrk-root">
    <main class="hrk-page">
      <div class="hrk-record-head" style="margin-bottom: var(--hrk-space-4)">
        <div class="hrk-record-head__main">
          <h1 class="hrk-h1" style="margin: 0">Zeit erfassen</h1>
          <p class="hrk-muted" style="margin: var(--hrk-space-1) 0 0">
            Trag die geleisteten Stunden ein. Wir prüfen die L-GAV-Pause gleich mit.
          </p>
        </div>
        <a v-if="content && content.backUrl" class="hrk-btn hrk-btn--ghost" :href="content.backUrl">Zurück</a>
      </div>

      <!-- Laden -->
      <div v-if="loading" class="hrk-state">
        <div class="hrk-spinner" aria-hidden="true"></div>
        <p class="hrk-muted">Mitarbeitende werden geladen …</p>
      </div>

      <!-- Keine Berechtigung / nicht angemeldet -->
      <div v-else-if="authError" class="hrk-state">
        <div class="hrk-state__icon" aria-hidden="true">🔒</div>
        <p class="hrk-state__title">Bitte neu anmelden</p>
        <p class="hrk-muted">Damit du Stunden erfassen kannst, meld dich bitte wieder an.</p>
        <a v-if="content && content.backUrl" class="hrk-btn hrk-btn--secondary" :href="content.backUrl">Zurück</a>
      </div>

      <!-- Allgemeiner Ladefehler -->
      <div v-else-if="loadError" class="hrk-state">
        <div class="hrk-state__icon" aria-hidden="true">⚠️</div>
        <p class="hrk-state__title">Das hat gerade nicht geklappt</p>
        <p class="hrk-muted">Die Mitarbeitenden konnten nicht geladen werden.</p>
        <button type="button" class="hrk-btn hrk-btn--secondary" @click="loadEmployees">Erneut versuchen</button>
      </div>

      <!-- Keine Mitarbeitenden -->
      <div v-else-if="!employees.length" class="hrk-state">
        <div class="hrk-state__icon" aria-hidden="true">👥</div>
        <p class="hrk-state__title">Noch keine Mitarbeitenden</p>
        <p class="hrk-muted">Leg zuerst Mitarbeitende im Mitarbeiterdossier an, dann kannst du hier ihre Stunden erfassen.</p>
        <a v-if="content && content.backUrl" class="hrk-btn hrk-btn--secondary" :href="content.backUrl">Zurück</a>
      </div>

      <!-- Inhalt -->
      <div v-else class="hrk-stack">
        <div class="hrk-field">
          <label class="hrk-label" for="hrk-ze-emp">Mitarbeiter:in</label>
          <select id="hrk-ze-emp" class="hrk-select" v-model="selectedEmployee">
            <option value="">Bitte wählen …</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ employeeName(e) }}</option>
          </select>
        </div>

        <template v-if="selectedEmployee">
          <!-- Erfassen -->
          <section class="hrk-card">
            <h2 class="hrk-h2" style="margin-top: 0">Stunden eintragen</h2>

            <div class="hrk-field">
              <label class="hrk-label" for="hrk-ze-date">Arbeitstag</label>
              <input id="hrk-ze-date" class="hrk-input" type="date" v-model="form.workDate" />
            </div>

            <div class="hrk-field">
              <span class="hrk-label">Wie willst du erfassen?</span>
              <div class="hrk-choice">
                <label class="hrk-radio" :class="{ 'hrk-radio--selected': form.mode === 'startstopp' }">
                  <input type="radio" value="startstopp" v-model="form.mode" />
                  <span class="hrk-radio__body">
                    <span class="hrk-radio__title">Mit Start &amp; Ende</span>
                    <span class="hrk-radio__hint">Von–bis eintragen, wir rechnen die Stunden aus.</span>
                  </span>
                </label>
                <label class="hrk-radio" :class="{ 'hrk-radio--selected': form.mode === 'direkt' }">
                  <input type="radio" value="direkt" v-model="form.mode" />
                  <span class="hrk-radio__body">
                    <span class="hrk-radio__title">Stunden direkt</span>
                    <span class="hrk-radio__hint">Du kennst die Netto-Stunden schon.</span>
                  </span>
                </label>
              </div>
            </div>

            <template v-if="form.mode === 'startstopp'">
              <div class="hrk-field">
                <label class="hrk-label" for="hrk-ze-start">Start</label>
                <input id="hrk-ze-start" class="hrk-input" type="time" v-model="form.startTime" />
              </div>
              <div class="hrk-field">
                <label class="hrk-label" for="hrk-ze-end">Ende</label>
                <input id="hrk-ze-end" class="hrk-input" type="time" v-model="form.endTime" />
                <p class="hrk-hint">Geht das Ende über Mitternacht, rechnen wir die Nachtschicht korrekt.</p>
              </div>
            </template>

            <template v-else>
              <div class="hrk-field">
                <label class="hrk-label" for="hrk-ze-hours">Netto-Arbeitsstunden</label>
                <input id="hrk-ze-hours" class="hrk-input" type="number" min="0" max="24" step="0.25" v-model="form.hours" />
                <p class="hrk-hint">Ohne Pause. Beispiel: 8.5 für 8 Stunden 30 Minuten.</p>
              </div>
            </template>

            <div class="hrk-field">
              <label class="hrk-label" for="hrk-ze-break">Pause (Minuten)</label>
              <input id="hrk-ze-break" class="hrk-input" type="number" min="0" max="600" step="5" v-model="form.breakMinutes" />
            </div>

            <div v-if="formError" class="hrk-note hrk-note--danger" role="alert" style="margin-bottom: var(--hrk-space-4)">
              {{ formError }}
            </div>

            <div v-if="saveResult" class="hrk-note" :class="saveResult.break_compliant ? 'hrk-note--muted' : 'hrk-note--warn'" style="margin-bottom: var(--hrk-space-4)">
              <strong>Gespeichert.</strong>
              <span v-if="saveResult.break_compliant"> Die Pause entspricht dem L-GAV-Minimum.</span>
              <span v-else> Achtung: Die Pause liegt unter dem L-GAV-Minimum von {{ saveResult.required_break_minutes }} Minuten für diese Anwesenheit.</span>
            </div>

            <button
              type="button"
              class="hrk-btn hrk-btn--primary hrk-btn--block"
              :disabled="saving"
              @click="saveEntry"
            >{{ saving ? 'Speichern …' : 'Stunden speichern' }}</button>
          </section>

          <!-- Monatsübersicht -->
          <section class="hrk-card">
            <h2 class="hrk-h2" style="margin-top: 0">Monat {{ monthLabel }}</h2>
            <div v-if="monthLoading" class="hrk-state hrk-state--mini">
              <div class="hrk-spinner" aria-hidden="true"></div>
              <p class="hrk-muted">Übersicht wird geladen …</p>
            </div>
            <template v-else-if="monthSummary">
              <dl class="hrk-dl">
                <div class="hrk-dl__row"><dt>Erfasste Stunden</dt><dd>{{ monthSummary.worked_hours }} h</dd></div>
                <div class="hrk-dl__row"><dt>Anwesenheitstage</dt><dd>{{ monthSummary.tage_anwesend }}</dd></div>
                <div class="hrk-dl__row">
                  <dt>Pausen unter L-GAV-Minimum</dt>
                  <dd>
                    <span class="hrk-badge" :class="monthSummary.eintraege_pause_nicht_konform > 0 ? 'hrk-badge--warning' : 'hrk-badge--success'">
                      {{ monthSummary.eintraege_pause_nicht_konform > 0 ? (monthSummary.eintraege_pause_nicht_konform + ' Einträge') : 'Alle in Ordnung' }}
                    </span>
                  </dd>
                </div>
              </dl>
            </template>
            <p v-else class="hrk-muted">Für diesen Monat sind noch keine Stunden erfasst.</p>
          </section>

          <!-- Einträge -->
          <section class="hrk-card">
            <h2 class="hrk-h2" style="margin-top: 0">Einträge im Monat</h2>
            <div v-if="entriesLoading" class="hrk-state hrk-state--mini">
              <div class="hrk-spinner" aria-hidden="true"></div>
              <p class="hrk-muted">Einträge werden geladen …</p>
            </div>
            <table v-else-if="entries.length" class="hrk-table">
              <thead>
                <tr><th>Tag</th><th>Arbeit</th><th>Pause</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in entries" :key="row.id">
                  <td>{{ formatDate(row.work_date) }}</td>
                  <td>{{ formatMinutes(row.worked_minutes) }}</td>
                  <td>{{ row.break_minutes }} min</td>
                  <td>
                    <span class="hrk-badge" :class="row.break_compliant ? 'hrk-badge--success' : 'hrk-badge--warning'">
                      {{ row.break_compliant ? 'Pause ok' : 'Pause knapp' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="hrk-muted">Noch keine Einträge in diesem Monat.</p>
          </section>
        </template>

        <p v-else class="hrk-muted">Wähl oben eine:n Mitarbeiter:in, um Stunden zu erfassen.</p>
      </div>
    </main>
  </div>
</template>

<script>
/**
 * WeWeb Coded Component — Zeiterfassung (HRklar)
 * Erfasst Arbeitsstunden pro Mitarbeiter:in in die Tabelle `time_entries`
 * (Start/Stopp oder Stunden direkt) und zeigt Monatsübersicht + Einträge an.
 * Der L-GAV-Pausen-Check (break_compliant) kommt aus dem Backend (generierte Spalten).
 *
 * Reines Frontend gegen das fertige Backend. Nie service_role — nur Anon-/Publishable-Key
 * + User-JWT. RLS sorgt dafür, dass jede:r nur den eigenen Betrieb sieht.
 * Backend-Vertrag: Backend (Supabase)/Zeiterfassung_Backend/README_Zeiterfassung-MVP.md
 */
export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: false, default: '' },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: false, default: () => ({}) },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],
  data() {
    return {
      loading: false,
      authError: false,
      loadError: false,
      employees: [],
      selectedEmployee: '',
      form: {
        workDate: this.todayStr(),
        mode: 'startstopp',
        startTime: '',
        endTime: '',
        hours: '',
        breakMinutes: 0,
      },
      formError: '',
      saving: false,
      saveResult: null,
      monthLoading: false,
      monthSummary: null,
      entriesLoading: false,
      entries: [],
    };
  },
  computed: {
    baseUrl() {
      const url = (this.content && this.content.supabaseUrl) || 'https://ztvqsxdudzdyqgeylujr.supabase.co';
      return String(url).replace(/\/+$/, '');
    },
    authHeaders() {
      const key = (this.content && this.content.apiKey) || '';
      const token = ((this.content && this.content.authToken) || '').toString();
      const bearer = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      return { apikey: key, Authorization: bearer };
    },
    viewMonth() {
      // YYYY-MM des aktuell gewählten Arbeitstags (für Übersicht + Einträge).
      const d = (this.form && this.form.workDate) || this.todayStr();
      return String(d).slice(0, 7);
    },
    monthLabel() {
      const ym = this.viewMonth;
      const parts = String(ym).split('-');
      const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      const m = parseInt(parts[1], 10);
      if (!parts[0] || !m || m < 1 || m > 12) return ym;
      return `${monate[m - 1]} ${parts[0]}`;
    },
  },
  watch: {
    'content.authToken'() { this.loadEmployees(); },
    'content.employeeId'(v) { if (v) this.selectedEmployee = String(v); },
    selectedEmployee() {
      this.saveResult = null;
      this.loadMonth();
    },
    viewMonth() {
      if (this.selectedEmployee) this.loadMonth();
    },
  },
  mounted() {
    if (this.content && this.content.employeeId) this.selectedEmployee = String(this.content.employeeId);
    this.loadEmployees();
  },
  methods: {
    // fetch mit Timeout (AbortController) — bricht haengende Requests nach ms ab,
    // damit Spinner nie ewig drehen. Abbruch landet als Fehler im jeweiligen catch.
    async fetchWithTimeout(url, options, ms) {
      const timeout = ms || 10000;
      const ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timer = ac ? setTimeout(() => ac.abort(), timeout) : null;
      try {
        return await fetch(url, ac ? Object.assign({}, options, { signal: ac.signal }) : options);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },

    emitEvent(name, payload) {
      this.$emit('trigger-event', { name, event: payload || {} });
    },
    todayStr() {
      try {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      } catch (e) { return ''; }
    },
    employeeName(e) {
      const first = (e && e.firstname) || '';
      const last = (e && e.lastname) || '';
      return `${first} ${last}`.trim() || 'Mitarbeiter:in';
    },
    formatDate(d) {
      if (!d) return '';
      try { return new Date(d).toLocaleDateString('de-CH'); } catch (e) { return String(d).slice(0, 10); }
    },
    formatMinutes(min) {
      const n = Number(min);
      if (!isFinite(n) || n <= 0) return '0 min';
      const h = Math.floor(n / 60);
      const m = n % 60;
      if (h && m) return `${h} h ${m} min`;
      if (h) return `${h} h`;
      return `${m} min`;
    },
    async loadEmployees() {
      this.loading = true;
      this.authError = false;
      this.loadError = false;
      if (!(this.content && this.content.apiKey) || !(this.content && this.content.authToken)) {
        this.loading = false;
        this.authError = true;
        this.emitEvent('error', { reason: 'auth' });
        return;
      }
      try {
        const url = `${this.baseUrl}/rest/v1/employees?select=id,firstname,lastname&order=lastname.asc`;
        const res = await this.fetchWithTimeout(url, { headers: { ...this.authHeaders, Accept: 'application/json' } });
        if (res.status === 401 || res.status === 403) {
          this.authError = true;
          this.emitEvent('error', { reason: 'auth' });
          return;
        }
        if (!res.ok) { this.loadError = true; this.emitEvent('error', { reason: 'load' }); return; }
        const rows = await res.json().catch(() => []);
        this.employees = Array.isArray(rows) ? rows : [];
        this.emitEvent('loaded', { count: this.employees.length });
        if (this.selectedEmployee) this.loadMonth();
      } catch (e) {
        this.loadError = true;
        this.emitEvent('error', { reason: 'network' });
      } finally {
        this.loading = false;
      }
    },
    buildPayload() {
      this.formError = '';
      const id = this.selectedEmployee;
      if (!id) { this.formError = 'Bitte wähl zuerst eine:n Mitarbeiter:in.'; return null; }
      if (!this.form.workDate) { this.formError = 'Bitte gib den Arbeitstag an.'; return null; }
      const breakMin = Math.max(0, parseInt(this.form.breakMinutes, 10) || 0);
      const payload = {
        employee_id: id,
        work_date: this.form.workDate,
        break_minutes: breakMin,
        source: 'manual',
      };
      const company = (this.content && this.content.companyProfileId) || '';
      if (company) payload.company_profile_id = String(company);

      if (this.form.mode === 'startstopp') {
        if (!this.form.startTime || !this.form.endTime) {
          this.formError = 'Bitte gib Start und Ende an.';
          return null;
        }
        payload.start_time = this.form.startTime;
        payload.end_time = this.form.endTime;
      } else {
        const hours = Number(this.form.hours);
        if (!isFinite(hours) || hours <= 0) {
          this.formError = 'Bitte gib die Netto-Arbeitsstunden an.';
          return null;
        }
        payload.worked_minutes = Math.round(hours * 60);
      }
      return payload;
    },
    async saveEntry() {
      const payload = this.buildPayload();
      if (!payload) return;
      this.saving = true;
      this.saveResult = null;
      try {
        const res = await this.fetchWithTimeout(`${this.baseUrl}/rest/v1/time_entries`, {
          method: 'POST',
          headers: { ...this.authHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
        if (res.status === 401 || res.status === 403) {
          this.authError = true;
          this.emitEvent('error', { reason: 'auth' });
          return;
        }
        if (!res.ok) {
          this.formError = 'Der Eintrag konnte nicht gespeichert werden. Bitte prüf die Angaben und versuch es nochmal.';
          this.emitEvent('error', { reason: 'save' });
          return;
        }
        const rows = await res.json().catch(() => []);
        const row = Array.isArray(rows) ? rows[0] : rows;
        this.saveResult = row || { break_compliant: true };
        this.emitEvent('saved', {
          worked_minutes: (row && row.worked_minutes) || 0,
          break_compliant: !!(row && row.break_compliant),
        });
        // Felder für den nächsten Eintrag zurücksetzen, Tag bleibt stehen.
        this.form.startTime = '';
        this.form.endTime = '';
        this.form.hours = '';
        this.loadMonth();
      } catch (e) {
        this.formError = 'Netzwerkfehler beim Speichern. Versuch es gleich nochmal.';
        this.emitEvent('error', { reason: 'network' });
      } finally {
        this.saving = false;
      }
    },
    async loadMonth() {
      if (!this.selectedEmployee) { this.monthSummary = null; this.entries = []; return; }
      this.loadSummary();
      this.loadEntries();
    },
    async loadSummary() {
      this.monthLoading = true;
      this.monthSummary = null;
      try {
        const url = `${this.baseUrl}/rest/v1/time_entries_monthly?employee_id=eq.${encodeURIComponent(this.selectedEmployee)}&year_month=eq.${encodeURIComponent(this.viewMonth)}&select=worked_minutes,worked_hours,tage_anwesend,gross_minutes,eintraege_pause_nicht_konform`;
        const res = await this.fetchWithTimeout(url, { headers: { ...this.authHeaders, Accept: 'application/json' } });
        if (!res.ok) return;
        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows) && rows.length) this.monthSummary = rows[0];
      } catch (e) { /* Übersicht ist optional */ } finally {
        this.monthLoading = false;
      }
    },
    async loadEntries() {
      this.entriesLoading = true;
      this.entries = [];
      try {
        const monthStart = `${this.viewMonth}-01`;
        const url = `${this.baseUrl}/rest/v1/time_entries?employee_id=eq.${encodeURIComponent(this.selectedEmployee)}&work_date=gte.${monthStart}&order=work_date.desc&select=id,work_date,worked_minutes,break_minutes,gross_minutes,required_break_minutes,break_compliant,source`;
        const res = await this.fetchWithTimeout(url, { headers: { ...this.authHeaders, Accept: 'application/json' } });
        if (!res.ok) return;
        const rows = await res.json().catch(() => []);
        // Nur Einträge des aktuellen Monats (work_date < nächster Monatserster ist
        // serverseitig nicht gefiltert → hier zusätzlich auf YYYY-MM prüfen).
        this.entries = (Array.isArray(rows) ? rows : []).filter(
          (r) => String(r.work_date || '').slice(0, 7) === this.viewMonth
        );
      } catch (e) { /* Einträge optional */ } finally {
        this.entriesLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* ============================================================
   HR am Tisch — Design-Tokens (einheitliches App-Design)
   Eine Datei fuer ALLE Coded Components (vertrag-anzeigen,
   mein-betrieb, meine-faelle, Kuendigung, Krankmeldung, ...).
   Stand: 2026-06-02 · baut auf Design_Plan_HRklar_v2 auf.

   Verwendung in einer Coded Component:
   1) Diese Datei in die Component kopieren (oder Inhalt in den
      <style>-Block am Anfang der Component einfuegen).
   2) Nur die Variablen + .hrk-* Klassen nutzen — keine eigenen
      Farben/Abstaende hart eintippen. So sieht alles gleich aus.
   Tokens stehen auf :root UND .hrk-root, damit jede Component
   auch isoliert (scoped Styles) ihre Variablen sicher erhaelt.
   ============================================================ */

:root, .hrk-root {
  /* --- Markenfarben (aus Designplan v2, markenstimmig) --- */
  --hrk-bordeaux:        #7B2D3B;  /* Primaer: Knoepfe, Links, aktive Schritte */
  --hrk-bordeaux-dark:   #5E2129;  /* Hover/Pressed */
  --hrk-bordeaux-soft:   #F3E7E9;  /* zarte Flaeche (aktive Zeile, Chip-BG) */
  --hrk-creme:           #FBF8F3;  /* Seitenhintergrund */
  --hrk-anthrazit:       #2B2B2B;  /* Haupttext */
  --hrk-gold:            #C9A24B;  /* Akzent, sehr sparsam (Auszeichnung) */

  /* --- Neutrale Flaechen & Linien --- */
  --hrk-surface:         #FFFFFF;  /* Karten, Eingabefelder */
  --hrk-surface-muted:   #F5F1EB;  /* Sektions-Hintergrund, Tabellenkopf */
  --hrk-border:          #ECE5D9;  /* Linien, Feldraender */
  --hrk-border-strong:   #DAD2C6;
  --hrk-text:            #2B2B2B;
  --hrk-text-muted:      #6B6357;  /* Hilfetext, Labels, Platzhalter */

  /* --- Status-/Semantikfarben (Badges, Hinweise) --- */
  --hrk-success:         #2E7D5B;  --hrk-success-bg: #E5F1EB;
  --hrk-warning:         #B7791F;  --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48;  --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F;  --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357;  --hrk-neutral-bg: #EFEAE2;

  /* --- Typografie --- */
  --hrk-font-head: "Fraunces", "Lora", Georgia, serif;        /* nur H1/H2 */
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-h1: 1.9375rem;   /* ~28px */
  --hrk-fs-h2: 1.375rem;  /* ~22px */
  --hrk-fs-h3: 1.125rem;  /* ~18px */
  --hrk-fs-body: 1.0625rem; /* 17px — Mindestgroesse Fliesstext */
  --hrk-fs-small: 0.9375rem; /* 15px */
  --hrk-lh-body: 1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;

  /* --- Abstaende (4px-Raster) --- */
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;

  /* --- Radien, Schatten, Fokus (weiche, warm getoente Schatten) --- */
  --hrk-radius-sm: 8px; --hrk-radius-md: 12px; --hrk-radius-lg: 14px;
  --hrk-radius-pill: 999px;
  --hrk-shadow-card: 0 1px 2px rgba(40,35,30,.05);
  --hrk-shadow-pop:  0 8px 28px rgba(40,35,30,.12);
  --hrk-focus-ring:  0 0 0 3px rgba(123,45,59,.30);

  /* --- Tap-Flaechen (Handy zuerst) --- */
  --hrk-tap-min: 44px;
  --hrk-page-max: 880px; /* lesbare Spaltenbreite */
}

/* ---------------- Basis ---------------- */
.hrk-root, .hrk-root * { box-sizing: border-box; }
.hrk-root {
  font-family: var(--hrk-font-body);
  font-size: var(--hrk-fs-body);
  line-height: var(--hrk-lh-body);
  color: var(--hrk-text);
  background: var(--hrk-creme);
  -webkit-font-smoothing: antialiased;
}
.hrk-page { max-width: var(--hrk-page-max); margin: 0 auto; padding: var(--hrk-space-6) var(--hrk-space-4); }
.hrk-page--wide { max-width: 1100px; }  /* Listen/Tabellen/Profil: Desktop/Tablet-first */
.hrk-h1 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h1); font-weight: var(--hrk-fw-semibold); line-height: 1.15; letter-spacing: -.01em; color: var(--hrk-bordeaux); margin: 0 0 var(--hrk-space-3); }
.hrk-h2 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h2); font-weight: var(--hrk-fw-semibold); line-height: 1.2; letter-spacing: -.01em; color: var(--hrk-bordeaux); margin: var(--hrk-space-6) 0 var(--hrk-space-3); }
.hrk-h3 { font-family: var(--hrk-font-body); font-size: var(--hrk-fs-h3); font-weight: var(--hrk-fw-semibold); margin: var(--hrk-space-5) 0 var(--hrk-space-2); }
.hrk-muted { color: var(--hrk-text-muted); }
.hrk-small { font-size: var(--hrk-fs-small); }
.hrk-stack > * + * { margin-top: var(--hrk-space-4); }

/* ---------------- Knoepfe ---------------- */
.hrk-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-5);
  font: inherit; font-weight: var(--hrk-fw-semibold);
  border-radius: var(--hrk-radius-md); border: 1px solid transparent;
  cursor: pointer; text-decoration: none; transition: background .15s, border-color .15s, transform .05s;
}
.hrk-btn:active { transform: translateY(1px); }
.hrk-btn:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.hrk-btn--primary   { background: var(--hrk-bordeaux); color: #fff; }
.hrk-btn--primary:hover { background: var(--hrk-bordeaux-dark); }
.hrk-btn--secondary { background: var(--hrk-surface); color: var(--hrk-bordeaux); border-color: var(--hrk-border-strong); }
.hrk-btn--secondary:hover { background: var(--hrk-bordeaux-soft); }
.hrk-btn--ghost     { background: transparent; color: var(--hrk-bordeaux); }
.hrk-btn--ghost:hover { background: var(--hrk-bordeaux-soft); }
.hrk-btn[disabled] { opacity: .5; cursor: not-allowed; }
.hrk-btn--block { width: 100%; }

/* sticky Haupt-Aktion am unteren Rand (Handy) */
.hrk-cta-bar { position: sticky; bottom: 0; padding: var(--hrk-space-3) var(--hrk-space-4);
  background: linear-gradient(180deg, rgba(250,246,240,0), var(--hrk-creme) 35%); }

/* ---------------- Eingabefelder ---------------- */
.hrk-field { display: block; margin-bottom: var(--hrk-space-4); }
.hrk-label { display: block; font-weight: var(--hrk-fw-medium); margin-bottom: var(--hrk-space-1); }
.hrk-hint  { color: var(--hrk-text-muted); font-size: var(--hrk-fs-small); margin-top: var(--hrk-space-1); }
.hrk-input, .hrk-select, .hrk-textarea {
  width: 100%; min-height: var(--hrk-tap-min); padding: var(--hrk-space-3);
  font: inherit; color: var(--hrk-text); background: var(--hrk-surface);
  border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-sm);
}
.hrk-input:focus, .hrk-select:focus, .hrk-textarea:focus { outline: none; border-color: var(--hrk-bordeaux); box-shadow: var(--hrk-focus-ring); }
.hrk-input--error { border-color: var(--hrk-danger); }

/* ---------------- Auswahl: Radio-Gruppe (Formular) ---------------- */
.hrk-choice { display: grid; gap: var(--hrk-space-2); }
.hrk-radio { display: flex; align-items: flex-start; gap: var(--hrk-space-3);
  min-height: var(--hrk-tap-min); padding: var(--hrk-space-3) var(--hrk-space-4);
  border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-md);
  background: var(--hrk-surface); cursor: pointer; transition: border-color .15s, background .15s; }
.hrk-radio:hover { border-color: var(--hrk-border-strong); }
.hrk-radio:focus-within { outline: none; border-color: var(--hrk-bordeaux); box-shadow: var(--hrk-focus-ring); }
.hrk-radio input { flex: none; width: 18px; height: 18px; margin: 2px 0 0; accent-color: var(--hrk-bordeaux); }
.hrk-radio--selected { border-color: var(--hrk-bordeaux); background: var(--hrk-bordeaux-soft); }
.hrk-radio__body { min-width: 0; }
.hrk-radio__title { display: block; font-weight: var(--hrk-fw-semibold); }
.hrk-radio__hint { display: block; color: var(--hrk-text-muted); font-size: var(--hrk-fs-small); margin-top: 2px; }
/* kleines Info-(i) + Erklaerungs-Box (Formular-Felder) */
.hrk-info-btn { display: inline-grid; place-items: center; width: 20px; height: 20px; margin-left: var(--hrk-space-1);
  border-radius: 50%; border: 1px solid var(--hrk-border-strong); background: var(--hrk-surface);
  color: var(--hrk-text-muted); font-size: 12px; font-weight: var(--hrk-fw-semibold); line-height: 1; cursor: pointer; vertical-align: middle; }
.hrk-info-btn:hover { color: var(--hrk-bordeaux); border-color: var(--hrk-bordeaux); }
.hrk-info { margin-top: var(--hrk-space-2); }

/* ---------------- Karten ---------------- */
.hrk-card { background: var(--hrk-surface); border: 1px solid var(--hrk-border);
  border-radius: var(--hrk-radius-lg); box-shadow: var(--hrk-shadow-card);
  padding: var(--hrk-space-5); }
.hrk-card + .hrk-card { margin-top: var(--hrk-space-4); }

/* ---------------- Datensatz-Kopf (Name + Typ + Status) ---------------- */
.hrk-record-head { display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--hrk-space-3); flex-wrap: wrap; }
.hrk-record-head__main { flex: 1 1 14rem; min-width: 0; }
.hrk-record-head__name { margin: 0 0 var(--hrk-space-1); }
.hrk-record-head__type { margin: 0; }

/* ---------------- Schluesseldaten-Liste (z.B. Brutto-/Nettolohn) ---------------- */
.hrk-dl { margin: 0; }
.hrk-dl__row { display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--hrk-space-4); padding: var(--hrk-space-2) 0; border-bottom: 1px solid var(--hrk-border); }
.hrk-dl__row:last-child { border-bottom: 0; }
.hrk-dl dt { color: var(--hrk-text-muted); }
.hrk-dl dd { margin: 0; font-weight: var(--hrk-fw-semibold); font-variant-numeric: tabular-nums; }

/* ---------------- Status-Badges ---------------- */
.hrk-badge { display: inline-flex; align-items: center; gap: var(--hrk-space-2);
  padding: 0; border-radius: 0; background: none;
  font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-semibold); line-height: 1.6; white-space: nowrap; }
.hrk-badge::before { content: ""; flex: none; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.hrk-badge--success { color: var(--hrk-success); }
.hrk-badge--warning { color: var(--hrk-warning); }
.hrk-badge--danger  { color: var(--hrk-danger); }
.hrk-badge--info    { color: var(--hrk-info); }
.hrk-badge--neutral { color: var(--hrk-neutral); }
/* Status-Mapping (App) — verbindlich, siehe DESIGN-SYSTEM.md:
   entwurf_erstellt -> neutral · entwurf_bereit -> info · wartet_corina -> warning
   heikler_fall -> danger · freigegeben -> success. Nie nur Farbe — immer + Wort. */

/* ---------------- Wizard-Stepper ---------------- */
.hrk-stepper { display: flex; align-items: center; gap: var(--hrk-space-2); margin-bottom: var(--hrk-space-5); }
.hrk-step { flex: 1; height: 6px; border-radius: var(--hrk-radius-pill); background: var(--hrk-border); }
.hrk-step--done, .hrk-step--current { background: var(--hrk-bordeaux); }
.hrk-step-label { font-size: var(--hrk-fs-small); color: var(--hrk-text-muted); margin-bottom: var(--hrk-space-2); }

/* ---------------- Emily (immer erreichbar; Seiten-Geruest, NICHT in der Component) ---------------- */
.hrk-emily-fab { position: fixed; right: var(--hrk-space-4); bottom: var(--hrk-space-4);
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-4);
  display: inline-flex; align-items: center; gap: var(--hrk-space-2);
  background: var(--hrk-bordeaux); color: #fff; border: none;
  border-radius: var(--hrk-radius-pill); box-shadow: var(--hrk-shadow-pop); cursor: pointer; }
.hrk-emily-bubble { background: var(--hrk-bordeaux-soft); color: var(--hrk-anthrazit);
  border-radius: var(--hrk-radius-lg) var(--hrk-radius-lg) var(--hrk-radius-lg) var(--hrk-space-1);
  padding: var(--hrk-space-3) var(--hrk-space-4); max-width: 90%; }

/* ---------------- Chat (Emily-Dialog IN der Component) ---------------- */
.hrk-chat { display: flex; flex-direction: column; min-height: 0; }
.hrk-chat__list { display: flex; flex-direction: column; gap: var(--hrk-space-3);
  max-height: 60vh; overflow-y: auto; padding: var(--hrk-space-2) var(--hrk-space-1); }
.hrk-chat__row { display: flex; }
.hrk-chat__row--user { justify-content: flex-end; }
.hrk-chat__row--emily { justify-content: flex-start; }
.hrk-bubble { max-width: 85%; padding: var(--hrk-space-3) var(--hrk-space-4);
  white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.5; }
.hrk-bubble--emily { background: var(--hrk-bordeaux-soft); color: var(--hrk-anthrazit);
  border-radius: var(--hrk-radius-lg) var(--hrk-radius-lg) var(--hrk-radius-lg) var(--hrk-space-1); }
.hrk-bubble--user { background: var(--hrk-bordeaux); color: #fff;
  border-radius: var(--hrk-radius-lg) var(--hrk-radius-lg) var(--hrk-space-1) var(--hrk-radius-lg); }
.hrk-chat__form { display: flex; align-items: flex-end; gap: var(--hrk-space-2); padding-top: var(--hrk-space-3); }
.hrk-chat__input { flex: 1; max-height: 160px; }
.hrk-typing { display: inline-flex; align-items: center; gap: 4px;
  padding: var(--hrk-space-3) var(--hrk-space-4); }
.hrk-typing__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--hrk-text-muted);
  animation: hrk-typing 1s infinite ease-in-out; }
.hrk-typing__dot:nth-child(2) { animation-delay: .15s; }
.hrk-typing__dot:nth-child(3) { animation-delay: .3s; }
@keyframes hrk-typing { 0%, 100% { transform: translateY(0); opacity: .4; } 50% { transform: translateY(-3px); opacity: .9; } }

/* ---------------- Tabellen / Listen ---------------- */
.hrk-table { width: 100%; border-collapse: collapse; font-size: var(--hrk-fs-body); }
.hrk-table th { text-align: left; font-weight: var(--hrk-fw-semibold); color: var(--hrk-text-muted);
  background: var(--hrk-surface-muted); padding: var(--hrk-space-3); border-bottom: 1px solid var(--hrk-border); }
.hrk-table td { padding: var(--hrk-space-3); border-bottom: 1px solid var(--hrk-border); }

/* ---------------- Dokument-/PDF-Rahmen ---------------- */
.hrk-doc { width: 100%; border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-md);
  overflow: hidden; background: var(--hrk-surface-muted); }
.hrk-doc__frame { display: block; width: 100%; height: 70vh; min-height: 480px; border: 0;
  background: var(--hrk-surface-muted); }

/* ---------------- Fliesstext aus generierten Dokumenten (Zeugnis etc., pre-wrap) ---------------- */
.hrk-prose { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7;
  color: var(--hrk-text); background: var(--hrk-surface-muted);
  border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-md);
  padding: var(--hrk-space-4) var(--hrk-space-5); }

/* ---------------- Aktionsleiste ---------------- */
.hrk-actions { display: flex; flex-wrap: wrap; gap: var(--hrk-space-3); }
.hrk-action-msg { margin: 0; color: var(--hrk-text-muted); font-size: var(--hrk-fs-small); }

/* ---------------- Hinweis-Boxen ---------------- */
.hrk-note { border-left: 4px solid var(--hrk-info); background: var(--hrk-info-bg);
  padding: var(--hrk-space-3) var(--hrk-space-4); border-radius: var(--hrk-radius-sm); }
.hrk-note--warn   { border-left-color: var(--hrk-warning); background: var(--hrk-warning-bg); }
.hrk-note--danger { border-left-color: var(--hrk-danger);  background: var(--hrk-danger-bg); }
.hrk-note--muted  { border-left-color: var(--hrk-border-strong); background: var(--hrk-surface-muted); color: var(--hrk-text-muted); }
.hrk-note__list { margin: var(--hrk-space-2) 0 0; padding-left: var(--hrk-space-5); }

/* ---------------- Zustaende (Laden / Fehler / leer) ---------------- */
.hrk-state { display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3);
  padding: var(--hrk-space-7) var(--hrk-space-4); color: var(--hrk-text-muted); text-align: center; }
.hrk-state--mini { padding: var(--hrk-space-6) var(--hrk-space-3); }
.hrk-state__title { color: var(--hrk-text); font-weight: var(--hrk-fw-semibold); margin: 0; }
.hrk-state__icon { font-size: 2rem; }
.hrk-spinner { width: 28px; height: 28px; border: 3px solid var(--hrk-border);
  border-top-color: var(--hrk-bordeaux); border-radius: 50%; animation: hrk-spin .8s linear infinite; }
@keyframes hrk-spin { to { transform: rotate(360deg); } }

/* ---------------- Leerzustand ---------------- */
.hrk-empty { text-align: center; color: var(--hrk-text-muted); padding: var(--hrk-space-7) var(--hrk-space-4); }

/* ---------------- Tablet (≤768px) ---------------- */
@media (max-width: 768px) {
  .hrk-page--wide { max-width: 100%; }
  .hrk-page { padding: var(--hrk-space-5) var(--hrk-space-4); }
}

/* ---------------- Handy zuerst (≤600px / 375px) ---------------- */
@media (max-width: 600px) {
  :root, .hrk-root { --hrk-fs-h1: 1.625rem; }
  .hrk-page { padding: var(--hrk-space-4) var(--hrk-space-3); }
  .hrk-card { padding: var(--hrk-space-4); overflow-x: auto; }
  /* Knoepfe in Aktionsleisten & sticky CTA: volle Breite, gestapelt (Daumen erreicht alles) */
  .hrk-actions { flex-direction: column; align-items: stretch; }
  .hrk-actions .hrk-btn { width: 100%; }
  .hrk-cta-bar .hrk-btn { width: 100%; }
  /* Tabellen kompakter, damit nichts horizontal ueberlaeuft */
  .hrk-table { font-size: var(--hrk-fs-small); }
  .hrk-table th, .hrk-table td { padding: var(--hrk-space-2); }
  /* Schluesseldaten enger; Chat-Blasen breiter; Dokument-Rahmen niedriger */
  .hrk-dl__row { gap: var(--hrk-space-2); }
  .hrk-bubble { max-width: 92%; }
  .hrk-doc__frame { height: 60vh; min-height: 360px; }
}
</style>

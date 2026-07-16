<template>
  <div class="hrk-root">
    <main class="hrk-page hrk-page--wide">

      <!-- Header -->
      <div class="hrk-record-head" style="margin-bottom: var(--hrk-space-4)">
        <div class="hrk-record-head__main">
          <h1 class="hrk-h1" style="margin: 0">Zeiterfassung</h1>
          <p class="hrk-muted" style="margin: var(--hrk-space-1) 0 0">
            Trag die geleisteten Stunden wochenweise ein.
          </p>
        </div>
        <a v-if="content && content.backUrl" class="hrk-btn hrk-btn--ghost" :href="content.backUrl">← Zurück</a>
      </div>

      <!-- Auth-Fehler -->
      <div v-if="authError" class="hrk-state" role="alert">
        <div class="hrk-state__icon" aria-hidden="true">🔒</div>
        <p class="hrk-state__title">Bitte neu anmelden</p>
        <p class="hrk-muted">Damit du Stunden erfassen kannst, meld dich bitte wieder an.</p>
      </div>

      <template v-else>
        <!-- Mitarbeiter-Auswahl (nur wenn employeeId nicht per Prop gesetzt) -->
        <div v-if="!propEmployeeId" class="hrk-card" style="margin-bottom: var(--hrk-space-4)">
          <div class="hrk-field" style="margin-bottom: 0">
            <label class="hrk-label" for="ze-emp-select">Mitarbeiter:in</label>
            <div v-if="empLoading" class="hrk-state hrk-state--mini">
              <div class="hrk-spinner" aria-hidden="true"></div>
            </div>
            <select v-else id="ze-emp-select" class="hrk-select" v-model="selectedEmployee" @change="onEmployeeChange">
              <option value="">Bitte wählen …</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ empName(e) }}</option>
            </select>
          </div>
        </div>

        <!-- Wochennavigation -->
        <div class="ze-week-nav hrk-card" style="margin-bottom: var(--hrk-space-4)">
          <button type="button" class="hrk-btn hrk-btn--secondary" @click="shiftWeek(-1)">← Vorwoche</button>
          <span class="ze-week-label hrk-h3" style="margin: 0">{{ weekLabel }}</span>
          <button type="button" class="hrk-btn hrk-btn--secondary" @click="shiftWeek(1)" :disabled="weekOffset >= 0">Nächste Woche →</button>
        </div>

        <!-- Laden-Zustand -->
        <div v-if="loading" class="hrk-state">
          <div class="hrk-spinner" aria-hidden="true"></div>
          <p class="hrk-muted">Woche wird geladen …</p>
        </div>

        <!-- Kein Mitarbeiter gewählt -->
        <div v-else-if="!selectedEmployee" class="hrk-state hrk-state--mini">
          <p class="hrk-muted">Wähl oben eine:n Mitarbeiter:in, um die Woche anzuzeigen.</p>
        </div>

        <!-- Wochentabelle -->
        <div v-else class="hrk-card" style="overflow-x: auto">
          <table class="hrk-table ze-table">
            <thead>
              <tr>
                <th class="ze-col-day">Tag</th>
                <th class="ze-col-time">Start</th>
                <th class="ze-col-time">Ende</th>
                <th class="ze-col-pause">Pause<br><span class="hrk-small" style="font-weight: 400">(min)</span></th>
                <th class="ze-col-net">Netto</th>
                <th class="ze-col-note">Notiz</th>
                <th v-if="!readonly" class="ze-col-action"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="day in weekDays"
                :key="day.date"
                :class="['ze-row', rowClass(day), { 'ze-row--today': isToday(day.date) }]"
              >
                <!-- Tag -->
                <td class="ze-day-cell">
                  <span class="ze-weekday">{{ day.weekday }}</span>
                  <!-- Stempeluhr-Kennzeichnung (source='clock') -->
                  <svg
                    v-if="day.source === 'clock'"
                    class="ze-src-clock"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    role="img"
                    aria-label="Über die Stempeluhr erfasst"
                  >
                    <title>Über die Stempeluhr erfasst</title>
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15.5 14" />
                  </svg>
                  <br>
                  <span class="hrk-small hrk-muted">{{ day.label }}</span>
                </td>

                <!-- Start -->
                <td>
                  <input
                    class="hrk-input ze-input-time"
                    type="time"
                    v-model="day.start"
                    :disabled="readonly"
                    @change="day.saved = false"
                    :aria-label="'Start ' + day.weekday"
                  />
                </td>

                <!-- Ende -->
                <td>
                  <input
                    class="hrk-input ze-input-time"
                    type="time"
                    v-model="day.end"
                    :disabled="readonly"
                    @change="day.saved = false"
                    :aria-label="'Ende ' + day.weekday"
                  />
                </td>

                <!-- Pause -->
                <td>
                  <input
                    class="hrk-input ze-input-small"
                    type="number"
                    min="0"
                    max="480"
                    step="5"
                    v-model.number="day.pause"
                    :disabled="readonly"
                    @change="day.saved = false"
                    :aria-label="'Pause ' + day.weekday"
                  />
                  <!-- Hinweis: Pause unter L-GAV-Minimum (Serverwert, generierte Spalte) -->
                  <span v-if="day.breakCompliant === false" class="ze-pause-hint">
                    unter Minimum ({{ day.requiredBreak }} Min)
                  </span>
                </td>

                <!-- Netto (live berechnet) -->
                <td class="ze-net-cell" :class="netClass(day)">
                  <span class="ze-net-value">{{ formatNet(day) }}</span>
                </td>

                <!-- Notiz -->
                <td>
                  <input
                    class="hrk-input ze-input-note"
                    type="text"
                    maxlength="200"
                    placeholder="Notiz …"
                    v-model="day.note"
                    :disabled="readonly"
                    @change="day.saved = false"
                    :aria-label="'Notiz ' + day.weekday"
                  />
                </td>

                <!-- Speichern -->
                <td v-if="!readonly" class="ze-action-cell">
                  <div v-if="day.error" class="ze-row-error hrk-small" style="color: var(--hrk-danger)" role="alert">⚠ {{ day.error }}</div>
                  <button
                    v-else
                    type="button"
                    class="hrk-btn hrk-btn--secondary ze-save-btn"
                    :disabled="day.saving || !canSave(day)"
                    @click="saveDay(day)"
                    :aria-label="'Speichern ' + day.weekday"
                  >
                    <span v-if="day.saving">…</span>
                    <span v-else-if="day.saved" style="color: var(--hrk-success)">✓</span>
                    <span v-else>Speichern</span>
                  </button>
                </td>
              </tr>
            </tbody>

            <!-- Wochentotal -->
            <tfoot>
              <tr class="ze-total-row">
                <td class="hrk-muted" :colspan="readonly ? 4 : 4">Wochentotal</td>
                <td class="ze-total-cell">{{ weekTotal }}</td>
                <td :colspan="readonly ? 1 : 2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Globaler Fehler -->
        <div v-if="globalError" class="hrk-note hrk-note--danger" style="margin-top: var(--hrk-space-4)" role="alert">
          {{ globalError }}
        </div>
      </template>
    </main>
  </div>
</template>

<script>
/**
 * WeWeb Coded Component — Zeiterfassung Wochenansicht (Imploya)
 * Zeigt eine editierbare Wochenübersicht (Mo–So) pro Mitarbeiter:in.
 * Liest/schreibt time_entries über Supabase REST (Anon-Key + User-JWT).
 * RLS schützt die Daten — nur der eigene Betrieb ist sichtbar.
 *
 * Backend: bestehende time_entries-Tabelle (MVP, deployt 2026-06-03).
 * Eintrag pro Tag: start_time, end_time, break_minutes, note.
 * worked_minutes wird serverseitig vom Trigger berechnet.
 */
export default {
  props: {
    content: { type: Object, required: true },
    uid:     { type: String, required: false, default: '' },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: false, default: () => ({}) },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],

  data() {
    return {
      // Auth
      authError: false,

      // Mitarbeiter
      empLoading:       false,
      employees:        [],
      selectedEmployee: '',

      // Woche
      weekOffset: 0,
      weekDays:   [],

      // Zustände
      loading:     false,
      globalError: '',
    };
  },

  computed: {
    baseUrl() {
      let url = (this.content && this.content.supabaseUrl) || '';
      if (/nemxnflngcfrpamkuesm/.test(String(url))) url = '';
      return String(url).replace(/\/+$/, '');
    },
    // Token LIVE lesen: zuerst Property (WeWeb-Binding), sonst WeWeb-Auth-Kontext,
    // sonst persistierte Supabase-Session. Das Prop-Binding hinkt nach Login/Token-Refresh
    // hinterher — mit stale Token liefe jeder Request in 401 (Session-1h-Bug).
    tokenRaw() {
      const fromProp = ((this.content && this.content.authToken) || '').toString().trim();
      if (fromProp) return fromProp;
      try {
        const auth = (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth) ? wwLib.globalContext.auth : null;
        const at = auth && auth.session && auth.session.access_token;
        if (at) return String(at).trim();
      } catch (e) { /* ignore */ }
      try {
        const win = (typeof wwLib !== 'undefined' && wwLib.getFrontWindow) ? wwLib.getFrontWindow() : (typeof window !== 'undefined' ? window : null);
        const ls = win && win.localStorage;
        if (ls) {
          const ref = ((String(this.baseUrl || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i) || [])[1]) || 'ztvqsxdudzdyqgeylujr';
          const raw = ls.getItem(`sb-${ref}-auth-token`);
          if (raw) {
            const o = JSON.parse(raw);
            const at = (o && o.access_token) || (o && o.currentSession && o.currentSession.access_token);
            if (at) return String(at).trim();
          }
        }
      } catch (e) { /* ignore */ }
      return '';
    },
    authHeaders() {
      const key   = (this.content && this.content.apiKey) || '';
      const token = this.tokenRaw;
      const bearer = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      return { apikey: key, Authorization: bearer };
    },
    propEmployeeId() {
      return String((this.content && this.content.employeeId) || '').trim();
    },
    readonly() {
      return !!(this.content && this.content.readonly);
    },
    weekLabel() {
      if (!this.weekDays.length) return '';
      const first = this.weekDays[0];
      const last  = this.weekDays[6];
      return `${first.label} – ${last.label} ${first.year}`;
    },
    weekTotal() {
      let total = 0;
      this.weekDays.forEach(d => {
        const min = this.calcNetMin(d);
        if (min !== null && min > 0) total += min;
      });
      return this.fmtMin(total) || '0h';
    },
  },

  watch: {
    'content.authToken'() { this.init(); },
    'content.employeeId'(v) {
      if (v) { this.selectedEmployee = String(v); this.loadWeek(); }
    },
    'content.weekOffset'(v) {
      if (typeof v === 'number') { this.weekOffset = v; this.loadWeek(); }
    },
  },

  mounted() {
    if (this.content && typeof this.content.weekOffset === 'number') {
      this.weekOffset = this.content.weekOffset;
    }
    this.init();
  },

  methods: {
    // ── Infrastruktur ────────────────────────────────────────────
    async fetchWithTimeout(url, options, ms) {
      const timeout = ms || 10000;
      const ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timer = ac ? setTimeout(() => ac.abort(), timeout) : null;
      try {
        return await fetch(url, ac ? { ...options, signal: ac.signal } : options);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    emit(name, payload) {
      this.$emit('trigger-event', { name, event: payload || {} });
    },
    // Bei 401 das Supabase-Token via GoTrue (refresh_token) erneuern (Session-1h-Härtung).
    async _refreshAuthToken() {
      try {
        const auth = (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth) ? wwLib.globalContext.auth : null;
        const rt = auth && auth.session && auth.session.refresh_token;
        const apiKey = (this.content && this.content.apiKey) || '';
        if (!rt || !apiKey) return '';
        const res = await this.fetchWithTimeout(`${this.baseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (!res.ok) return '';
        const ns = await res.json();
        if (!ns || !ns.access_token) return '';
        try {
          const win = (typeof wwLib !== 'undefined' && wwLib.getFrontWindow) ? wwLib.getFrontWindow() : (typeof window !== 'undefined' ? window : null);
          const ls = win && win.localStorage;
          const wwSess = { access_token: ns.access_token, token_type: ns.token_type, expires_in: ns.expires_in, expires_at: ns.expires_at, refresh_token: ns.refresh_token };
          if (ls) {
            ls.setItem('ww-auth-session', JSON.stringify(wwSess));
            const ref = ((String(this.baseUrl || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i) || [])[1]) || 'ztvqsxdudzdyqgeylujr';
            const k = `sb-${ref}-auth-token`; const cur = JSON.parse(ls.getItem(k) || '{}');
            ls.setItem(k, JSON.stringify(Object.assign(cur, wwSess, { user: ns.user || cur.user })));
          }
          if (auth && auth.session) Object.assign(auth.session, wwSess);
        } catch (e) { /* Writeback best-effort */ }
        return ns.access_token;
      } catch (e) { return ''; }
    },
    // Zentraler authentisierter Fetch: Token live + bei 401 einmalig Refresh + Retry.
    async authedFetch(url, options, ms) {
      const opts = options || {};
      const merged = Object.assign({}, opts, { headers: Object.assign({}, opts.headers || {}, this.authHeaders) });
      let res = await this.fetchWithTimeout(url, merged, ms);
      if (res && res.status === 401) {
        const fresh = await this._refreshAuthToken();
        if (fresh) {
          const retry = Object.assign({}, opts, { headers: Object.assign({}, opts.headers || {}, this.authHeaders, { Authorization: `Bearer ${fresh}` }) });
          res = await this.fetchWithTimeout(url, retry, ms);
        }
      }
      return res;
    },

    // ── Initialisierung ──────────────────────────────────────────
    init() {
      this.authError = false;
      if (!(this.content && this.content.apiKey) || !this.tokenRaw) {
        this.authError = true;
        this.emit('error', { reason: 'auth' });
        return;
      }
      if (this.propEmployeeId) {
        this.selectedEmployee = this.propEmployeeId;
        this.loadWeek();
      } else {
        this.loadEmployees();
      }
    },

    // ── Mitarbeiterliste ─────────────────────────────────────────
    async loadEmployees() {
      this.empLoading = true;
      try {
        const url = `${this.baseUrl}/rest/v1/employees?select=id,firstname,lastname&order=lastname.asc`;
        const res = await this.authedFetch(url, { headers: { Accept: 'application/json' } });
        if (res.status === 401 || res.status === 403) { this.authError = true; return; }
        if (!res.ok) return;
        const rows = await res.json().catch(() => []);
        this.employees = Array.isArray(rows) ? rows : [];
        this.emit('loaded', { count: this.employees.length });
      } catch (e) {
        /* Ladeliste optional — kein globalError */
      } finally {
        this.empLoading = false;
      }
    },
    empName(e) {
      return `${(e && e.firstname) || ''} ${(e && e.lastname) || ''}`.trim() || 'Mitarbeiter:in';
    },
    onEmployeeChange() {
      this.loadWeek();
    },

    // ── Woche berechnen ──────────────────────────────────────────
    getMondayDate() {
      const today = new Date();
      const d = new Date(today);
      // Wochentag so dass Montag = 0
      const dow = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - dow + this.weekOffset * 7);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    dateStr(d) {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    },
    buildEmptyWeek() {
      const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
      const monday = this.getMondayDate();
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        days.push({
          date:    this.dateStr(d),
          year:    d.getFullYear(),
          weekday: names[i],
          label:   d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
          start:   '',
          end:     '',
          pause:   0,
          note:    '',
          entryId: null,
          workedMinutes: null,
          // Stempeluhr-MVP (additiv): Serverwerte aus time_entries
          source:         '',    // 'manual' | 'clock'
          breakCompliant: null,  // false = Pause unter L-GAV-Minimum
          requiredBreak:  null,  // Mindestpause in Minuten (generierte Spalte)
          saving:  false,
          saved:   false,
          error:   '',
        });
      }
      return days;
    },
    shiftWeek(delta) {
      this.weekOffset += delta;
      this.loadWeek();
    },
    isToday(dateStr) {
      return dateStr === this.dateStr(new Date());
    },

    // ── Laden ────────────────────────────────────────────────────
    async loadWeek() {
      if (!this.selectedEmployee) { this.weekDays = this.buildEmptyWeek(); return; }
      this.loading = true;
      this.globalError = '';
      const days = this.buildEmptyWeek();

      try {
        const monday = days[0].date;
        const sunday = days[6].date;
        const url = `${this.baseUrl}/rest/v1/time_entries`
          + `?employee_id=eq.${encodeURIComponent(this.selectedEmployee)}`
          + `&work_date=gte.${monday}&work_date=lte.${sunday}`
          + `&order=work_date.asc,created_at.asc`
          + `&select=id,work_date,start_time,end_time,break_minutes,worked_minutes,note,gross_minutes,required_break_minutes,break_compliant,source`;

        const res = await this.authedFetch(url, { headers: { Accept: 'application/json' } });
        if (res.status === 401 || res.status === 403) { this.authError = true; return; }
        if (!res.ok) { this.globalError = 'Wochendaten konnten nicht geladen werden.'; return; }

        const entries = await res.json().catch(() => []);

        // Pro Datum: ersten Eintrag nehmen (falls mehrere existieren / Splitschicht)
        const byDate = {};
        (Array.isArray(entries) ? entries : []).forEach(e => {
          const d = String(e.work_date || '').slice(0, 10);
          if (!byDate[d]) byDate[d] = e;
        });

        days.forEach(day => {
          const e = byDate[day.date];
          if (e) {
            day.entryId      = e.id;
            day.start        = e.start_time ? String(e.start_time).slice(0, 5) : '';
            day.end          = e.end_time   ? String(e.end_time  ).slice(0, 5) : '';
            day.pause        = e.break_minutes || 0;
            day.note         = e.note || '';
            day.workedMinutes = e.worked_minutes || null;
            day.source         = e.source || '';
            day.breakCompliant = (typeof e.break_compliant === 'boolean') ? e.break_compliant : null;
            day.requiredBreak  = (typeof e.required_break_minutes === 'number') ? e.required_break_minutes : null;
          }
        });

        this.weekDays = days;
        this.emit('loaded', { count: Object.keys(byDate).length });
      } catch (e) {
        this.globalError = 'Netzwerkfehler beim Laden der Woche.';
        this.emit('error', { reason: 'network' });
      } finally {
        this.loading = false;
      }
    },

    // ── Speichern ────────────────────────────────────────────────
    canSave(day) {
      // Speichern erlaubt wenn Start gesetzt — Server berechnet Netto
      return !!day.start;
    },
    async saveDay(day) {
      if (!this.selectedEmployee) return;
      day.saving = true;
      day.saved  = false;
      day.error  = '';

      const payload = {
        employee_id:   this.selectedEmployee,
        work_date:     day.date,
        start_time:    day.start || null,
        end_time:      day.end   || null,
        break_minutes: day.pause || 0,
        note:          day.note  || null,
      };
      // source nur bei NEUEN Eintraegen setzen — beim Bearbeiten bestehender
      // Eintraege bleibt 'clock' (Stempeluhr) erhalten (additiv, Stempeluhr-MVP).
      if (!day.entryId) payload.source = 'manual';

      try {
        let res;
        if (day.entryId) {
          // Bestehenden Eintrag aktualisieren (PATCH)
          res = await this.authedFetch(
            `${this.baseUrl}/rest/v1/time_entries?id=eq.${encodeURIComponent(day.entryId)}`,
            {
              method:  'PATCH',
              headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
              body:    JSON.stringify(payload),
            }
          );
        } else {
          // Neuen Eintrag anlegen (POST)
          res = await this.authedFetch(
            `${this.baseUrl}/rest/v1/time_entries`,
            {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
              body:    JSON.stringify(payload),
            }
          );
        }

        if (res.status === 401 || res.status === 403) { this.authError = true; return; }
        if (!res.ok) {
          day.error = 'Speichern fehlgeschlagen – bitte nochmal versuchen.';
          this.emit('error', { reason: 'save' });
          return;
        }

        const rows = await res.json().catch(() => []);
        const row  = Array.isArray(rows) ? rows[0] : rows;
        if (row) {
          day.entryId       = row.id || day.entryId;
          day.workedMinutes = row.worked_minutes || null;
        }
        day.saved = true;
        setTimeout(() => { if (day.saved) day.saved = false; }, 3000);
        this.emit('saved', { date: day.date, worked_minutes: (row && row.worked_minutes) || 0 });

      } catch (e) {
        day.error = 'Netzwerkfehler. Versuch es gleich nochmal.';
        this.emit('error', { reason: 'network' });
      } finally {
        day.saving = false;
      }
    },

    // ── Berechnung & Formatierung ────────────────────────────────
    calcNetMin(day) {
      if (day.workedMinutes !== null && !day.start && !day.end) {
        // Nur server-Wert vorhanden (kein Start/Ende-Paar zum live-rechnen)
        return day.workedMinutes;
      }
      if (!day.start || !day.end) return null;
      const [sh, sm] = day.start.split(':').map(Number);
      const [eh, em] = day.end.split(':').map(Number);
      let startMin = sh * 60 + sm;
      let endMin   = eh * 60 + em;
      if (endMin <= startMin) endMin += 24 * 60; // Nachtschicht
      return Math.max(0, endMin - startMin - (day.pause || 0));
    },
    fmtMin(totalMin) {
      if (!totalMin || totalMin <= 0) return '';
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h && m) return `${h}h ${m}m`;
      if (h) return `${h}h`;
      return `${m}m`;
    },
    formatNet(day) {
      const min = this.calcNetMin(day);
      if (min === null) return '—';
      return this.fmtMin(min) || '0m';
    },
    netClass(day) {
      const min = this.calcNetMin(day);
      if (min === null || min <= 0) return '';
      const h = min / 60;
      if (h > 10) return 'ze-net--danger';
      if (h < 4)  return 'ze-net--warning';
      return '';
    },
    rowClass(day) {
      const classes = [];
      const min = this.calcNetMin(day);
      if (min !== null && min > 0) {
        const h = min / 60;
        if (h > 10)     classes.push('ze-row--danger');
        else if (h < 4) classes.push('ze-row--warning');
      }
      // Stempeluhr-MVP (additiv): Pause unter L-GAV-Minimum markieren
      if (day.breakCompliant === false) classes.push('ze-row--pause');
      return classes.join(' ');
    },
  },
};
</script>

<style scoped>
/* ── Design-Tokens ── */
:root, .hrk-root {
  --hrk-bordeaux:        #7B2D3B;
  --hrk-bordeaux-dark:   #5E2129;
  --hrk-bordeaux-soft:   #F3E7E9;
  --hrk-creme:           #FBF8F3;
  --hrk-anthrazit:       #2B2B2B;
  --hrk-gold:            #C9A24B;
  --hrk-on-primary:      #FFFFFF;  /* Text/Icons auf primaer (Bordeaux) gefaerbten Flaechen */
  --hrk-surface:         #FFFFFF;
  --hrk-surface-muted:   #F5F1EB;
  --hrk-border:          #ECE5D9;
  --hrk-border-strong:   #DAD2C6;
  --hrk-text:            #2B2B2B;
  --hrk-text-muted:      #6B6357;
  --hrk-success:         #2E7D5B; --hrk-success-bg: #E5F1EB;
  --hrk-warning:         #B7791F; --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48; --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F; --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357; --hrk-neutral-bg: #EFEAE2;
  --hrk-font-head: "Fraunces", "Lora", Georgia, serif;
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-h1: 1.9375rem;
  --hrk-fs-h2: 1.375rem;
  --hrk-fs-h3: 1.125rem;
  --hrk-fs-body: 1.0625rem;
  --hrk-fs-small: 0.9375rem;
  --hrk-lh-body: 1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;
  --hrk-radius-sm: 8px; --hrk-radius-md: 12px; --hrk-radius-lg: 14px;
  --hrk-radius-pill: 999px;
  --hrk-shadow-card: 0 1px 2px rgba(40,35,30,.05);
  --hrk-shadow-pop:  0 8px 28px rgba(40,35,30,.12);
  --hrk-focus-ring:  0 0 0 3px rgba(123,45,59,.30);
  --hrk-tap-min: 44px;
  --hrk-page-max: 880px;
}

/* ── Basis ── */
.hrk-root, .hrk-root * { box-sizing: border-box; }
.hrk-root {
  width: 100%; box-sizing: border-box;  /* Audit-Fix: fuellt die Sektion, .hrk-page zentriert wieder */
  font-family: var(--hrk-font-body); font-size: var(--hrk-fs-body);
  line-height: var(--hrk-lh-body); color: var(--hrk-text);
  background: var(--hrk-creme); -webkit-font-smoothing: antialiased;
}
.hrk-page { max-width: var(--hrk-page-max); margin: 0 auto; padding: var(--hrk-space-6) var(--hrk-space-4); }
.hrk-page--wide { max-width: 1100px; }
.hrk-h1 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h1); font-weight: var(--hrk-fw-semibold); line-height: 1.12; letter-spacing: -.02em; color: var(--hrk-bordeaux); margin: 0 0 var(--hrk-space-3); }
.hrk-h2 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h2); font-weight: var(--hrk-fw-semibold); color: var(--hrk-bordeaux); margin: var(--hrk-space-6) 0 var(--hrk-space-3); }
.hrk-h3 { font-family: var(--hrk-font-body); font-size: var(--hrk-fs-h3); font-weight: var(--hrk-fw-semibold); margin: var(--hrk-space-5) 0 var(--hrk-space-2); }
.hrk-muted { color: var(--hrk-text-muted); }
.hrk-small { font-size: var(--hrk-fs-small); }
.hrk-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-5);
  font: inherit; font-weight: var(--hrk-fw-semibold);
  border-radius: var(--hrk-radius-md); border: 1px solid transparent;
  cursor: pointer; text-decoration: none; transition: background .15s, border-color .15s;
}
.hrk-btn:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.hrk-btn--primary   { background: var(--hrk-bordeaux); color: var(--hrk-on-primary); }
.hrk-btn--primary:hover { background: var(--hrk-bordeaux-dark); }
.hrk-btn--secondary { background: var(--hrk-surface); color: var(--hrk-bordeaux); border-color: var(--hrk-border-strong); }
.hrk-btn--secondary:hover { background: var(--hrk-bordeaux-soft); }
.hrk-btn--ghost     { background: transparent; color: var(--hrk-bordeaux); }
.hrk-btn--ghost:hover { background: var(--hrk-bordeaux-soft); }
.hrk-btn[disabled]  { opacity: .5; cursor: not-allowed; }
.hrk-field { display: block; margin-bottom: var(--hrk-space-4); }
.hrk-label { display: block; font-weight: var(--hrk-fw-medium); margin-bottom: var(--hrk-space-1); }
.hrk-input, .hrk-select {
  width: 100%; min-height: var(--hrk-tap-min); padding: var(--hrk-space-3);
  font: inherit; color: var(--hrk-text); background: var(--hrk-surface);
  border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-sm);
}
.hrk-input:focus, .hrk-select:focus { outline: none; border-color: var(--hrk-bordeaux); box-shadow: var(--hrk-focus-ring); }
.hrk-card {
  background: var(--hrk-surface); border: 1px solid var(--hrk-border);
  border-radius: var(--hrk-radius-lg); box-shadow: var(--hrk-shadow-card); padding: var(--hrk-space-5);
}
.hrk-card + .hrk-card { margin-top: var(--hrk-space-4); }
.hrk-state { display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3); padding: var(--hrk-space-7) var(--hrk-space-4); color: var(--hrk-text-muted); text-align: center; }
.hrk-state--mini { padding: var(--hrk-space-5) var(--hrk-space-4); }
.hrk-state__title { color: var(--hrk-text); font-weight: var(--hrk-fw-semibold); margin: 0; }
.hrk-state__icon  { font-size: 2rem; }
.hrk-spinner { width: 28px; height: 28px; border: 3px solid var(--hrk-border); border-top-color: var(--hrk-bordeaux); border-radius: 50%; animation: hrk-spin .8s linear infinite; }
@keyframes hrk-spin { to { transform: rotate(360deg); } }
.hrk-record-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--hrk-space-3); flex-wrap: wrap; }
.hrk-record-head__main { flex: 1 1 14rem; min-width: 0; }
.hrk-note { border-left: 4px solid var(--hrk-info); background: var(--hrk-info-bg); padding: var(--hrk-space-3) var(--hrk-space-4); border-radius: var(--hrk-radius-sm); }
.hrk-note--danger { border-left-color: var(--hrk-danger); background: var(--hrk-danger-bg); }

/* ── Tabelle ── */
.hrk-table { width: 100%; border-collapse: collapse; font-size: var(--hrk-fs-body); }
.hrk-table th {
  text-align: left; font-weight: var(--hrk-fw-semibold); color: var(--hrk-text-muted);
  background: var(--hrk-surface-muted); padding: var(--hrk-space-3); border-bottom: 1px solid var(--hrk-border);
}
.hrk-table td { padding: var(--hrk-space-2) var(--hrk-space-3); border-bottom: 1px solid var(--hrk-border); vertical-align: middle; }

/* ── Zeiterfassung spezifisch ── */
.ze-week-nav {
  display: flex; align-items: center; justify-content: space-between; gap: var(--hrk-space-3);
}
.ze-week-label { text-align: center; flex: 1; }

/* Spaltenbreiten */
.ze-col-day    { width: 80px; }
.ze-col-time   { width: 110px; }
.ze-col-pause  { width: 90px; }
.ze-col-net    { width: 80px; }
.ze-col-note   { /* flex */ }
.ze-col-action { width: 110px; }

/* Inputs kompakt in Tabelle */
.ze-input-time, .ze-input-small, .ze-input-note {
  min-height: var(--hrk-tap-min); padding: var(--hrk-space-2);
}
.ze-input-time  { width: 100%; max-width: 100px; }
.ze-input-small { width: 72px; text-align: center; }
.ze-input-note  { width: 100%; min-width: 120px; }

/* Heute-Hervorhebung */
.ze-row--today td { background: var(--hrk-bordeaux-soft); }

/* Farbcodierung Zeilen */
/* Stempeluhr-MVP (additiv): Pause unter L-GAV-Minimum — steht VOR warning/danger,
   damit extreme Netto-Zeiten (rot) die Markierung uebersteuern koennen. */
.ze-row--pause   td:first-child { border-left: 3px solid var(--hrk-warning); }
.ze-row--warning td:first-child { border-left: 3px solid var(--hrk-warning); }
.ze-row--danger  td:first-child { border-left: 3px solid var(--hrk-danger);  }

/* Hinweis unter dem Pause-Feld + Stempeluhr-Icon in der Tageszelle */
.ze-pause-hint { display: block; margin-top: var(--hrk-space-1);
  color: var(--hrk-warning); font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-medium);
  white-space: nowrap; }
.ze-src-clock { width: 14px; height: 14px; margin-left: var(--hrk-space-1);
  vertical-align: -2px; color: var(--hrk-text-muted); }

/* Netto-Wert Farbe */
.ze-net-cell { font-weight: var(--hrk-fw-semibold); font-variant-numeric: tabular-nums; }
.ze-net--warning { color: var(--hrk-warning); }
.ze-net--danger  { color: var(--hrk-danger);  }

/* Wochentag-Zelle */
.ze-day-cell { font-weight: var(--hrk-fw-semibold); }
.ze-weekday  { display: inline-block; min-width: 28px; }

/* Speichern-Button klein */
.ze-save-btn {
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-3);
  font-size: var(--hrk-fs-small);
}
.ze-action-cell { white-space: nowrap; }
.ze-row-error   { max-width: 100px; white-space: normal; }

/* Total-Zeile */
.ze-total-row td { font-weight: var(--hrk-fw-semibold); border-top: 2px solid var(--hrk-border-strong); border-bottom: none; }
.ze-total-cell { color: var(--hrk-bordeaux); font-variant-numeric: tabular-nums; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .hrk-page { padding: var(--hrk-space-5) var(--hrk-space-4); }
  .ze-week-nav { flex-direction: column; align-items: stretch; gap: var(--hrk-space-2); }
  .ze-week-label { text-align: left; }
}
@media (max-width: 600px) {
  :root, .hrk-root { --hrk-fs-h1: 1.625rem; }
  .hrk-page  { padding: var(--hrk-space-4) var(--hrk-space-3); }
  .hrk-card  { padding: var(--hrk-space-4); }
  .hrk-table { font-size: var(--hrk-fs-small); }
  .hrk-table th, .hrk-table td { padding: var(--hrk-space-1) var(--hrk-space-2); }
  .ze-input-time  { max-width: 80px; }
  .ze-input-note  { min-width: 80px; }
  .ze-input-small { width: 56px; }
}
</style>

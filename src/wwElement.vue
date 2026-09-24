<template>
  <div class="hrk-root">
    <main class="hrk-page hrk-page--wide">

      <!-- Header -->
      <div class="hrk-record-head" style="margin-bottom: var(--hrk-space-4)">
        <div class="hrk-record-head__main">
          <h1 class="hrk-h1" style="margin: 0">Zeiterfassung</h1>
          <p class="hrk-muted" style="margin: var(--hrk-space-1) 0 0">
            Trag die Stunden Tag für Tag ein und speichere jede Zeile.
          </p>
        </div>
        <a v-if="content && content.backUrl" class="hrk-btn hrk-btn--ghost" :href="content.backUrl"><svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="20" y1="12" x2="5" y2="12"/><polyline points="11,6 5,12 11,18"/></svg>Zurück</a>
      </div>

      <!-- Auth-Fehler -->
      <div v-if="authError" class="hrk-state" role="alert">
        <div class="hrk-state__icon" aria-hidden="true"><svg class="hrk-icon hrk-icon--lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
        <p class="hrk-state__title">Bitte neu anmelden</p>
        <p class="hrk-muted">Damit du Stunden erfassen kannst, meld dich bitte wieder an.</p>
      </div>

      <template v-else>
        <!-- Zusatzmodul-Hinweis: Bestand bleibt editierbar, nur neue Einträge gesperrt -->
        <div v-if="addonChecked && !addonAllowed" class="hrk-note hrk-note--warn ze-addon-note" role="status">
          <p class="ze-addon-title">Zeiterfassung ist ein Zusatzmodul</p>
          <p class="ze-addon-text">
            Dein Abo enthält die Zeiterfassung im Moment nicht. Bestehende Einträge kannst du
            weiterhin ansehen und anpassen. Für neue Einträge schaltest du das Modul im
            Abo-Bereich frei.
          </p>
          <a class="hrk-btn hrk-btn--primary ze-addon-cta" :href="aboUrl">Zum Abo</a>
        </div>

        <!-- K9 (Neukunden-Audit 24.08.2026): Wer gerade eingestempelt ist.
             Ein Stempel wird erst beim Ausstempeln zu einem Tageseintrag —
             bis dahin sah die Inhaberin nirgends, wer im Dienst ist. Diese
             Leiste liest die Stempel des heutigen Tages direkt (clock_events,
             RLS: nur der eigene Betrieb). -->
        <div v-if="imDienst.length" class="hrk-card ze-dienst" style="margin-bottom: var(--hrk-space-4)">
          <h2 class="hrk-h3 ze-dienst__title" style="margin-top:0">Gerade im Dienst</h2>
          <ul class="ze-dienst__list">
            <li v-for="d in imDienst" :key="d.employee_id" class="ze-dienst__row">
              <span class="ze-dienst__name">{{ d.name }}</span>
              <span class="hrk-badge" :class="d.status === 'break' ? 'hrk-badge--warning' : 'hrk-badge--success'">{{ d.status === 'break' ? 'in Pause' : 'eingestempelt' }}</span>
              <span class="hrk-muted hrk-small">seit {{ d.seit }}</span>
            </li>
          </ul>
          <p class="hrk-muted hrk-small">Die Stunden erscheinen unten in der Woche, sobald ausgestempelt wird.</p>
        </div>

        <!-- Mitarbeiter-Auswahl (nur wenn employeeId nicht per Prop gesetzt) -->
        <div v-if="!propEmployeeId" class="hrk-card" style="margin-bottom: var(--hrk-space-4)">
          <div class="hrk-field" style="margin-bottom: 0">
            <label class="hrk-label" for="ze-emp-select">Mitarbeitende Person</label>
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
          <button type="button" class="hrk-btn hrk-btn--secondary" @click="shiftWeek(-1)"><svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="20" y1="12" x2="5" y2="12"/><polyline points="11,6 5,12 11,18"/></svg>Vorwoche</button>
          <span class="ze-week-label hrk-h3" style="margin: 0">{{ weekLabel }}</span>
          <button type="button" class="hrk-btn hrk-btn--secondary" @click="shiftWeek(1)" :disabled="weekOffset >= 0">Nächste Woche<svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg></button>
        </div>

        <!-- Laden-Zustand -->
        <div v-if="loading" class="hrk-state">
          <div class="hrk-spinner" aria-hidden="true"></div>
          <p class="hrk-muted">Woche wird geladen …</p>
        </div>

        <!-- Kein Mitarbeiter gewählt -->
        <div v-else-if="!selectedEmployee" class="hrk-state hrk-state--mini">
          <p class="hrk-muted">Wähl oben eine mitarbeitende Person, um die Woche anzuzeigen.</p>
        </div>

        <!-- Wochentabelle -->
        <div v-else class="hrk-card" style="overflow-x: auto">
          <table class="hrk-table ze-table">
            <thead>
              <tr>
                <th class="ze-col-day">Tag</th>
                <th class="ze-col-time">Start</th>
                <th class="ze-col-time">Ende</th>
                <th class="ze-col-pause">Pause<br><span class="hrk-small" style="font-weight: 400">(Min.)</span></th>
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
                    @input="onDayEdit(day)" @change="onDayEdit(day)"
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
                    @input="onDayEdit(day)" @change="onDayEdit(day)"
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
                    @input="onDayEdit(day)" @change="onDayEdit(day)"
                    :aria-label="'Pause ' + day.weekday"
                  />
                  <!-- Hinweis: Pause unter dem Pausen-Minimum (Serverwert, generierte Spalte; Label je Branche) -->
                  <span v-if="day.breakCompliant === false" class="ze-pause-hint">
                    {{ pauseHintText(day) }}
                  </span>
                </td>

                <!-- Netto (live berechnet) -->
                <td class="ze-net-cell hrk-num" :class="netClass(day)">
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
                    @input="onDayEdit(day)" @change="onDayEdit(day)"
                    :aria-label="'Notiz ' + day.weekday"
                  />
                </td>

                <!-- Speichern -->
                <td v-if="!readonly" class="ze-action-cell">
                  <div v-if="day.error" class="ze-row-error hrk-small" style="color: var(--hrk-danger)" role="alert"><svg class="hrk-icon hrk-icon--sm ze-row-error__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="12,4 21,20 3,20"/><line x1="12" y1="10" x2="12" y2="14.5"/><line x1="12" y1="17" x2="12" y2="17"/></svg>{{ day.error }}</div>
                  <div v-else-if="day.hinweis" class="ze-row-error hrk-small" style="color: var(--hrk-warning)" role="status">{{ day.hinweis }}</div>
                  <!-- Pruefung 24.09. (K5): der Knopf bleibt neben Fehler/Hinweis stehen, sonst gab es nach einem Fehler keinen zweiten Versuch. -->
                  <button
                    type="button"
                    class="hrk-btn hrk-btn--secondary ze-save-btn"
                    :disabled="day.saving || !canSave(day)"
                    @click="saveDay(day)"
                    :aria-label="(day.saved ? 'Gespeichert, ' : 'Speichern ') + day.weekday"
                  >
                    <span v-if="day.saving">…</span>
                    <span v-else-if="day.saved" class="ze-saved" style="color: var(--hrk-success)"><svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5,12.5 10,17.5 19,7"/></svg><span class="ze-saved__text">Gespeichert</span></span>
                    <span v-else>Speichern</span>
                  </button>
                </td>
              </tr>
            </tbody>

            <!-- Wochentotal -->
            <tfoot>
              <tr class="ze-total-row">
                <td class="hrk-muted" :colspan="readonly ? 4 : 4">Wochentotal</td>
                <td class="ze-total-cell hrk-num">{{ weekTotal }}</td>
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

      // Zusatzmodul-Gate (has_addon_access): fail-open — bei Netzfehler kein
      // Banner, die RESTRICTIVE INSERT-Policy bleibt die echte Sperre.
      addonChecked: false,
      addonAllowed: true,

      // Branche des Betriebs — NUR fuer Anzeige-Texte (Label des Pausen-Minimums).
      // Leer/nicht ladbar = heutiges (Gastro-)Verhalten; verbindlich rechnet der Server.
      branche: '',

      // Mitarbeiter
      empLoading:       false,
      employees:        [],
      selectedEmployee: '',

      // K9: laufende Schichten (clock_events des heutigen Tages)
      imDienst: [],

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
      let url = (this.content && this.content.supabaseUrl) || 'https://ztvqsxdudzdyqgeylujr.supabase.co';
      if (/nemxnflngcfrpamkuesm/.test(String(url))) url = 'https://ztvqsxdudzdyqgeylujr.supabase.co';
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
    aboUrl() {
      return String((this.content && this.content.aboUrl) || '/abo');
    },
    // Nur wenn die Branche EXPLIZIT geladen und nicht 'gastro' ist, weicht ein
    // Anzeige-Text ab. Unbekannt/leer bleibt beim heutigen Gastro-Text.
    istNichtGastro() {
      const b = String(this.branche || '').trim().toLowerCase();
      return !!b && b !== 'gastro';
    },
    weekLabel() {
      // Waehrend des Ladens bzw. nach einem Ladefehler ist weekDays leer (K6) — das Label
      // kommt dann aus der leeren Woche, damit die Navigation lesbar bleibt.
      const tage = this.weekDays.length ? this.weekDays : this.buildEmptyWeek();
      const first = tage[0];
      const last  = tage[6];
      return `${first.label} – ${last.label} ${first.year}`;
    },
    weekTotal() {
      let total = 0;
      this.weekDays.forEach(d => {
        const min = this.calcNetMin(d);
        if (min !== null && min > 0) total += min;
      });
      return this.fmtMin(total) || '0 Std.';
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
    // user_id aus dem JWT (sub) — wie zeugnis-erstellen/onboarding-wizard, damit
    // Admins (RLS: sehen alle Betriebe) nicht versehentlich fremde Daten laden.
    userIdFromJwt(token) {
      try {
        const t = (token || '').replace(/^Bearer\s+/i, '');
        const part = t.split('.')[1];
        if (!part) return '';
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(decodeURIComponent(escape(atob(b64))));
        return json && json.sub ? json.sub : '';
      } catch (e) {
        return '';
      }
    },
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
      this.loadBranche();
      this.checkAddonAccess();
      if (this.propEmployeeId) {
        this.selectedEmployee = this.propEmployeeId;
        this.loadWeek();
        // Namen fuer die Dienst-Leiste brauchen die Liste ebenfalls.
        this.loadEmployees();
      } else {
        // S5-B12 (Vollaudit 23.09.2026): Links aus dem Compliance-Cockpit/Dashboard koennen
        // die Person per ?mitarbeiter=<uuid> mitgeben. Uebernommen wird sie nur, wenn sie in
        // der eigenen Mitarbeiterliste steht (RPC get_user_employees) und noch niemand
        // gewaehlt wurde; sonst bleibt die Auswahl leer wie bisher.
        const ausUrl = this.urlMitarbeiter();
        Promise.resolve(this.loadEmployees()).then(() => {
          if (ausUrl && !this.selectedEmployee && this.employees.some((e) => String(e.id) === ausUrl)) {
            this.selectedEmployee = ausUrl;
            this.loadWeek();
          }
        }).catch(() => { /* Vorauswahl ist Komfort */ });
      }
      this.loadImDienst();
    },

    // ── Branche (nur Anzeige-Texte) ──────────────────────────────
    // Liest company_profiles.branche. RLS ist `(auth.uid() = user_id) OR is_admin()` —
    // der alte Kommentar hier behauptete faelschlich "RLS = eigener Betrieb"; ein
    // Admin-Konto bekam ohne eigenen Filter eine beliebige der Betriebszeilen
    // (Mega-Audit 27.08.2026, SC8-7). Schlaegt der Fetch fehl oder ist die Branche
    // leer, bleibt still das heutige Gastro-Label stehen — reine Anzeige-Degradation.
    // Die verbindliche Pausen-Pruefung kommt vom Server (break_compliant /
    // required_break_minutes), hier wird nichts gerechnet.
    async loadBranche() {
      if (this.branche) return; // idempotent — init() laeuft auch bei Token-Wechsel
      try {
        const uid = this.userIdFromJwt(this.tokenRaw);
        const q = uid ? `user_id=eq.${encodeURIComponent(uid)}&` : '';
        const url = `${this.baseUrl}/rest/v1/company_profiles?${q}select=branche&limit=1`;
        const res = await this.authedFetch(url, { headers: { Accept: 'application/json' } });
        if (!res || !res.ok) return;
        const rows = await res.json().catch(() => []);
        const b = (Array.isArray(rows) && rows[0] && rows[0].branche) ? String(rows[0].branche).trim() : '';
        if (b) this.branche = b;
      } catch (e) { /* Anzeige-Degradation — kein Fehlerzustand */ }
    },

    // ── Zusatzmodul-Gate (has_addon_access) ──────────────────────
    // User-ID aus dem JWT-sub-Claim (kein zusaetzlicher Request). Defensiv:
    // jeder Fehler liefert '' und laesst das Gate fail-open.
    _jwtSub() {
      try {
        const t = this.tokenRaw;
        if (!t) return '';
        const seg = String(t).replace(/^Bearer\s+/i, '').split('.')[1];
        if (!seg) return '';
        const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
        const win = (typeof wwLib !== 'undefined' && wwLib.getFrontWindow) ? wwLib.getFrontWindow() : (typeof window !== 'undefined' ? window : null);
        const dec = (win && win.atob) ? win.atob(b64) : (typeof atob !== 'undefined' ? atob(b64) : '');
        if (!dec) return '';
        const payload = JSON.parse(dec);
        return String((payload && payload.sub) || '');
      } catch (e) { return ''; }
    },
    // Fragt den serverseitigen Gate-Entscheid ab (SECURITY DEFINER-RPC,
    // beruecksichtigt den Kill-Switch system/addon_enforcement selbst).
    // false = Banner + neue Eintraege gesperrt; Bestand bleibt editierbar.
    async checkAddonAccess() {
      const uid = this._jwtSub();
      if (!uid) { this.addonChecked = true; return; }
      try {
        const res = await this.authedFetch(`${this.baseUrl}/rest/v1/rpc/has_addon_access`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body:    JSON.stringify({ p_user_id: uid, p_addon_key: 'zeiterfassung' }),
        });
        if (res && res.ok) {
          const allowed = await res.json().catch(() => true);
          this.addonAllowed = allowed !== false;
          if (!this.addonAllowed) this.emit('addon-blocked', {});
        }
      } catch (e) { /* fail-open — Server-RLS bleibt massgeblich */ }
      finally { this.addonChecked = true; }
    },

    // ── Mitarbeiterliste ─────────────────────────────────────────
    async loadEmployees() {
      this.empLoading = true;
      try {
        // W26: employment_start mitladen — Stunden vor dem Eintritt bekommen einen Hinweis.
        const url = `${this.baseUrl}/rest/v1/rpc/get_user_employees?select=id,firstname,lastname,employment_start&order=lastname.asc`;
        const res = await this.authedFetch(url, { headers: { Accept: 'application/json' } });
        if (res.status === 401 || res.status === 403) { this.authError = true; return; }
        if (!res.ok) return;
        const rows = await res.json().catch(() => []);
        this.employees = Array.isArray(rows) ? rows : [];
        this.emit('loaded', { count: this.employees.length });
        // K9: Namen der Dienst-Leiste nachziehen, sobald die Liste da ist.
        if (this.imDienst.length) {
          this.imDienst = this.imDienst.map((d) => Object.assign({}, d, {
            name: this.empName(this.employees.find((e) => String(e.id) === d.employee_id)),
          }));
        }
      } catch (e) {
        /* Ladeliste optional — kein globalError */
      } finally {
        this.empLoading = false;
      }
    },
    empName(e) {
      return `${(e && e.firstname) || ''} ${(e && e.lastname) || ''}`.trim() || 'Mitarbeitende Person';
    },

    // ── K9: laufende Schichten aus clock_events ──────────────────
    /** Datum in Europe/Zurich als YYYY-MM-DD — derselbe Arbeitstag wie im Kiosk. */
    zurichDatum(d) {
      try {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d);
      } catch (e) {
        return new Date(d).toISOString().slice(0, 10);
      }
    },
    zurichUhrzeit(d) {
      try {
        return new Intl.DateTimeFormat('de-CH', {
          timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit',
        }).format(d);
      } catch (e) { return ''; }
    },
    async loadImDienst() {
      try {
        // Grosszuegiges Fenster, danach exakt auf den heutigen Zuercher Tag filtern
        // (gleiche Logik wie kiosk-clock-pin/currentStatus).
        const seit = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
        const url = `${this.baseUrl}/rest/v1/clock_events`
          + '?select=employee_id,event_type,event_time'
          + `&event_time=gte.${encodeURIComponent(seit)}`
          + '&order=event_time.asc';
        const res = await this.authedFetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const rows = await res.json().catch(() => []);
        if (!Array.isArray(rows)) return;
        const heute = this.zurichDatum(new Date());
        const proMa = {};
        rows.forEach((r) => {
          const t = new Date(r.event_time);
          if (this.zurichDatum(t) !== heute) return;
          const id = String(r.employee_id || '');
          if (!id) return;
          const zustand = { clock_in: 'in', break_start: 'break', break_end: 'in', clock_out: 'out' }[r.event_type];
          if (!zustand) return;
          proMa[id] = { status: zustand, seit: this.zurichUhrzeit(t) };
        });
        this.imDienst = Object.keys(proMa)
          .filter((id) => proMa[id].status === 'in' || proMa[id].status === 'break')
          .map((id) => ({
            employee_id: id,
            status: proMa[id].status,
            seit: proMa[id].seit,
            name: this.empName(this.employees.find((e) => String(e.id) === id)),
          }));
      } catch (e) {
        /* Anzeige ist Komfort — bei Fehler bleibt die Leiste einfach weg */
      }
    },
    // W26 (Neukunden-Audit 24.08.2026): Stunden vor dem Eintrittsdatum wurden
    // kommentarlos gespeichert. Wir blockieren nicht (Nacherfassung kann legitim
    // sein), sagen es aber.
    vorEintritt(datum) {
      const e = this.employees.find((x) => String(x.id) === String(this.selectedEmployee));
      const start = e && e.employment_start ? String(e.employment_start).slice(0, 10) : '';
      if (!start || !datum) return '';
      return String(datum).slice(0, 10) < start ? start : '';
    },
    onEmployeeChange() {
      this.loadWeek();
    },
    // Jede Eingabe in einer Zeile: Haekchen weg, alte Fehler-/Hinweiszeile weg (K5).
    onDayEdit(day) {
      day.saved = false;
      day.error = '';
      day.hinweis = '';
    },
    // Inhalt einer Zeile als Vergleichswert (W1).
    daySig(day) {
      return [day.start || '', day.end || '', Number(day.pause) || 0, day.note || ''].join('|');
    },
    // ?mitarbeiter=<uuid> aus der URL, nur im UUID-Format (sonst '').
    urlMitarbeiter() {
      try {
        const win = (typeof wwLib !== 'undefined' && wwLib.getFrontWindow) ? wwLib.getFrontWindow() : (typeof window !== 'undefined' ? window : null);
        const search = (win && win.location && win.location.search) || '';
        const m = String(search).match(/[?&]mitarbeiter=([^&#]*)/);
        const v = m ? decodeURIComponent(m[1]).trim().toLowerCase() : '';
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v) ? v : '';
      } catch (e) { return ''; }
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
          breakCompliant: null,  // false = Pause unter dem Pausen-Minimum (Serverwert)
          requiredBreak:  null,  // Mindestpause in Minuten (generierte Spalte)
          saving:  false,
          saved:   false,
          error:   '',
          hinweis: '',   // W26: Hinweis, wenn der Tag vor dem Eintritt liegt
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
      // Pruefung 24.09. (K6): jede Ladung bekommt eine Nummer; eine ueberholte Antwort
      // (schneller Personen- oder Wochenwechsel) wird verworfen. Die alte Woche wird
      // sofort entfernt: nach einem Ladefehler stuenden sonst die Eintraege von Person A
      // unter Person B, und Speichern haette sie per PATCH auf B umgeschrieben.
      const seq = (this._weekSeq || 0) + 1;
      this._weekSeq = seq;
      if (!this.selectedEmployee) { this.weekDays = this.buildEmptyWeek(); this.loading = false; return; }
      this.loading = true;
      this.globalError = '';
      this.weekDays = [];
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
        if (seq !== this._weekSeq) return;
        if (res.status === 401 || res.status === 403) { this.authError = true; return; }
        if (!res.ok) { this.globalError = 'Wochendaten konnten nicht geladen werden.'; return; }

        const entries = await res.json().catch(() => []);
        if (seq !== this._weekSeq) return;

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
            // S5-B11 (Vollaudit 23.09.2026): was schon in der Datenbank steht, zeigt das Haekchen.
            day.saved          = true;
          }
        });

        this.weekDays = days;
        this.emit('loaded', { count: Object.keys(byDate).length });
      } catch (e) {
        if (seq !== this._weekSeq) return;
        this.globalError = 'Netzwerkfehler beim Laden der Woche.';
        this.emit('error', { reason: 'network' });
      } finally {
        if (seq === this._weekSeq) this.loading = false;
      }
    },

    // ── Speichern ────────────────────────────────────────────────
    canSave(day) {
      // Speichern erlaubt wenn Start gesetzt — Server berechnet Netto.
      // Ohne Zusatzmodul sind NEUE Eintraege gesperrt (Bestand = PATCH bleibt frei).
      if (!day.entryId && !this.addonAllowed) return false;
      return !!day.start;
    },
    async saveDay(day) {
      if (!this.selectedEmployee) return;
      day.saving = true;
      day.saved  = false;
      day.error  = '';
      day.hinweis = '';
      // W26: Tag liegt vor dem Eintritt — speichern, aber sagen.
      const eintritt = this.vorEintritt(day.date);
      if (eintritt) {
        day.hinweis = `Dieser Tag liegt vor dem Eintritt am ${this.fmtDatum(eintritt)}. Wir speichern die Stunden trotzdem, prüf kurz, ob das so gewollt ist.`;
      }

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
      // Pruefung 24.09. (W1): Stand beim Senden merken. Wird waehrend des Requests weiter
      // getippt, darf der Erfolg kein «Gespeichert» zeigen — gespeichert ist nur, was gesendet wurde.
      const gesendet = this.daySig(day);

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

        if (res.status === 401) { this.authError = true; return; }
        if (res.status === 403) {
          // 403 beim ANLEGEN kann die Zusatzmodul-RLS sein — erst Gate re-checken,
          // damit kein irrefuehrendes «Bitte neu anmelden» erscheint.
          if (!day.entryId) {
            await this.checkAddonAccess();
            if (!this.addonAllowed) { this.emit('error', { reason: 'addon' }); return; }
          }
          this.authError = true;
          return;
        }
        if (!res.ok) {
          day.error = 'Speichern hat nicht geklappt. Bitte versuch es nochmal.';
          this.emit('error', { reason: 'save' });
          return;
        }

        const rows = await res.json().catch(() => []);
        const row  = Array.isArray(rows) ? rows[0] : rows;
        if (row) {
          day.entryId       = row.id || day.entryId;
          day.workedMinutes = row.worked_minutes || null;
        }
        // S5-B11: das Haekchen bleibt bis zur naechsten Aenderung (@input/@change setzen saved=false).
        // Frueher verschwand es nach 3 s, und man sah nicht mehr, welche Zeile gespeichert ist.
        // W1: nur, wenn die Zeile seit dem Senden unveraendert ist.
        day.saved = this.daySig(day) === gesendet;
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
    // Stundenformat (S5-B13, Vollaudit 23.09.2026, gleich in dienstplan und compliance-cockpit):
    // «7 Std. 45 Min.», «7 Std.», «45 Min.»; 0/leer = '' (Aufrufer setzen «0 Std.»).
    fmtMin(totalMin) {
      const t = Math.round(Number(totalMin) || 0);
      if (t <= 0) return '';
      const h = Math.floor(t / 60);
      const m = t % 60;
      if (h && m) return `${h} Std. ${m} Min.`;
      if (h) return `${h} Std.`;
      return `${m} Min.`;
    },
    formatNet(day) {
      const min = this.calcNetMin(day);
      if (min === null) return '—';
      return this.fmtMin(min) || '0 Std.';
    },
    netClass(day) {
      const min = this.calcNetMin(day);
      if (min === null || min <= 0) return '';
      const h = min / 60;
      if (h > 10) return 'ze-net--danger';
      if (h < 4)  return 'ze-net--warning';
      return '';
    },
    // Label des Pausen-Hinweises je Rechtsrahmen (datengetrieben):
    // Gastro und unbekannt/degradiert = der bisherige Text; andere Branchen =
    // neutrale Formulierung — dahinter steht kein L-GAV, und Rechtswerte werden
    // hier keine erfunden (Zahl kommt vom Server). Seit 24.09.2026 «Min.» mit
    // Punkt wie im Stundenformat («45 Min.»).
    pauseHintText(day) {
      const req = (day && day.requiredBreak != null) ? day.requiredBreak : '';
      if (this.istNichtGastro) return `unter dem Minimum (${req} Min.)`;
      return `unter Minimum (${req} Min.)`;
    },
    rowClass(day) {
      const classes = [];
      const min = this.calcNetMin(day);
      if (min !== null && min > 0) {
        const h = min / 60;
        if (h > 10)     classes.push('ze-row--danger');
        else if (h < 4) classes.push('ze-row--warning');
      }
      // Stempeluhr-MVP (additiv): Pause unter dem Pausen-Minimum markieren
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
  --hrk-creme: #F7F5F1;
  --hrk-anthrazit: #241F1C;
  --hrk-gold:            #C9A24B;
  --hrk-on-primary:      #FFFFFF;  /* Text/Icons auf primaer (Bordeaux) gefaerbten Flaechen */
  --hrk-surface:         #FFFFFF;
  --hrk-surface-muted: #F2EFEA;
  --hrk-border: #E2DDD5;
  --hrk-border-strong: #CFC8BD;
  --hrk-text: #241F1C;
  --hrk-text-muted:      #6B6357;
  --hrk-success: #2A7254; --hrk-success-bg: #E5F1EB;
  --hrk-warning: #946010; --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48; --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F; --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357; --hrk-neutral-bg: #EFEAE2;
  --hrk-font-head: "Archivo", "Inter", system-ui, sans-serif;
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-h1: 1.875rem;
  --hrk-fs-h2: 1.375rem;
  --hrk-fs-h3: 1.125rem;
  --hrk-fs-body: 1.0625rem;
  --hrk-fs-small: 0.9375rem;
  --hrk-lh-body: 1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;
  --hrk-radius-sm: 6px; --hrk-radius-md: 6px; --hrk-radius-lg: 10px;
  --hrk-radius-pill: 6px;
  --hrk-shadow-card: 0 1px 2px rgba(40,35,30,.05);
  --hrk-shadow-pop: 0 1px 2px rgba(40,35,30,.05);
  --hrk-focus-ring: 0 0 0 3px rgba(51,71,91,.35);
  --hrk-tap-min: 44px;
  --hrk-page-max: 880px;
  /* Design-Umsetzung 23.09.2026 (Phase 1): Schiefer, Schriften, zwei Radien, ein Schatten */
  --hrk-schiefer: #33475B;
  --hrk-schiefer-dark: #243444;
  --hrk-schiefer-soft: #EBEEF1;
  --hrk-on-dark: #FFFFFF;
  --hrk-on-dark-strong: rgba(255,255,255,.92);
  --hrk-on-dark-soft: rgba(255,255,255,.82);
  --hrk-on-dark-muted: rgba(255,255,255,.40);
  --hrk-on-dark-faint: rgba(255,255,255,.12);
  --hrk-overlay: rgba(20,24,28,.55);
  --hrk-font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --hrk-font-brand: "Fraunces", Georgia, serif;
  --hrk-fs-xs: 0.8125rem;
  --hrk-ls-caps: .06em;
  --hrk-radius-field: 6px;
  --hrk-radius-card: 10px;
  --hrk-shadow: 0 1px 2px rgba(40,35,30,.05);
  --hrk-page-wide: 1200px;
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
.hrk-page--wide { max-width: var(--hrk-page-wide); }
.hrk-h1 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h1); font-weight: var(--hrk-fw-semibold); line-height: 1.12; letter-spacing: -.02em; color: var(--hrk-text); margin: 0 0 var(--hrk-space-3); }
.hrk-h2 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h2); font-weight: var(--hrk-fw-semibold); color: var(--hrk-text); margin: var(--hrk-space-6) 0 var(--hrk-space-3); }
.hrk-h3 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h3); font-weight: var(--hrk-fw-semibold); margin: var(--hrk-space-5) 0 var(--hrk-space-2); }
.hrk-muted { color: var(--hrk-text-muted); }
.hrk-small { font-size: var(--hrk-fs-small); }
.hrk-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-5);
  font: inherit; font-weight: var(--hrk-fw-semibold);
  border-radius: var(--hrk-radius-field); border: 1px solid transparent;
  cursor: pointer; text-decoration: none; transition: background .15s, border-color .15s;
}
.hrk-btn:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.hrk-btn--primary   { background: var(--hrk-bordeaux); color: var(--hrk-on-primary); }
.hrk-btn--primary:hover { background: var(--hrk-bordeaux-dark); }
.hrk-btn--secondary { background: var(--hrk-surface); color: var(--hrk-schiefer); border-color: var(--hrk-border-strong); }
.hrk-btn--secondary:hover { background: var(--hrk-schiefer-soft); }
.hrk-btn--ghost     { background: transparent; color: var(--hrk-schiefer); }
.hrk-btn--ghost:hover { background: var(--hrk-schiefer-soft); }
.hrk-btn[disabled]  { opacity: .5; cursor: not-allowed; }
.hrk-field { display: block; margin-bottom: var(--hrk-space-4); }
.hrk-label { display: block; font-weight: var(--hrk-fw-medium); margin-bottom: var(--hrk-space-1); }
.hrk-input, .hrk-select {
  width: 100%; min-height: var(--hrk-tap-min); padding: var(--hrk-space-3);
  font: inherit; color: var(--hrk-text); background: var(--hrk-surface);
  border: 1px solid var(--hrk-border-strong); border-radius: var(--hrk-radius-field);
}
.hrk-input:focus, .hrk-select:focus { outline: none; border-color: var(--hrk-schiefer); box-shadow: var(--hrk-focus-ring); }
.hrk-card {
  background: var(--hrk-surface); border: 1px solid var(--hrk-border);
  border-radius: var(--hrk-radius-card); box-shadow: var(--hrk-shadow); padding: var(--hrk-space-5);
}
.hrk-card + .hrk-card { margin-top: var(--hrk-space-4); }
.hrk-state { display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3); padding: var(--hrk-space-7) var(--hrk-space-4); color: var(--hrk-text-muted); text-align: center; }
.hrk-state--mini { padding: var(--hrk-space-5) var(--hrk-space-4); }
.hrk-state__title { color: var(--hrk-text); font-weight: var(--hrk-fw-semibold); margin: 0; }
.hrk-state__icon  { display: inline-flex; color: var(--hrk-text-muted); }
.hrk-spinner { width: 28px; height: 28px; border: 3px solid var(--hrk-border); border-top-color: var(--hrk-schiefer); border-radius: 50%; animation: hrk-spin .8s linear infinite; }
@keyframes hrk-spin { to { transform: rotate(360deg); } }
.hrk-record-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--hrk-space-3); flex-wrap: wrap; }
.hrk-record-head__main { flex: 1 1 14rem; min-width: 0; }
.hrk-note { border-left: 3px solid var(--hrk-info); background: var(--hrk-info-bg); padding: var(--hrk-space-3) var(--hrk-space-4); border-radius: 0 var(--hrk-radius-field) var(--hrk-radius-field) 0; }
.hrk-note--danger { border-left-color: var(--hrk-danger); background: var(--hrk-danger-bg); }
.hrk-note--warn   { border-left-color: var(--hrk-warning); background: var(--hrk-warning-bg); }
/* Status-Badges: Farbpunkt + Wort (aus design-tokens.css; fehlte hier, das Template nutzt sie) */
.hrk-badge { display: inline-flex; align-items: center; gap: var(--hrk-space-2);
  padding: 0; border-radius: 0; background: none;
  font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-semibold); line-height: 1.6; white-space: nowrap; }
.hrk-badge::before { content: ""; flex: none; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.hrk-badge--success { color: var(--hrk-success); }
.hrk-badge--warning { color: var(--hrk-warning); }
/* Zahlen in Kolonnen (Stunden) */
.hrk-num { font-family: var(--hrk-font-mono); font-variant-numeric: tabular-nums; }
/* Icons (Inline-SVG, Katalog ICONS.md) */
.hrk-icon { width: var(--hrk-icon-size-md, 20px); height: var(--hrk-icon-size-md, 20px); flex: none; }
.hrk-icon--sm { width: var(--hrk-icon-size-sm, 16px); height: var(--hrk-icon-size-sm, 16px); }
.hrk-icon--lg { width: var(--hrk-icon-size-lg, 28px); height: var(--hrk-icon-size-lg, 28px); }

/* Zusatzmodul-Hinweis */
.ze-addon-note  { margin-bottom: var(--hrk-space-4); }
.ze-addon-title { margin: 0 0 var(--hrk-space-1); font-weight: var(--hrk-fw-semibold); }
.ze-addon-text  { margin: 0; }
.ze-addon-cta   { margin-top: var(--hrk-space-3); }

/* ── Tabelle ── */
.hrk-table { width: 100%; border-collapse: collapse; font-size: var(--hrk-fs-body); }
.hrk-table th {
  text-align: left; font-family: var(--hrk-font-head); font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-semibold);
  text-transform: uppercase; letter-spacing: var(--hrk-ls-caps); color: var(--hrk-schiefer);
  background: var(--hrk-surface-muted); padding: var(--hrk-space-3); border-bottom: 1px solid var(--hrk-border-strong);
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
.ze-row--today td { background: var(--hrk-schiefer-soft); }

/* Farbcodierung Zeilen */
/* Stempeluhr-MVP (additiv): Pause unter dem Pausen-Minimum — steht VOR warning/danger,
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
.ze-row-error__icon { display: inline-block; vertical-align: -3px; margin-right: var(--hrk-space-1); }
.ze-saved { display: inline-flex; align-items: center; gap: var(--hrk-space-1); }

/* Total-Zeile */
.ze-total-row td { font-weight: var(--hrk-fw-semibold); border-top: 2px solid var(--hrk-border-strong); border-bottom: none; }
.ze-total-cell { color: var(--hrk-schiefer); font-variant-numeric: tabular-nums; }

/* ── K9: Leiste «Gerade im Dienst» ── */
.ze-dienst__title { margin-bottom: var(--hrk-space-2); }
.ze-dienst__list  { list-style: none; margin: 0 0 var(--hrk-space-2); padding: 0; }
.ze-dienst__row   { display: flex; align-items: center; gap: var(--hrk-space-2); padding: var(--hrk-space-1) 0; flex-wrap: wrap; }
.ze-dienst__name  { font-weight: var(--hrk-fw-semibold); }

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
  /* Tabellen bleiben 17px lesbar; nur der Innenabstand wird enger (Phase 1) */
  .hrk-table th, .hrk-table td { padding: var(--hrk-space-1) var(--hrk-space-2); }
  .ze-input-time  { max-width: 80px; }
  .ze-input-note  { min-width: 80px; }
  .ze-input-small { width: 56px; }
}
/* S5-B11/S5-B02-Teil (Vollaudit 23.09.2026): Unter 768px ist die Wochentabelle breiter als der
   Bildschirm. Die Speichern-Spalte klebt darum am rechten Rand der Tabelle: Speichern und das
   Haekchen sind ohne seitliches Wischen erreichbar. (Tag-Karten statt Tabelle = Projekt G3.) */
@media (max-width: 768px) {
  .ze-table .ze-col-action,
  .ze-table .ze-action-cell {
    position: sticky; right: 0; z-index: 1;
    background: var(--hrk-surface);
    box-shadow: -1px 0 0 var(--hrk-border);
  }
  .ze-table thead .ze-col-action { background: var(--hrk-surface-muted); }
  .ze-row--today .ze-action-cell { background: var(--hrk-schiefer-soft); }
  .ze-table .ze-save-btn { padding: 0 var(--hrk-space-2); }
}
/* Am Handy nur das Haekchen zeigen (schmale Klebespalte); «Gespeichert» bleibt fuer
   Screenreader im Text und im aria-label des Knopfs. */
@media (max-width: 600px) {
  .ze-saved__text {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
  .ze-table .ze-save-btn { min-width: var(--hrk-tap-min); }
}
</style>

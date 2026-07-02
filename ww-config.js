export default {
  editor: {
    label: { en: 'Time Tracking (Week View)', de: 'Zeiterfassung (Wochenansicht)' },
    icon: 'clock',
  },
  triggerEvents: [
    { name: 'loaded',  label: { en: 'On loaded',       de: 'Geladen'           }, event: { count: 0 } },
    { name: 'saved',   label: { en: 'On entry saved',  de: 'Eintrag gespeichert' }, event: { date: '', worked_minutes: 0 } },
    { name: 'error',   label: { en: 'On error',        de: 'Fehler'            }, event: { reason: '' } },
  ],
  properties: {
    authToken: {
      label: { en: 'Auth token (JWT)', de: 'Login-Token (JWT)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Access Token des eingeloggten Users. An die Supabase-Auth-Variable binden.' },
      /* wwEditor:end */
    },
    apiKey: {
      label: { en: 'Anon / Publishable key', de: 'Anon-/Publishable-Key' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'sb_publishable_4rsRb_VB3l_45JO7sw0VSA_ODDS4CZc',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Öffentlicher Anon-/Publishable-Key. NIE der service_role-Key.' },
      /* wwEditor:end */
    },
    supabaseUrl: {
      label: { en: 'Supabase URL', de: 'Supabase-URL' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'https://ztvqsxdudzdyqgeylujr.supabase.co',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Projekt-URL. Default ist das Imploya-Projekt (Zürich).' },
      /* wwEditor:end */
    },
    employeeId: {
      label: { en: 'Preselect employee (UUID)', de: 'Mitarbeiter vorwählen (UUID)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Optional. UUID des vorgewählten Mitarbeiters. Leer → Auswahl im Widget.' },
      /* wwEditor:end */
    },
    weekOffset: {
      label: { en: 'Week offset (0 = current)', de: 'Wochenversatz (0 = aktuell)' },
      type: 'Number',
      section: 'settings',
      bindable: true,
      defaultValue: 0,
      /* wwEditor:start */
      bindingValidation: { type: 'number', tooltip: '0 = aktuelle Woche, -1 = letzte Woche, etc. Wird intern durch Navigation überschrieben.' },
      /* wwEditor:end */
    },
    readonly: {
      label: { en: 'Read only', de: 'Nur lesen' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: false,
    },
    backUrl: {
      label: { en: 'Back link', de: 'Zurück-Link' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Optionaler «Zurück»-Link. Leer → kein Button.' },
      /* wwEditor:end */
    },
  },
};

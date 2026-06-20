export default {
  editor: {
    label: { en: 'Time Tracking', de: 'Zeiterfassung' },
    icon: 'clock',
  },
  triggerEvents: [
    { name: 'loaded', label: { en: 'On loaded', de: 'Geladen' }, event: { count: 0 } },
    { name: 'saved', label: { en: 'On entry saved', de: 'Eintrag gespeichert' }, event: { worked_minutes: 0, break_compliant: true } },
    { name: 'error', label: { en: 'On error', de: 'Fehler' }, event: { reason: '' } },
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
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Oeffentlicher Anon-/Publishable-Key. NIE der service_role-Key.' },
      /* wwEditor:end */
    },
    supabaseUrl: {
      label: { en: 'Supabase URL', de: 'Supabase-URL' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'https://ztvqsxdudzdyqgeylujr.supabase.co',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Projekt-URL. Default ist das HRklar-Projekt.' },
      /* wwEditor:end */
    },
    employeeId: {
      label: { en: 'Preselect employee (UUID)', de: 'Mitarbeiter vorwaehlen (UUID)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Optional. UUID des vorgewaehlten Mitarbeiters. Leer → Auswahl im Tool.' },
      /* wwEditor:end */
    },
    companyProfileId: {
      label: { en: 'Company profile (UUID)', de: 'Betriebsprofil (UUID)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Optional. UUID des Betriebsprofils, wird beim Speichern mitgegeben.' },
      /* wwEditor:end */
    },
    backUrl: {
      label: { en: 'Back link', de: 'Zurueck-Link' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Optionaler «Zurueck»-Link (z. B. /meine-dokumente). Leer → kein Button.' },
      /* wwEditor:end */
    },
  },
};

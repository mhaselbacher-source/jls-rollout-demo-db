const SCREEN_TYPES = new Set(["QM55", "OM55", "OM75", "QM75"]);
const HALTERUNG_TYPES = new Set(["SIP", "DEP", "SIHL", "LSM1U"]);
const CMS_STATUS = new Set(["offen", "erstellt", "geprueft"]);
const MATERIAL_STATUS = new Set(["komplett", "offen", "spezialteil offen"]);
const PROZESS_STATUS = new Set(["offen", "in_bearbeitung", "bereit", "blockiert", "montiert"]);

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-demo-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (request.method !== "POST") {
      throw new ApiError("Nur POST ist erlaubt.", 405);
    }

    const expectedSecret = String(Deno.env.get("DEMO_WRITE_SECRET") || "").trim();
    const providedSecret = String(request.headers.get("x-demo-secret") || "").trim();
    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new ApiError("Cloud-Schreibmodus nicht autorisiert.", 401);
    }

    const body = await request.json();
    const action = String(body.action || "create");
    const payload = normalizePayload(body.payload || {}, action === "update" ? body.standort_id : undefined);
    const result = await saveStandort(payload, action === "update");

    return jsonResponse(result);
  } catch (error) {
    console.error(error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : "Unerwarteter Fehler in der Cloud-Funktion.";
    return jsonResponse({ error: message }, status);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function optionalText(payload: Record<string, unknown>, key: string): string | null {
  const value = cleanText(payload[key]);
  return value || null;
}

function requiredText(payload: Record<string, unknown>, key: string, label: string): string {
  const value = cleanText(payload[key]);
  if (!value) {
    throw new ApiError(label + " ist ein Pflichtfeld.");
  }
  return value;
}

function parseBool(payload: Record<string, unknown>, key: string, label: string, defaultValue = false): boolean {
  const value = payload[key];
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && (value === 0 || value === 1)) {
    return Boolean(value);
  }

  const normalized = cleanText(value).toLowerCase();
  const mapping: Record<string, boolean> = {
    "1": true,
    "0": false,
    ja: true,
    nein: false,
    yes: true,
    no: false,
    true: true,
    false: false,
    x: true
  };

  if (!(normalized in mapping)) {
    throw new ApiError(label + " muss Ja oder Nein sein.");
  }

  return mapping[normalized];
}

function parseIntValue(
  payload: Record<string, unknown>,
  key: string,
  label: string,
  defaultValue: number | null,
  minimum?: number,
  allowed?: Set<number>
): number | null {
  const rawValue = payload[key];
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value)) {
    throw new ApiError(label + " muss eine Zahl sein.");
  }
  if (minimum != null && value < minimum) {
    throw new ApiError(label + " muss mindestens " + minimum + " sein.");
  }
  if (allowed && !allowed.has(value)) {
    throw new ApiError(label + " hat einen ungueltigen Wert.");
  }
  return value;
}

function parseChoice(
  payload: Record<string, unknown>,
  key: string,
  label: string,
  allowed: Set<string>,
  defaultValue?: string
): string {
  const value = cleanText(payload[key] ?? defaultValue);
  if (!value) {
    throw new ApiError(label + " ist ein Pflichtfeld.");
  }
  if (!allowed.has(value)) {
    throw new ApiError(label + " hat einen ungueltigen Wert: " + value);
  }
  return value;
}

function parseDate(payload: Record<string, unknown>, key: string, label: string): string | null {
  const value = cleanText(payload[key]);
  if (!value) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(label + " muss im Format YYYY-MM-DD sein.");
  }
  return value;
}

function normalizePayload(payload: Record<string, unknown>, standortIdOverride?: unknown) {
  const standortId = requiredText(payload, "standort_id", "Standort-ID");
  if (standortIdOverride && standortId !== String(standortIdOverride)) {
    throw new ApiError("Standort-ID darf beim Bearbeiten nicht geaendert werden.");
  }

  return {
    standort_id: standortId,
    filiale_name: requiredText(payload, "filiale_name", "Filiale"),
    strasse: optionalText(payload, "strasse"),
    plz: optionalText(payload, "plz"),
    ort: requiredText(payload, "ort", "Ort"),
    kanton: optionalText(payload, "kanton"),
    kontaktperson: optionalText(payload, "kontaktperson"),
    telefon: optionalText(payload, "telefon"),
    anmeldung_noetig: parseBool(payload, "anmeldung_noetig", "Anmeldung noetig"),
    anmeldung_hinweis: optionalText(payload, "anmeldung_hinweis"),
    montagefenster: optionalText(payload, "montagefenster"),
    parkplatz_hinweis: optionalText(payload, "parkplatz_hinweis"),
    rollout_typ: requiredText(payload, "rollout_typ", "Rollout-Typ"),
    screen_typ: parseChoice(payload, "screen_typ", "Screen", SCREEN_TYPES),
    halterung_typ: parseChoice(payload, "halterung_typ", "Halterung", HALTERUNG_TYPES),
    ip_power: parseBool(payload, "ip_power", "IP Power"),
    player_typ: parseIntValue(payload, "player_typ", "Player", 1, 1, new Set([1, 2, 3])) ?? 1,
    hohldecke: parseBool(payload, "hohldecke", "Hohldecke"),
    anzahl_personen: parseIntValue(payload, "anzahl_personen", "Anzahl Personen", 1, 1) ?? 1,
    zeitbedarf_min: parseIntValue(payload, "zeitbedarf_min", "Zeitbedarf", 90, 30) ?? 90,
    cms_status: parseChoice(payload, "cms_status", "CMS-Status", CMS_STATUS, "offen"),
    material_status: parseChoice(payload, "material_status", "Materialstatus", MATERIAL_STATUS, "offen"),
    prozess_status: parseChoice(payload, "prozess_status", "Prozessstatus", PROZESS_STATUS, "offen"),
    installationsdatum: parseDate(payload, "installationsdatum", "Installationsdatum"),
    cluster: optionalText(payload, "cluster"),
    team: optionalText(payload, "team"),
    bemerkung: optionalText(payload, "bemerkung")
  };
}

function dueDate(installationsdatum: string | null, daysBefore: number): string | null {
  if (!installationsdatum) {
    return null;
  }
  const base = new Date(installationsdatum + "T00:00:00Z");
  base.setUTCDate(base.getUTCDate() - daysBefore);
  return base.toISOString().slice(0, 10);
}

function defaultBestellstatus(materialStatus: string): string {
  return materialStatus === "komplett" ? "kommissioniert" : "offen";
}

function buildDesiredMaterial(payload: ReturnType<typeof normalizePayload>) {
  const items = [
    { artikel_typ: "Screen", artikel_code: payload.screen_typ, menge: 1, hinweis: "Hauptscreen" },
    { artikel_typ: "Halterung", artikel_code: payload.halterung_typ, menge: 1, hinweis: "Passend zu " + payload.screen_typ },
    { artikel_typ: "Player", artikel_code: "PLAYER-" + payload.player_typ, menge: 1, hinweis: "Player gemaess Rollout" }
  ];

  if (payload.ip_power) {
    items.splice(2, 0, {
      artikel_typ: "IP Power",
      artikel_code: "IP-POWER",
      menge: 1,
      hinweis: "Zusaetzliche Komponente"
    });
  }

  return items;
}

function buildManagedTasks(payload: ReturnType<typeof normalizePayload>) {
  const tasks = [];

  if (payload.material_status !== "komplett") {
    tasks.push({
      task_typ: "Bestellung",
      titel: "Materialbedarf pruefen und bestellen",
      status: payload.material_status === "spezialteil offen" ? "blockiert" : "offen",
      prioritaet: "hoch",
      owner_rolle: "Einkauf",
      faellig_am: dueDate(payload.installationsdatum, 7),
      hinweis: "Materialstatus aus Bemusterung: " + payload.material_status
    });
  }

  if (payload.cms_status !== "geprueft") {
    tasks.push({
      task_typ: "Konfig",
      titel: "CMS- und Player-Konfiguration abschliessen",
      status: "offen",
      prioritaet: "hoch",
      owner_rolle: "Konfig",
      faellig_am: dueDate(payload.installationsdatum, 3),
      hinweis: "CMS-Status aus Bemusterung: " + payload.cms_status
    });
  }

  const prepNotes: string[] = [];
  if (payload.anmeldung_noetig) {
    prepNotes.push(payload.anmeldung_hinweis || "Anmeldung erforderlich");
  }
  if (payload.hohldecke) {
    prepNotes.push("Hohldecke beachten");
  }
  if (payload.montagefenster) {
    prepNotes.push("Fenster: " + payload.montagefenster);
  }
  if (payload.bemerkung) {
    prepNotes.push(payload.bemerkung);
  }

  if (prepNotes.length) {
    tasks.push({
      task_typ: "Montagevorbereitung",
      titel: "Montagefenster und Sonderpunkte absichern",
      status: "offen",
      prioritaet: "mittel",
      owner_rolle: "Montageplanung",
      faellig_am: dueDate(payload.installationsdatum, 2),
      hinweis: prepNotes.join(" | ")
    });
  }

  return tasks;
}

async function saveStandort(payload: ReturnType<typeof normalizePayload>, allowExisting: boolean) {
  const existingStandorte = await restGet("standorte", "select=standort_id&standort_id=eq." + encodeValue(payload.standort_id));
  const existingRollouts = await restGet("rollouts", "select=rollout_id,standort_id&standort_id=eq." + encodeValue(payload.standort_id));
  const existingStandort = existingStandorte[0];
  const existingRollout = existingRollouts[0];

  if (existingStandort && !allowExisting) {
    throw new ApiError("Standort-ID existiert bereits. Bitte Bearbeiten verwenden.", 409);
  }
  if (allowExisting && !existingStandort) {
    throw new ApiError("Standort wurde nicht gefunden.", 404);
  }

  if (existingStandort) {
    await restPatch("standorte", "standort_id=eq." + encodeValue(payload.standort_id), {
      filiale_name: payload.filiale_name,
      strasse: payload.strasse,
      plz: payload.plz,
      ort: payload.ort,
      kanton: payload.kanton,
      kontaktperson: payload.kontaktperson,
      telefon: payload.telefon,
      anmeldung_noetig: payload.anmeldung_noetig,
      anmeldung_hinweis: payload.anmeldung_hinweis,
      montagefenster: payload.montagefenster,
      parkplatz_hinweis: payload.parkplatz_hinweis
    });
  } else {
    await restPost("standorte", {
      standort_id: payload.standort_id,
      filiale_name: payload.filiale_name,
      strasse: payload.strasse,
      plz: payload.plz,
      ort: payload.ort,
      kanton: payload.kanton,
      kontaktperson: payload.kontaktperson,
      telefon: payload.telefon,
      anmeldung_noetig: payload.anmeldung_noetig,
      anmeldung_hinweis: payload.anmeldung_hinweis,
      montagefenster: payload.montagefenster,
      parkplatz_hinweis: payload.parkplatz_hinweis
    });
  }

  let rolloutId = existingRollout?.rollout_id;
  if (rolloutId) {
    await restPatch("rollouts", "rollout_id=eq." + encodeValue(rolloutId), {
      rollout_typ: payload.rollout_typ,
      screen_typ: payload.screen_typ,
      halterung_typ: payload.halterung_typ,
      ip_power: payload.ip_power,
      player_typ: payload.player_typ,
      hohldecke: payload.hohldecke,
      anzahl_personen: payload.anzahl_personen,
      zeitbedarf_min: payload.zeitbedarf_min,
      cms_status: payload.cms_status,
      material_status: payload.material_status,
      prozess_status: payload.prozess_status,
      installationsdatum: payload.installationsdatum,
      cluster: payload.cluster,
      team: payload.team,
      bemerkung: payload.bemerkung
    });
  } else {
    rolloutId = await nextPrefixedId("rollouts", "rollout_id", "RO-");
    await restPost("rollouts", {
      rollout_id: rolloutId,
      standort_id: payload.standort_id,
      rollout_typ: payload.rollout_typ,
      screen_typ: payload.screen_typ,
      halterung_typ: payload.halterung_typ,
      ip_power: payload.ip_power,
      player_typ: payload.player_typ,
      hohldecke: payload.hohldecke,
      anzahl_personen: payload.anzahl_personen,
      zeitbedarf_min: payload.zeitbedarf_min,
      cms_status: payload.cms_status,
      material_status: payload.material_status,
      prozess_status: payload.prozess_status,
      installationsdatum: payload.installationsdatum,
      cluster: payload.cluster,
      team: payload.team,
      bemerkung: payload.bemerkung
    });
  }

  await syncMaterialbedarf(rolloutId, payload);
  await syncManagedTasks(rolloutId, payload);

  return {
    standort_id: payload.standort_id,
    rollout_id: rolloutId,
    action: existingStandort ? "updated" : "created"
  };
}

async function syncMaterialbedarf(rolloutId: string, payload: ReturnType<typeof normalizePayload>) {
  const rows = await restGet(
    "materialbedarf",
    "select=materialbedarf_id,artikel_typ,artikel_code,menge,bestellstatus,pso_nummer,auftragsnummer,hinweis&rollout_id=eq." + encodeValue(rolloutId)
  );
  const existing = new Map(rows.filter((row: Record<string, unknown>) => ["Screen", "Halterung", "IP Power", "Player"].includes(String(row.artikel_typ))).map((row: Record<string, unknown>) => [String(row.artikel_typ), row]));
  const desired = new Map(buildDesiredMaterial(payload).map((item) => [item.artikel_typ, item]));

  let psoNummer = "";
  let auftragsnummer = "";
  for (const row of existing.values()) {
    if (!psoNummer && cleanText(row.pso_nummer)) {
      psoNummer = cleanText(row.pso_nummer);
    }
    if (!auftragsnummer && cleanText(row.auftragsnummer)) {
      auftragsnummer = cleanText(row.auftragsnummer);
    }
  }
  if (!psoNummer || !auftragsnummer) {
    const bundle = await nextOrderBundle();
    psoNummer = bundle.pso_nummer;
    auftragsnummer = bundle.auftragsnummer;
  }

  for (const [artikelTyp, item] of desired.entries()) {
    const row = existing.get(artikelTyp) as Record<string, unknown> | undefined;
    if (row) {
      await restPatch("materialbedarf", "materialbedarf_id=eq." + encodeValue(String(row.materialbedarf_id)), {
        artikel_code: item.artikel_code,
        menge: item.menge,
        hinweis: item.hinweis
      });
    } else {
      await restPost("materialbedarf", {
        materialbedarf_id: await nextPrefixedId("materialbedarf", "materialbedarf_id", "MAT-"),
        rollout_id: rolloutId,
        artikel_typ: artikelTyp,
        artikel_code: item.artikel_code,
        menge: item.menge,
        bestellstatus: defaultBestellstatus(payload.material_status),
        pso_nummer: psoNummer,
        auftragsnummer,
        hinweis: item.hinweis
      });
    }
  }

  for (const [artikelTyp, row] of existing.entries()) {
    if (!desired.has(artikelTyp)) {
      await restDelete("materialbedarf", "materialbedarf_id=eq." + encodeValue(String((row as Record<string, unknown>).materialbedarf_id)));
    }
  }
}

async function syncManagedTasks(rolloutId: string, payload: ReturnType<typeof normalizePayload>) {
  const rows = await restGet(
    "tasks",
    "select=task_id,task_typ&rollout_id=eq." + encodeValue(rolloutId) + "&quelle=eq." + encodeValue("Bemusterungsformular")
  );
  const existing = new Map(rows.map((row: Record<string, unknown>) => [String(row.task_typ), row]));
  const desired = new Map(buildManagedTasks(payload).map((item) => [item.task_typ, item]));

  for (const [taskTyp, task] of desired.entries()) {
    const row = existing.get(taskTyp) as Record<string, unknown> | undefined;
    if (row) {
      await restPatch("tasks", "task_id=eq." + encodeValue(String(row.task_id)), {
        titel: task.titel,
        status: task.status,
        prioritaet: task.prioritaet,
        owner_rolle: task.owner_rolle,
        faellig_am: task.faellig_am,
        hinweis: task.hinweis
      });
    } else {
      await restPost("tasks", {
        task_id: await nextPrefixedId("tasks", "task_id", "TASK-"),
        rollout_id: rolloutId,
        task_typ: taskTyp,
        titel: task.titel,
        status: task.status,
        prioritaet: task.prioritaet,
        owner_rolle: task.owner_rolle,
        faellig_am: task.faellig_am,
        quelle: "Bemusterungsformular",
        hinweis: task.hinweis
      });
    }
  }

  for (const [taskTyp, row] of existing.entries()) {
    if (!desired.has(taskTyp)) {
      await restDelete("tasks", "task_id=eq." + encodeValue(String((row as Record<string, unknown>).task_id)));
    }
  }
}

async function nextPrefixedId(table: string, column: string, prefix: string): Promise<string> {
  const rows = await restGet(table, "select=" + column);
  let maxValue = 0;
  for (const row of rows) {
    const raw = cleanText(row[column]).replace(prefix, "");
    if (/^\d+$/.test(raw)) {
      maxValue = Math.max(maxValue, Number(raw));
    }
  }
  return prefix + String(maxValue + 1).padStart(3, "0");
}

async function nextOrderBundle(): Promise<{ pso_nummer: string; auftragsnummer: string }> {
  const rows = await restGet("materialbedarf", "select=auftragsnummer");
  let maxOrder = 10155;
  for (const row of rows) {
    const raw = cleanText(row.auftragsnummer);
    if (/^\d+$/.test(raw)) {
      maxOrder = Math.max(maxOrder, Number(raw));
    }
  }
  const nextOrder = maxOrder + 1;
  const psoSuffix = Math.max(nextOrder - 10100, 1);
  return {
    pso_nummer: "PSO.140.101." + String(psoSuffix).padStart(3, "0"),
    auftragsnummer: String(nextOrder)
  };
}

async function restGet(table: string, query: string): Promise<Array<Record<string, unknown>>> {
  return await restRequest("GET", table + "?" + query);
}

async function restPost(table: string, payload: Record<string, unknown>) {
  await restRequest("POST", table, payload);
}

async function restPatch(table: string, query: string, payload: Record<string, unknown>) {
  await restRequest("PATCH", table + "?" + query, payload);
}

async function restDelete(table: string, query: string) {
  await restRequest("DELETE", table + "?" + query);
}

async function restRequest(method: string, path: string, payload?: Record<string, unknown>) {
  const baseUrl = String(Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (!baseUrl || !serviceKey) {
    throw new ApiError("Supabase-Service-Konfiguration fehlt.", 500);
  }

  const response = await fetch(baseUrl + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError("Supabase-Request fehlgeschlagen: " + text, response.status);
  }

  if (response.status === 204) {
    return [];
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function encodeValue(value: string): string {
  return encodeURIComponent(value);
}

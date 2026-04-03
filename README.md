# Demo-DB mit UI

Diese Demo besteht aus zwei Teilen:

- `local/` fuer die lokale SQLite-Demo
- `supabase/01_schema_and_seed.sql`
- `app/` als statische HTML-App fuer GitHub Pages

---

## Ziel

Die Demo soll zwei Dinge zugleich leisten:

1. zuerst lokal im Ordner `db-demo` als echte kleine Datenbank laufen
2. spaeter dieselbe Struktur nach `Supabase` migrieren koennen
3. eine einfache Web-UI liefern, die lokal und spaeter auch auf GitHub Pages funktioniert

Die App laeuft standardmaessig gegen eine **lokale SQLite-DB**. Falls die
lokale API nicht erreichbar ist, faellt sie automatisch auf eingebettete
Demo-Daten zurueck.

---

## Struktur

### Lokal

Ordner:

- `local/01_schema_and_seed.sql`
- `local/build_local_db.py`
- `local/server.py`
- `local/rollout_demo.db`

Damit bekommst du:

- eine lokale SQLite-Datenbank
- einen kleinen HTTP-Server ohne externe Dependencies
- JSON-Endpunkte fuer die HTML-App

### Datenbank

Datei:

- `supabase/01_schema_and_seed.sql`

Enthaelt:

- Tabellen: `standorte`, `rollouts`, `tasks`, `materialbedarf`, `touren`, `tour_stopps`
- Views: `rollout_board`, `einkauf_offen`, `konfig_offen`, `touren_freigabe`
- Demo-Daten fuer 5 Standorte
- einfache `SELECT`-Policies fuer eine read-only Demo

### UI

Ordner:

- `app/index.html`
- `app/styles.css`
- `app/app.js`
- `app/data.js`
- `app/config.js`

Die UI zeigt:

- Dashboard mit Kennzahlen
- `Rollout Board`
- `Einkauf offen`
- `Konfig offen`
- `Tourfreigabe`
- `ERP Material` pro Standort
- Detailpanel pro Standort mit Tasks und Material
- Eingabemaske fuer Bemusterung
- Bearbeiten direkt aus der Detailansicht
- CSV-Import mit Standardtemplate
- Material-Export pro Standort

---

## Lokal starten

1. Datenbank erzeugen:

```bash
python3 local/build_local_db.py
```

2. Lokalen Server starten:

```bash
python3 local/server.py
```

3. Im Browser oeffnen:

```text
http://127.0.0.1:8766
```

Die App liest dann die Daten aus:

- `/api/dataset`
- `/api/standort/<standort_id>`
- `/api/export/material/<standort_id>.csv`

Schreiben laeuft lokal zusaetzlich ueber:

- `POST /api/standort`
- `PUT /api/standort/<standort_id>`
- `POST /api/import/csv`

---

## Lokaler Arbeitsablauf

Die Demo ist jetzt bewusst `local-first` aufgebaut:

1. **Bemusterung erfassen**
   Ueber die Eingabemaske unten links lassen sich Standort- und Rolloutdaten
   direkt in SQLite schreiben.

2. **Bestehenden Standort bearbeiten**
   Standort im Board auswaehlen, dann `Bearbeiten`.
   Die Form laedt den Datensatz und speichert Aenderungen wieder lokal.

3. **CSV mit Standardformat importieren**
   Template:
   `app/import-template.csv`

   Wichtige Regeln:
   - Kopfzeile beibehalten
   - Werte fuer `screen_typ`: `QM55`, `OM55`, `OM75`, `QM75`
   - Werte fuer `halterung_typ`: `SIP`, `DEP`, `SIHL`, `LSM1U`
   - Werte fuer `player_typ`: `1`, `2`, `3`
   - Booleans als `ja/nein`, `true/false`, `1/0` oder `x`
   - Bestehende `standort_id` werden aktualisiert, neue werden angelegt

4. **Material fuer ERP lesen oder exportieren**
   In der View `ERP Material` und im rechten Detailbereich sind pro Standort
   `PSO-Nummer`, `Auftragsnummer` und Materialpositionen sichtbar.
   Mit `Material exportieren` wird pro Standort eine CSV erzeugt.

---

## Automatische Ableitungen

Beim Speichern oder Importieren werden lokal zwei Dinge nachgezogen:

- `materialbedarf` wird aus `Screen`, `Halterung`, `IP Power` und `Player`
  synchronisiert
- gesteuerte Tasks aus dem Bemusterungsformular werden aktualisiert:
  - `Bestellung`, wenn Material nicht komplett ist
  - `Konfig`, wenn CMS nicht `geprueft` ist
  - `Montagevorbereitung`, wenn Anmeldung, Montagefenster oder Sonderfall
    hinterlegt sind

---

## GitHub Pages

Der Ordner ist jetzt so vorbereitet, dass er als eigenes Repo auf GitHub liegen
kann.

Wichtig:

- die App erkennt `localhost` / `127.0.0.1` automatisch als `local`
- ausserhalb von `localhost` nutzt sie das verlinkte Supabase-Projekt als
  read-only Datenquelle
- das Workflow-File `.github/workflows/deploy-pages.yml` deployed direkt den
  Ordner `app/`

Damit funktioniert die statische Demo sofort nach dem ersten Push auf `main`,
ohne dass `config.js` manuell umgestellt werden muss.

---

## Supabase laden

1. Das Projekt ist lokal an Supabase ref `woufcdjretcwcgqrbdgt` verlinkt
2. `supabase/01_schema_and_seed.sql` ist fuer dieses Projekt bereits eingespielt
3. Die statische App kann das Projekt ueber den `anon`-Key read-only lesen

Die App liest bei Supabase-Nutzung diese Endpunkte:

- `standorte`
- `rollouts`
- `tasks`
- `materialbedarf`
- `touren`
- `tour_stopps`
- `rollout_board`
- `einkauf_offen`
- `konfig_offen`
- `touren_freigabe`

---

## App auf Supabase umstellen

In `app/config.js` eintragen:

```js
window.APP_CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://DEIN-PROJEKT.supabase.co",
  supabaseAnonKey: "DEIN-ANON-KEY",
  schema: "public"
};
```

Danach liest die App die Daten ueber die Supabase-REST-API.

Wenn die Verbindung fehlschlaegt, faellt die App automatisch auf Demo-Daten
zurueck.

Falls du die Repo-Version oeffentlich auf GitHub Pages betreibst, solltest du
fuer Supabase nur einen read-only `anon`-Key verwenden.

---

## Sicherheitslogik

Die SQL-Datei aktiviert `RLS` und erlaubt fuer die Demo nur `SELECT`.

Das ist bewusst simpel gehalten:

- gut fuer eine oeffentliche Read-only-Demo
- nicht gedacht als produktive Rechtearchitektur

Wenn du spaeter Schreiboperationen willst, solltest du Rollen und Policies
sauber trennen.

---

## Empfohlene naechste Schritte

Wenn die lokale Version sitzt, sind diese Erweiterungen sinnvoll:

1. Import-Preview mit Zeilenvalidierung vor dem Schreiben
2. separate Druck-/Kopierversion fuer ERP-Material pro Standort
3. erst danach optional Supabase-Migration fuer Mehrbenutzerbetrieb

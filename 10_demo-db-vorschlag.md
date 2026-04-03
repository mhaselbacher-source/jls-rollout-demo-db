# Demo-DB fuer Rolloutplanung

**Ziel:** einen konkreten Vorschlag zeigen, wie die bisherige Rollout-Demo als
kleine operative Datenbank aussehen koennte.

Die Idee ist nicht, ein ERP nachzubauen. Die Demo-DB soll zeigen, wie sich die
gleiche Logik aus der Mastertabelle in sauber getrennte Objekte, Beziehungen
und Views ueberfuehren laesst.

Siehe auch:
- [[05_rollout-steuerung-tabelle-vs-datenbank]]
- [[07_rolloutliste-demo-realitaetsnah]]
- [[09_materialliste-pro-standort-demo]]

---

## Kurzantwort

Fuer die Demo wuerde ich **keine generische Monster-DB** zeigen, sondern eine
kleine, nachvollziehbare Struktur mit `6` Kernen:

1. `standorte`
2. `rollouts`
3. `tasks`
4. `materialbedarf`
5. `touren`
6. `tour_stopps`

Damit kann man in der Praesentation sofort zeigen:

- ein Standort ist Stammdatenobjekt
- ein Rollout ist der operative Fall
- Tasks entstehen aus Luecken und offenen Schritten
- Material wird aus der technischen Auspraegung abgeleitet
- Touren sind eine eigene, spaetere Planungssicht

Genau das ist der Unterschied zwischen `eine grosse Zeile mit allem` und
`ein kleines Arbeitsmodell mit Beziehungen`.

---

## Zielbild fuer die Story

> Heute steckt alles in einer grossen Tabelle.
> In der Demo-DB bleibt die Fachlogik gleich, aber die Struktur wird sauberer:
> Standort, Rollout, Task, Material und Tour sind getrennt, aber verknuepft.

So fuehlt sich die Datenbank im Vortrag an:

- weniger `eine Zeile muss alles koennen`
- mehr `jede Sicht zeigt nur das, was fuer die Rolle relevant ist`
- Agenten arbeiten nicht nur auf einer Tabelle, sondern auf einem gemeinsamen
  Arbeitsmodell

---

## Empfohlenes Datenmodell

### 1. Tabelle `standorte`

Stammdaten pro Filiale.

| Feld | Typ | Zweck |
|------|-----|-------|
| `standort_id` | Text | z.B. `JLS-001` |
| `filiale_name` | Text | lesbarer Name |
| `strasse` | Text | Adresse |
| `plz` | Text | Postleitzahl |
| `ort` | Text | Ort |
| `kanton` | Text | Region fuer Cluster / Filter |
| `kontaktperson` | Text | Ansprechpartner vor Ort |
| `telefon` | Text | Kontakt |
| `anmeldung_noetig` | Boolean | ja / nein |
| `anmeldung_hinweis` | Text | z.B. Security, Hauswartung |
| `montagefenster` | Text | z.B. `Mo-Fr 07:00-09:00` |
| `parkplatz_hinweis` | Text | operative Randbedingung |

---

### 2. Tabelle `rollouts`

Der eigentliche operative Fall pro Standort.
In der Demo reicht zunaechst `1` Rollout pro Standort.

| Feld | Typ | Zweck |
|------|-----|-------|
| `rollout_id` | Text | z.B. `RO-2026-001` |
| `standort_id` | FK | Verweis auf `standorte` |
| `rollout_typ` | Text | Austausch, Migration, Spezialfall |
| `screen_typ` | Text | `QM55`, `OM55`, `OM75`, `QM75` |
| `halterung_typ` | Text | `SIP`, `DEP`, `SIHL`, `LSM1U` |
| `ip_power` | Boolean | ja / nein |
| `player_typ` | Integer | `1`, `2`, `3` |
| `hohldecke` | Boolean | baulicher Sonderfall |
| `anzahl_personen` | Integer | Montageaufwand |
| `zeitbedarf_min` | Integer | Schaetzwert |
| `cms_status` | Text | `offen`, `erstellt`, `geprueft` |
| `material_status` | Text | `komplett`, `offen`, `spezialteil offen` |
| `prozess_status` | Text | `offen`, `in_bearbeitung`, `bereit`, `blockiert`, `montiert` |
| `installationsdatum` | Date | geplanter Einsatz |
| `cluster` | Text | z.B. `A`, `B` |
| `team` | Text | z.B. `Team 1` |
| `bemerkung` | Text | Sonderfaelle |

**Wichtiger Punkt fuer die Demo:**  
`prozess_status` ist nicht einfach manuell getippt, sondern kann durch Agenten
aus Detailfeldern und offenen Tasks mitgepflegt werden.

---

### 3. Tabelle `tasks`

Hier lebt die eigentliche operative Arbeit.

| Feld | Typ | Zweck |
|------|-----|-------|
| `task_id` | Text | z.B. `TASK-2041` |
| `rollout_id` | FK | Verweis auf `rollouts` |
| `task_typ` | Text | `Bestellung`, `Konfig`, `Netzwerk`, `Montagevorbereitung` |
| `titel` | Text | kurze Aufgabe |
| `status` | Text | `offen`, `in_arbeit`, `erledigt`, `blockiert` |
| `prioritaet` | Text | `hoch`, `mittel`, `niedrig` |
| `owner_rolle` | Text | `PL`, `Einkauf`, `Konfig`, `Montageplanung` |
| `faellig_am` | Date | Steuerung |
| `quelle` | Text | z.B. Bemusterung, Agentenpruefung, manuell |
| `hinweis` | Text | Details |

Beispiel:

- `Sonderhalterung bestellen`
- `CMS-Konfiguration erstellen`
- `Hauswartung 48h vorher anmelden`
- `Spezialbohrer fuer Betonwand pruefen`

Damit wird sichtbar: Nicht der Standort ist `offen`, sondern konkrete Arbeit ist
offen.

---

### 4. Tabelle `materialbedarf`

Abgeleitete Materialsicht pro Rollout.

| Feld | Typ | Zweck |
|------|-----|-------|
| `materialbedarf_id` | Text | eindeutiger Datensatz |
| `rollout_id` | FK | Verweis auf `rollouts` |
| `artikel_typ` | Text | `Screen`, `Halterung`, `IP Power`, `Player` |
| `artikel_code` | Text | z.B. `QM55`, `DEP`, `PLAYER-2` |
| `menge` | Integer | Menge |
| `bestellstatus` | Text | `nicht_noetig`, `offen`, `bestellt`, `kommissioniert` |
| `pso_nummer` | Text | ERP-nahe Referenz |
| `auftragsnummer` | Text | ERP-nahe Referenz |
| `hinweis` | Text | Zusatzinfo |

Das passt direkt zur bestehenden Datei [[09_materialliste-pro-standort-demo]].

---

### 5. Tabelle `touren`

Geplante Montagetour pro Tag / Team.

| Feld | Typ | Zweck |
|------|-----|-------|
| `tour_id` | Text | z.B. `TOUR-A-2026-04-22` |
| `datum` | Date | Einsatztag |
| `team` | Text | Team / Fahrzeug |
| `fahrzeug` | Text | z.B. Lieferwagen 1 |
| `status` | Text | `entwurf`, `geprueft`, `freigegeben` |
| `hinweis` | Text | Tageshinweis |

---

### 6. Tabelle `tour_stopps`

Zuordnung Rollout -> Tour in Reihenfolge.

| Feld | Typ | Zweck |
|------|-----|-------|
| `tour_stopp_id` | Text | eindeutiger Datensatz |
| `tour_id` | FK | Verweis auf `touren` |
| `rollout_id` | FK | Verweis auf `rollouts` |
| `reihenfolge` | Integer | Stop-Reihenfolge |
| `startzeit_plan` | Text | z.B. `07:15` |
| `dauer_min` | Integer | geplanter Aufwand |
| `freigabe_status` | Text | `ok`, `risiko`, `blockiert` |
| `hinweis` | Text | tourrelevante Hinweise |

Wichtig fuer die Story:
`Touren` sind nicht die Hauptpflege. Sie sind eine abgeleitete Planungsschicht.

---

## Beziehungen

```text
standorte 1 --- n rollouts
rollouts  1 --- n tasks
rollouts  1 --- n materialbedarf
touren    1 --- n tour_stopps
rollouts  1 --- n tour_stopps
```

Das reicht fuer die Demo voellig aus. Es ist klein, aber logisch sauber.

---

## Beispiel-Datensaetze fuer die Demo

### `standorte`

| standort_id | filiale_name | ort | kanton | anmeldung_noetig | montagefenster |
|-------------|--------------|-----|--------|------------------|----------------|
| JLS-001 | Bahnhofstrasse | Zuerich | ZH | Ja | Mo-Fr 07:00-09:00 |
| JLS-002 | Marktgasse | Winterthur | ZH | Nein | Mo-Sa nach Absprache |
| JLS-003 | Multergasse | St. Gallen | SG | Ja | Di/Do 06:30-08:30 |
| JLS-004 | Vordergasse | Schaffhausen | SH | Nein | Mo-Fr ganztags |
| JLS-005 | Zuercherstrasse | Frauenfeld | TG | Nein | Mo-Fr 07:00-18:00 |

### `rollouts`

| rollout_id | standort_id | screen_typ | halterung_typ | ip_power | player_typ | cms_status | material_status | prozess_status | installationsdatum |
|------------|-------------|------------|---------------|----------|------------|------------|-----------------|----------------|--------------------|
| RO-001 | JLS-001 | QM55 | SIP | Nein | 1 | geprueft | komplett | bereit | 2026-04-22 |
| RO-002 | JLS-002 | OM55 | DEP | Ja | 2 | erstellt | offen | in_bearbeitung | 2026-04-22 |
| RO-003 | JLS-003 | OM75 | DEP | Ja | 3 | offen | spezialteil offen | blockiert | 2026-04-23 |
| RO-004 | JLS-004 | QM55 | SIHL | Nein | 1 | geprueft | komplett | bereit | 2026-04-23 |
| RO-005 | JLS-005 | QM75 | LSM1U | Nein | 2 | geprueft | komplett | bereit | 2026-04-22 |

### `tasks`

| task_id | rollout_id | task_typ | titel | status | owner_rolle | faellig_am |
|---------|------------|----------|-------|--------|-------------|------------|
| TASK-001 | RO-002 | Montagevorbereitung | Aufputzinstallation vorbereiten | offen | Montageplanung | 2026-04-18 |
| TASK-002 | RO-002 | Konfig | CMS-Konfiguration pruefen | offen | Konfig | 2026-04-17 |
| TASK-003 | RO-003 | Bestellung | Sonderhalterung bestellen | blockiert | Einkauf | 2026-04-15 |
| TASK-004 | RO-003 | Konfig | CMS-Konfiguration erstellen | offen | Konfig | 2026-04-16 |
| TASK-005 | RO-003 | Montagevorbereitung | Hauswartung anmelden | offen | PL | 2026-04-18 |

### `materialbedarf`

| materialbedarf_id | rollout_id | artikel_typ | artikel_code | menge | bestellstatus |
|-------------------|------------|-------------|--------------|-------|---------------|
| MAT-001 | RO-001 | Screen | QM55 | 1 | kommissioniert |
| MAT-002 | RO-001 | Halterung | SIP | 1 | kommissioniert |
| MAT-003 | RO-002 | Screen | OM55 | 1 | bestellt |
| MAT-004 | RO-002 | Halterung | DEP | 1 | offen |
| MAT-005 | RO-002 | IP Power | IP-POWER | 1 | offen |
| MAT-006 | RO-003 | Screen | OM75 | 1 | bestellt |
| MAT-007 | RO-003 | Halterung | DEP-SPECIAL | 1 | offen |
| MAT-008 | RO-003 | Player | PLAYER-3 | 1 | offen |

### `touren`

| tour_id | datum | team | fahrzeug | status |
|---------|-------|------|----------|--------|
| TOUR-A-2026-04-22 | 2026-04-22 | Team 1 | Lieferwagen 1 | entwurf |
| TOUR-B-2026-04-23 | 2026-04-23 | Team 2 | Lieferwagen 2 | risiko |

### `tour_stopps`

| tour_stopp_id | tour_id | rollout_id | reihenfolge | startzeit_plan | dauer_min | freigabe_status |
|---------------|---------|------------|-------------|----------------|-----------|-----------------|
| STOP-001 | TOUR-A-2026-04-22 | RO-001 | 1 | 07:15 | 90 | ok |
| STOP-002 | TOUR-A-2026-04-22 | RO-005 | 2 | 09:25 | 90 | ok |
| STOP-003 | TOUR-A-2026-04-22 | RO-002 | 3 | 11:15 | 150 | risiko |
| STOP-004 | TOUR-B-2026-04-23 | RO-003 | 1 | 07:30 | 150 | blockiert |
| STOP-005 | TOUR-B-2026-04-23 | RO-004 | 2 | 10:50 | 90 | ok |

---

## Welche Views man in der Demo zeigen sollte

Die DB selbst sieht niemand gern direkt. Entscheidender ist, welche Sichten
daraus entstehen.

### View 1: `rollout_board`

Ziel: Management- und PL-Sicht.

| Standort | Prozessstatus | Materialstatus | CMS | Install. Datum | Naechster Task |
|----------|---------------|----------------|-----|----------------|----------------|
| JLS-001 | bereit | komplett | geprueft | 2026-04-22 | Security anmelden |
| JLS-002 | in_bearbeitung | offen | erstellt | 2026-04-22 | Konfiguration pruefen |
| JLS-003 | blockiert | spezialteil offen | offen | 2026-04-23 | Sonderhalterung bestellen |

### View 2: `einkauf_offen`

Ziel: nur Einkaufsarbeit.

| Standort | Artikel | Menge | Bestellstatus | Hinweis |
|----------|---------|-------|---------------|---------|
| JLS-002 | DEP | 1 | offen | Halterung fehlt |
| JLS-002 | IP-POWER | 1 | offen | Zusatzkomponente |
| JLS-003 | DEP-SPECIAL | 1 | offen | Sonderhalterung |

### View 3: `konfig_offen`

Ziel: Konfigurationsteam.

| Standort | Player | CMS-Status | Task | Faellig |
|----------|--------|------------|------|---------|
| JLS-002 | 2 | erstellt | Konfiguration pruefen | 2026-04-17 |
| JLS-003 | 3 | offen | Konfiguration erstellen | 2026-04-16 |

### View 4: `touren_freigabe`

Ziel: Montageplanung.

| Tour | Standort | Freigabe | Grund |
|------|----------|----------|-------|
| Tour-A | JLS-001 | ok | bereit |
| Tour-A | JLS-002 | risiko | Konfig offen |
| Tour-B | JLS-003 | blockiert | Sonderhalterung fehlt |

Diese vier Views reichen fuer den Vortrag voellig aus. Mehr waere eher Ablenkung.

---

## Warum sich diese DB "gut anfuehlt"

Im Unterschied zur grossen Tabelle entstehen drei spuerbare Vorteile:

### 1. Offene Arbeit wird konkret

Nicht mehr:
`Standort irgendwie gelb`

Sondern:

- Material offen
- Konfiguration offen
- Hauswartung anmelden
- Tourfreigabe blockiert

Das ist operativ viel klarer.

### 2. Mehrere Rollen arbeiten auf derselben Grundlage

Einkauf, Konfig und Montageplanung sehen nicht dieselbe ueberladene Tabelle,
sondern unterschiedliche Views auf dieselben Daten.

### 3. Agenten koennen gezielter eingreifen

Ein Agent kann:

- aus Notizen einen neuen `rollout` anlegen
- fehlende `tasks` erzeugen
- `materialbedarf` ableiten
- vor Tourfreigabe Risiken markieren
- Status konsistent aktualisieren

Damit fuehlt sich der Workflow weniger wie `Excel pflegen` und mehr wie
`Arbeitsobjekte automatisch vorbereiten und pruefen` an.

---

## Minimaler technischer Stack fuer eine Demo

Wenn du das irgendwann wirklich klickbar machen willst, waere fuer eine
Low-Friction-Demo genug:

- `SQLite` oder `Postgres` als Datenbasis
- `Airtable`, `Baserow` oder `NocoDB` als schnelle UI
- alternativ eine einfache interne Tabellen-UI mit 4 gespeicherten Views

Fuer die Praesentation reicht aber schon dieses Framing:

> Die DB ist nicht das Spektakel.
> Das Spektakel ist, dass Agenten aus Rohinformationen strukturierte Rollout-
> Faelle, Aufgaben, Materiallisten und Tourfreigaben erzeugen.

---

## Empfehlung fuer deinen Vortrag

Ich wuerde die Demo-DB so erzaehlen:

1. `Heute`: grosse zentrale Excel-Liste
2. `Naechster Schritt`: saubere Mastertabelle mit Agentenlogik
3. `Noch ein Schritt weiter`: kleine DB mit `Standort`, `Rollout`, `Task`,
   `Material`, `Tour`
4. `Nutzen`: dieselbe Fachlogik, aber bessere Views, bessere Verantwortung,
   bessere Automatisierung

Die eigentliche Pointe ist also nicht `Datenbank statt Tabelle`, sondern:

> Die Daten werden so strukturiert, dass Agenten nicht nur lesen, sondern
> aktiv koordinieren, pruefen und weiterverarbeiten koennen.

---

## Optionaler naechster Schritt

Wenn du willst, kann ich im naechsten Schritt noch eines von drei Dingen direkt
ausarbeiten:

1. eine **1-Folien-Version** dieser Demo-DB fuer die Praesentation
2. ein **konkretes SQL-Schema** fuer SQLite/Postgres
3. eine **Beispiel-UI mit 4 Screens / Views** als Markdown-Wireframe

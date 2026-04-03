CREATE TABLE standorte (
    standort_id TEXT PRIMARY KEY,
    filiale_name TEXT NOT NULL,
    strasse TEXT,
    plz TEXT,
    ort TEXT NOT NULL,
    kanton TEXT,
    kontaktperson TEXT,
    telefon TEXT,
    anmeldung_noetig INTEGER NOT NULL DEFAULT 0 CHECK (anmeldung_noetig IN (0, 1)),
    anmeldung_hinweis TEXT,
    montagefenster TEXT,
    parkplatz_hinweis TEXT
);

CREATE TABLE rollouts (
    rollout_id TEXT PRIMARY KEY,
    standort_id TEXT NOT NULL,
    rollout_typ TEXT NOT NULL,
    screen_typ TEXT NOT NULL,
    halterung_typ TEXT NOT NULL,
    ip_power INTEGER NOT NULL DEFAULT 0 CHECK (ip_power IN (0, 1)),
    player_typ INTEGER NOT NULL CHECK (player_typ IN (1, 2, 3)),
    hohldecke INTEGER NOT NULL DEFAULT 0 CHECK (hohldecke IN (0, 1)),
    anzahl_personen INTEGER NOT NULL DEFAULT 1,
    zeitbedarf_min INTEGER,
    cms_status TEXT NOT NULL CHECK (cms_status IN ('offen', 'erstellt', 'geprueft')),
    material_status TEXT NOT NULL CHECK (material_status IN ('komplett', 'offen', 'spezialteil offen')),
    prozess_status TEXT NOT NULL CHECK (prozess_status IN ('offen', 'in_bearbeitung', 'bereit', 'blockiert', 'montiert')),
    installationsdatum TEXT,
    cluster TEXT,
    team TEXT,
    bemerkung TEXT,
    FOREIGN KEY (standort_id) REFERENCES standorte (standort_id)
);

CREATE TABLE tasks (
    task_id TEXT PRIMARY KEY,
    rollout_id TEXT NOT NULL,
    task_typ TEXT NOT NULL CHECK (task_typ IN ('Bestellung', 'Konfig', 'Netzwerk', 'Montagevorbereitung')),
    titel TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('offen', 'in_arbeit', 'erledigt', 'blockiert')),
    prioritaet TEXT NOT NULL DEFAULT 'mittel' CHECK (prioritaet IN ('hoch', 'mittel', 'niedrig')),
    owner_rolle TEXT NOT NULL CHECK (owner_rolle IN ('PL', 'Einkauf', 'Konfig', 'Montageplanung')),
    faellig_am TEXT,
    quelle TEXT,
    hinweis TEXT,
    FOREIGN KEY (rollout_id) REFERENCES rollouts (rollout_id)
);

CREATE TABLE materialbedarf (
    materialbedarf_id TEXT PRIMARY KEY,
    rollout_id TEXT NOT NULL,
    artikel_typ TEXT NOT NULL CHECK (artikel_typ IN ('Screen', 'Halterung', 'IP Power', 'Player')),
    artikel_code TEXT NOT NULL,
    menge INTEGER NOT NULL DEFAULT 1,
    bestellstatus TEXT NOT NULL CHECK (bestellstatus IN ('nicht_noetig', 'offen', 'bestellt', 'kommissioniert')),
    pso_nummer TEXT,
    auftragsnummer TEXT,
    hinweis TEXT,
    FOREIGN KEY (rollout_id) REFERENCES rollouts (rollout_id)
);

CREATE TABLE touren (
    tour_id TEXT PRIMARY KEY,
    datum TEXT NOT NULL,
    team TEXT NOT NULL,
    fahrzeug TEXT,
    status TEXT NOT NULL CHECK (status IN ('entwurf', 'risiko', 'geprueft', 'freigegeben')),
    hinweis TEXT
);

CREATE TABLE tour_stopps (
    tour_stopp_id TEXT PRIMARY KEY,
    tour_id TEXT NOT NULL,
    rollout_id TEXT NOT NULL,
    reihenfolge INTEGER NOT NULL,
    startzeit_plan TEXT,
    dauer_min INTEGER,
    freigabe_status TEXT NOT NULL CHECK (freigabe_status IN ('ok', 'risiko', 'blockiert')),
    hinweis TEXT,
    FOREIGN KEY (tour_id) REFERENCES touren (tour_id),
    FOREIGN KEY (rollout_id) REFERENCES rollouts (rollout_id)
);

CREATE INDEX idx_rollouts_standort_id ON rollouts (standort_id);
CREATE INDEX idx_rollouts_installationsdatum ON rollouts (installationsdatum);
CREATE INDEX idx_tasks_rollout_id ON tasks (rollout_id);
CREATE INDEX idx_tasks_owner_status ON tasks (owner_rolle, status);
CREATE INDEX idx_materialbedarf_rollout_id ON materialbedarf (rollout_id);
CREATE INDEX idx_tour_stopps_tour_id ON tour_stopps (tour_id);
CREATE INDEX idx_tour_stopps_rollout_id ON tour_stopps (rollout_id);

INSERT INTO standorte (
    standort_id, filiale_name, strasse, plz, ort, kanton, kontaktperson, telefon,
    anmeldung_noetig, anmeldung_hinweis, montagefenster, parkplatz_hinweis
) VALUES
    ('JLS-001', 'Bahnhofstrasse', 'Bahnhofstrasse 12', '8001', 'Zuerich', 'ZH', 'Sandra Keller', '+41 44 123 45 67', 1, 'Security 48h vorher anmelden', 'Mo-Fr 07:00-09:00', 'Lieferzone, 30 Min.'),
    ('JLS-002', 'Marktgasse', 'Marktgasse 18', '8400', 'Winterthur', 'ZH', 'Peter Brunner', '+41 52 234 56 78', 0, NULL, 'Mo-Sa nach Absprache', 'Innenhof'),
    ('JLS-003', 'Multergasse', 'Multergasse 7', '9000', 'St. Gallen', 'SG', 'Monika Ritter', '+41 71 345 67 89', 1, 'Hauswartung 48h vorher anmelden', 'Di/Do 06:30-08:30', 'Standard'),
    ('JLS-004', 'Vordergasse', 'Vordergasse 45', '8200', 'Schaffhausen', 'SH', 'Hans Mueller', '+41 52 456 78 90', 0, NULL, 'Mo-Fr ganztags', 'Parkhaus 200 m'),
    ('JLS-005', 'Zuercherstrasse', 'Zuercherstrasse 88', '8500', 'Frauenfeld', 'TG', 'Lisa Vogel', '+41 52 567 89 01', 0, NULL, 'Mo-Fr 07:00-18:00', 'Kundenparkplatz');

INSERT INTO rollouts (
    rollout_id, standort_id, rollout_typ, screen_typ, halterung_typ, ip_power, player_typ,
    hohldecke, anzahl_personen, zeitbedarf_min, cms_status, material_status, prozess_status,
    installationsdatum, cluster, team, bemerkung
) VALUES
    ('RO-001', 'JLS-001', 'Austausch 55 Zoll / Migration', 'QM55', 'SIP', 0, 1, 0, 1, 90, 'geprueft', 'komplett', 'bereit', '2026-04-22', 'A', 'Team 1', 'Security 48h vorher anmelden'),
    ('RO-002', 'JLS-002', 'Austausch 55 Zoll', 'OM55', 'DEP', 1, 2, 0, 1, 150, 'erstellt', 'offen', 'in_bearbeitung', '2026-04-22', 'A', 'Team 1', 'Betonwand, Aufputz, Spezialbohrer'),
    ('RO-003', 'JLS-003', 'Deckenmontage 75 Zoll / Spezial', 'OM75', 'DEP', 1, 3, 1, 2, 150, 'offen', 'spezialteil offen', 'blockiert', '2026-04-23', 'B', 'Team 2', 'Sonderhalterung, Leiter, Hauswartung'),
    ('RO-004', 'JLS-004', 'Austausch 55 Zoll', 'QM55', 'SIHL', 0, 1, 0, 1, 90, 'geprueft', 'komplett', 'bereit', '2026-04-23', 'B', 'Team 2', 'Holzwand, Parkhaus 200 m'),
    ('RO-005', 'JLS-005', 'Austausch 75 Zoll Portrait', 'QM75', 'LSM1U', 0, 2, 0, 1, 90, 'geprueft', 'komplett', 'bereit', '2026-04-22', 'A', 'Team 1', 'Problemloser Standort');

INSERT INTO tasks (
    task_id, rollout_id, task_typ, titel, status, prioritaet, owner_rolle, faellig_am, quelle, hinweis
) VALUES
    ('TASK-001', 'RO-002', 'Montagevorbereitung', 'Aufputzinstallation vorbereiten', 'offen', 'hoch', 'Montageplanung', '2026-04-18', 'Agentenpruefung', 'UKV fehlt'),
    ('TASK-002', 'RO-002', 'Konfig', 'CMS-Konfiguration pruefen', 'offen', 'hoch', 'Konfig', '2026-04-17', 'Agentenpruefung', 'Vor Tour freigeben'),
    ('TASK-003', 'RO-003', 'Bestellung', 'Sonderhalterung bestellen', 'blockiert', 'hoch', 'Einkauf', '2026-04-15', 'Bemusterung', 'Spezialteil fuer Deckenmontage'),
    ('TASK-004', 'RO-003', 'Konfig', 'CMS-Konfiguration erstellen', 'offen', 'hoch', 'Konfig', '2026-04-16', 'Agentenpruefung', 'Player 3 noch nicht konfiguriert'),
    ('TASK-005', 'RO-003', 'Montagevorbereitung', 'Hauswartung anmelden', 'offen', 'mittel', 'PL', '2026-04-18', 'Standortvorgabe', '48h vorher anmelden');

INSERT INTO materialbedarf (
    materialbedarf_id, rollout_id, artikel_typ, artikel_code, menge, bestellstatus, pso_nummer, auftragsnummer, hinweis
) VALUES
    ('MAT-001', 'RO-001', 'Screen', 'QM55', 1, 'kommissioniert', 'PSO.140.101.056', '10156', 'Hauptscreen'),
    ('MAT-002', 'RO-001', 'Halterung', 'SIP', 1, 'kommissioniert', 'PSO.140.101.056', '10156', 'Passend zu QM55'),
    ('MAT-003', 'RO-001', 'Player', 'PLAYER-1', 1, 'kommissioniert', 'PSO.140.101.056', '10156', 'Player gemaess Rollout'),
    ('MAT-004', 'RO-002', 'Screen', 'OM55', 1, 'bestellt', 'PSO.140.101.057', '10157', 'Hauptscreen'),
    ('MAT-005', 'RO-002', 'Halterung', 'DEP', 1, 'offen', 'PSO.140.101.057', '10157', 'Halterung fehlt'),
    ('MAT-006', 'RO-002', 'IP Power', 'IP-POWER', 1, 'offen', 'PSO.140.101.057', '10157', 'Zusaetzliche Komponente'),
    ('MAT-007', 'RO-002', 'Player', 'PLAYER-2', 1, 'bestellt', 'PSO.140.101.057', '10157', 'Player gemaess Rollout'),
    ('MAT-008', 'RO-003', 'Screen', 'OM75', 1, 'bestellt', 'PSO.140.101.058', '10158', 'Hauptscreen'),
    ('MAT-009', 'RO-003', 'Halterung', 'DEP-SPECIAL', 1, 'offen', 'PSO.140.101.058', '10158', 'Sonderhalterung'),
    ('MAT-010', 'RO-003', 'IP Power', 'IP-POWER', 1, 'offen', 'PSO.140.101.058', '10158', 'Zusaetzliche Komponente'),
    ('MAT-011', 'RO-003', 'Player', 'PLAYER-3', 1, 'offen', 'PSO.140.101.058', '10158', 'Player gemaess Rollout');

INSERT INTO touren (
    tour_id, datum, team, fahrzeug, status, hinweis
) VALUES
    ('TOUR-A-2026-04-22', '2026-04-22', 'Team 1', 'Lieferwagen 1', 'entwurf', 'Material vor Abfahrt pruefen'),
    ('TOUR-B-2026-04-23', '2026-04-23', 'Team 2', 'Lieferwagen 2', 'risiko', 'RO-003 noch nicht freigegeben');

INSERT INTO tour_stopps (
    tour_stopp_id, tour_id, rollout_id, reihenfolge, startzeit_plan, dauer_min, freigabe_status, hinweis
) VALUES
    ('STOP-001', 'TOUR-A-2026-04-22', 'RO-001', 1, '07:15', 90, 'ok', 'Security beachten'),
    ('STOP-002', 'TOUR-A-2026-04-22', 'RO-005', 2, '09:25', 90, 'ok', 'Problemloser Standort'),
    ('STOP-003', 'TOUR-A-2026-04-22', 'RO-002', 3, '11:15', 150, 'risiko', 'Konfig offen, Aufputz einplanen'),
    ('STOP-004', 'TOUR-B-2026-04-23', 'RO-003', 1, '07:30', 150, 'blockiert', 'Sonderhalterung fehlt'),
    ('STOP-005', 'TOUR-B-2026-04-23', 'RO-004', 2, '10:50', 90, 'ok', 'Parkhaus 200 m');

CREATE VIEW rollout_board AS
SELECT
    s.standort_id,
    s.filiale_name,
    s.ort,
    r.prozess_status,
    r.material_status,
    r.cms_status,
    r.installationsdatum,
    (
        SELECT t.titel
        FROM tasks t
        WHERE t.rollout_id = r.rollout_id
          AND t.status IN ('offen', 'blockiert', 'in_arbeit')
        ORDER BY
            CASE t.prioritaet
                WHEN 'hoch' THEN 1
                WHEN 'mittel' THEN 2
                ELSE 3
            END,
            t.faellig_am
        LIMIT 1
    ) AS naechster_task
FROM rollouts r
JOIN standorte s ON s.standort_id = r.standort_id;

CREATE VIEW einkauf_offen AS
SELECT
    s.standort_id,
    s.filiale_name,
    m.artikel_code,
    m.menge,
    m.bestellstatus,
    m.hinweis
FROM materialbedarf m
JOIN rollouts r ON r.rollout_id = m.rollout_id
JOIN standorte s ON s.standort_id = r.standort_id
WHERE m.bestellstatus = 'offen';

CREATE VIEW konfig_offen AS
SELECT
    s.standort_id,
    s.filiale_name,
    r.player_typ,
    r.cms_status,
    t.titel,
    t.faellig_am
FROM tasks t
JOIN rollouts r ON r.rollout_id = t.rollout_id
JOIN standorte s ON s.standort_id = r.standort_id
WHERE t.task_typ = 'Konfig'
  AND t.status <> 'erledigt';

CREATE VIEW touren_freigabe AS
SELECT
    ts.tour_id,
    s.standort_id,
    s.filiale_name,
    ts.reihenfolge,
    ts.startzeit_plan,
    ts.freigabe_status,
    ts.hinweis
FROM tour_stopps ts
JOIN rollouts r ON r.rollout_id = ts.rollout_id
JOIN standorte s ON s.standort_id = r.standort_id
ORDER BY ts.tour_id, ts.reihenfolge;

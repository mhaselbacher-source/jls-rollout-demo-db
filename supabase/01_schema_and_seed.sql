create extension if not exists pgcrypto;

drop view if exists touren_freigabe;
drop view if exists konfig_offen;
drop view if exists einkauf_offen;
drop view if exists rollout_board;

drop table if exists tour_stopps;
drop table if exists touren;
drop table if exists materialbedarf;
drop table if exists tasks;
drop table if exists rollouts;
drop table if exists standorte;

create table standorte (
    standort_id text primary key,
    filiale_name text not null,
    strasse text,
    plz text,
    ort text not null,
    kanton text,
    kontaktperson text,
    telefon text,
    anmeldung_noetig boolean not null default false,
    anmeldung_hinweis text,
    montagefenster text,
    parkplatz_hinweis text,
    created_at timestamptz not null default now()
);

create table rollouts (
    rollout_id text primary key,
    standort_id text not null references standorte(standort_id) on delete cascade,
    rollout_typ text not null,
    screen_typ text not null,
    halterung_typ text not null,
    ip_power boolean not null default false,
    player_typ integer not null check (player_typ in (1, 2, 3)),
    hohldecke boolean not null default false,
    anzahl_personen integer not null default 1 check (anzahl_personen > 0),
    zeitbedarf_min integer check (zeitbedarf_min > 0),
    cms_status text not null check (cms_status in ('offen', 'erstellt', 'geprueft')),
    material_status text not null check (material_status in ('komplett', 'offen', 'spezialteil offen')),
    prozess_status text not null check (prozess_status in ('offen', 'in_bearbeitung', 'bereit', 'blockiert', 'montiert')),
    installationsdatum date,
    cluster text,
    team text,
    bemerkung text,
    created_at timestamptz not null default now()
);

create table tasks (
    task_id text primary key,
    rollout_id text not null references rollouts(rollout_id) on delete cascade,
    task_typ text not null check (task_typ in ('Bestellung', 'Konfig', 'Netzwerk', 'Montagevorbereitung')),
    titel text not null,
    status text not null check (status in ('offen', 'in_arbeit', 'erledigt', 'blockiert')),
    prioritaet text not null default 'mittel' check (prioritaet in ('hoch', 'mittel', 'niedrig')),
    owner_rolle text not null check (owner_rolle in ('PL', 'Einkauf', 'Konfig', 'Montageplanung')),
    faellig_am date,
    quelle text,
    hinweis text,
    created_at timestamptz not null default now()
);

create table materialbedarf (
    materialbedarf_id text primary key,
    rollout_id text not null references rollouts(rollout_id) on delete cascade,
    artikel_typ text not null check (artikel_typ in ('Screen', 'Halterung', 'IP Power', 'Player')),
    artikel_code text not null,
    menge integer not null default 1 check (menge > 0),
    bestellstatus text not null check (bestellstatus in ('nicht_noetig', 'offen', 'bestellt', 'kommissioniert')),
    pso_nummer text,
    auftragsnummer text,
    hinweis text,
    created_at timestamptz not null default now()
);

create table touren (
    tour_id text primary key,
    datum date not null,
    team text not null,
    fahrzeug text,
    status text not null check (status in ('entwurf', 'risiko', 'geprueft', 'freigegeben')),
    hinweis text,
    created_at timestamptz not null default now()
);

create table tour_stopps (
    tour_stopp_id text primary key,
    tour_id text not null references touren(tour_id) on delete cascade,
    rollout_id text not null references rollouts(rollout_id) on delete cascade,
    reihenfolge integer not null check (reihenfolge > 0),
    startzeit_plan text,
    dauer_min integer check (dauer_min > 0),
    freigabe_status text not null check (freigabe_status in ('ok', 'risiko', 'blockiert')),
    hinweis text,
    created_at timestamptz not null default now(),
    unique (tour_id, reihenfolge)
);

create index idx_rollouts_standort_id on rollouts (standort_id);
create index idx_rollouts_installationsdatum on rollouts (installationsdatum);
create index idx_tasks_rollout_id on tasks (rollout_id);
create index idx_tasks_owner_status on tasks (owner_rolle, status);
create index idx_materialbedarf_rollout_id on materialbedarf (rollout_id);
create index idx_tour_stopps_tour_id on tour_stopps (tour_id);
create index idx_tour_stopps_rollout_id on tour_stopps (rollout_id);

insert into standorte (
    standort_id, filiale_name, strasse, plz, ort, kanton, kontaktperson, telefon,
    anmeldung_noetig, anmeldung_hinweis, montagefenster, parkplatz_hinweis
) values
    ('JLS-001', 'Bahnhofstrasse', 'Bahnhofstrasse 12', '8001', 'Zuerich', 'ZH', 'Sandra Keller', '+41 44 123 45 67', true, 'Security 48h vorher anmelden', 'Mo-Fr 07:00-09:00', 'Lieferzone, 30 Min.'),
    ('JLS-002', 'Marktgasse', 'Marktgasse 18', '8400', 'Winterthur', 'ZH', 'Peter Brunner', '+41 52 234 56 78', false, null, 'Mo-Sa nach Absprache', 'Innenhof'),
    ('JLS-003', 'Multergasse', 'Multergasse 7', '9000', 'St. Gallen', 'SG', 'Monika Ritter', '+41 71 345 67 89', true, 'Hauswartung 48h vorher anmelden', 'Di/Do 06:30-08:30', 'Standard'),
    ('JLS-004', 'Vordergasse', 'Vordergasse 45', '8200', 'Schaffhausen', 'SH', 'Hans Mueller', '+41 52 456 78 90', false, null, 'Mo-Fr ganztags', 'Parkhaus 200 m'),
    ('JLS-005', 'Zuercherstrasse', 'Zuercherstrasse 88', '8500', 'Frauenfeld', 'TG', 'Lisa Vogel', '+41 52 567 89 01', false, null, 'Mo-Fr 07:00-18:00', 'Kundenparkplatz');

insert into rollouts (
    rollout_id, standort_id, rollout_typ, screen_typ, halterung_typ, ip_power, player_typ,
    hohldecke, anzahl_personen, zeitbedarf_min, cms_status, material_status, prozess_status,
    installationsdatum, cluster, team, bemerkung
) values
    ('RO-001', 'JLS-001', 'Austausch 55 Zoll / Migration', 'QM55', 'SIP', false, 1, false, 1, 90, 'geprueft', 'komplett', 'bereit', '2026-04-22', 'A', 'Team 1', 'Security 48h vorher anmelden'),
    ('RO-002', 'JLS-002', 'Austausch 55 Zoll', 'OM55', 'DEP', true, 2, false, 1, 150, 'erstellt', 'offen', 'in_bearbeitung', '2026-04-22', 'A', 'Team 1', 'Betonwand, Aufputz, Spezialbohrer'),
    ('RO-003', 'JLS-003', 'Deckenmontage 75 Zoll / Spezial', 'OM75', 'DEP', true, 3, true, 2, 150, 'offen', 'spezialteil offen', 'blockiert', '2026-04-23', 'B', 'Team 2', 'Sonderhalterung, Leiter, Hauswartung'),
    ('RO-004', 'JLS-004', 'Austausch 55 Zoll', 'QM55', 'SIHL', false, 1, false, 1, 90, 'geprueft', 'komplett', 'bereit', '2026-04-23', 'B', 'Team 2', 'Holzwand, Parkhaus 200 m'),
    ('RO-005', 'JLS-005', 'Austausch 75 Zoll Portrait', 'QM75', 'LSM1U', false, 2, false, 1, 90, 'geprueft', 'komplett', 'bereit', '2026-04-22', 'A', 'Team 1', 'Problemloser Standort');

insert into tasks (
    task_id, rollout_id, task_typ, titel, status, prioritaet, owner_rolle, faellig_am, quelle, hinweis
) values
    ('TASK-001', 'RO-002', 'Montagevorbereitung', 'Aufputzinstallation vorbereiten', 'offen', 'hoch', 'Montageplanung', '2026-04-18', 'Agentenpruefung', 'UKV fehlt'),
    ('TASK-002', 'RO-002', 'Konfig', 'CMS-Konfiguration pruefen', 'offen', 'hoch', 'Konfig', '2026-04-17', 'Agentenpruefung', 'Vor Tour freigeben'),
    ('TASK-003', 'RO-003', 'Bestellung', 'Sonderhalterung bestellen', 'blockiert', 'hoch', 'Einkauf', '2026-04-15', 'Bemusterung', 'Spezialteil fuer Deckenmontage'),
    ('TASK-004', 'RO-003', 'Konfig', 'CMS-Konfiguration erstellen', 'offen', 'hoch', 'Konfig', '2026-04-16', 'Agentenpruefung', 'Player 3 noch nicht konfiguriert'),
    ('TASK-005', 'RO-003', 'Montagevorbereitung', 'Hauswartung anmelden', 'offen', 'mittel', 'PL', '2026-04-18', 'Standortvorgabe', '48h vorher anmelden');

insert into materialbedarf (
    materialbedarf_id, rollout_id, artikel_typ, artikel_code, menge, bestellstatus, pso_nummer, auftragsnummer, hinweis
) values
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

insert into touren (
    tour_id, datum, team, fahrzeug, status, hinweis
) values
    ('TOUR-A-2026-04-22', '2026-04-22', 'Team 1', 'Lieferwagen 1', 'entwurf', 'Material vor Abfahrt pruefen'),
    ('TOUR-B-2026-04-23', '2026-04-23', 'Team 2', 'Lieferwagen 2', 'risiko', 'RO-003 noch nicht freigegeben');

insert into tour_stopps (
    tour_stopp_id, tour_id, rollout_id, reihenfolge, startzeit_plan, dauer_min, freigabe_status, hinweis
) values
    ('STOP-001', 'TOUR-A-2026-04-22', 'RO-001', 1, '07:15', 90, 'ok', 'Security beachten'),
    ('STOP-002', 'TOUR-A-2026-04-22', 'RO-005', 2, '09:25', 90, 'ok', 'Problemloser Standort'),
    ('STOP-003', 'TOUR-A-2026-04-22', 'RO-002', 3, '11:15', 150, 'risiko', 'Konfig offen, Aufputz einplanen'),
    ('STOP-004', 'TOUR-B-2026-04-23', 'RO-003', 1, '07:30', 150, 'blockiert', 'Sonderhalterung fehlt'),
    ('STOP-005', 'TOUR-B-2026-04-23', 'RO-004', 2, '10:50', 90, 'ok', 'Parkhaus 200 m');

create view rollout_board as
select
    s.standort_id,
    s.filiale_name,
    s.ort,
    r.rollout_id,
    r.prozess_status,
    r.material_status,
    r.cms_status,
    r.installationsdatum,
    r.cluster,
    r.team,
    (
        select t.titel
        from tasks t
        where t.rollout_id = r.rollout_id
          and t.status in ('offen', 'blockiert', 'in_arbeit')
        order by
            case t.prioritaet
                when 'hoch' then 1
                when 'mittel' then 2
                else 3
            end,
            t.faellig_am
        limit 1
    ) as naechster_task
from rollouts r
join standorte s on s.standort_id = r.standort_id
order by r.installationsdatum, s.standort_id;

create view einkauf_offen as
select
    s.standort_id,
    s.filiale_name,
    m.rollout_id,
    m.artikel_typ,
    m.artikel_code,
    m.menge,
    m.bestellstatus,
    m.hinweis
from materialbedarf m
join rollouts r on r.rollout_id = m.rollout_id
join standorte s on s.standort_id = r.standort_id
where m.bestellstatus = 'offen'
order by s.standort_id, m.artikel_typ;

create view konfig_offen as
select
    s.standort_id,
    s.filiale_name,
    r.rollout_id,
    r.player_typ,
    r.cms_status,
    t.titel,
    t.status,
    t.faellig_am
from tasks t
join rollouts r on r.rollout_id = t.rollout_id
join standorte s on s.standort_id = r.standort_id
where t.task_typ = 'Konfig'
  and t.status <> 'erledigt'
order by t.faellig_am, s.standort_id;

create view touren_freigabe as
select
    ts.tour_id,
    tr.datum,
    tr.team,
    s.standort_id,
    s.filiale_name,
    ts.reihenfolge,
    ts.startzeit_plan,
    ts.dauer_min,
    ts.freigabe_status,
    ts.hinweis
from tour_stopps ts
join touren tr on tr.tour_id = ts.tour_id
join rollouts r on r.rollout_id = ts.rollout_id
join standorte s on s.standort_id = r.standort_id
order by tr.datum, ts.tour_id, ts.reihenfolge;

grant usage on schema public to anon, authenticated;
grant select on standorte to anon, authenticated;
grant select on rollouts to anon, authenticated;
grant select on tasks to anon, authenticated;
grant select on materialbedarf to anon, authenticated;
grant select on touren to anon, authenticated;
grant select on tour_stopps to anon, authenticated;
grant select on rollout_board to anon, authenticated;
grant select on einkauf_offen to anon, authenticated;
grant select on konfig_offen to anon, authenticated;
grant select on touren_freigabe to anon, authenticated;

alter table standorte enable row level security;
alter table rollouts enable row level security;
alter table tasks enable row level security;
alter table materialbedarf enable row level security;
alter table touren enable row level security;
alter table tour_stopps enable row level security;

create policy "public read standorte" on standorte for select using (true);
create policy "public read rollouts" on rollouts for select using (true);
create policy "public read tasks" on tasks for select using (true);
create policy "public read materialbedarf" on materialbedarf for select using (true);
create policy "public read touren" on touren for select using (true);
create policy "public read tour_stopps" on tour_stopps for select using (true);

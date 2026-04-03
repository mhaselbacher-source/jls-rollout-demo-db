from __future__ import annotations

import csv
import html
import io
import json
import sqlite3
from datetime import datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"
DB_PATH = BASE_DIR / "local" / "rollout_demo.db"
HOST = "127.0.0.1"
PORT = 8766

SCREEN_TYPES = {"QM55", "OM55", "OM75", "QM75"}
HALTERUNG_TYPES = {"SIP", "DEP", "SIHL", "LSM1U"}
CMS_STATUS = {"offen", "erstellt", "geprueft"}
MATERIAL_STATUS = {"komplett", "offen", "spezialteil offen"}
PROZESS_STATUS = {"offen", "in_bearbeitung", "bereit", "blockiert", "montiert"}
MANAGED_MATERIAL_TYPES = ("Screen", "Halterung", "IP Power", "Player")
TASK_STATUS = {"offen", "in_arbeit", "erledigt", "blockiert"}
IMPORT_COLUMNS = (
    "standort_id",
    "filiale_name",
    "strasse",
    "plz",
    "ort",
    "kanton",
    "kontaktperson",
    "telefon",
    "anmeldung_noetig",
    "anmeldung_hinweis",
    "montagefenster",
    "parkplatz_hinweis",
    "rollout_typ",
    "screen_typ",
    "halterung_typ",
    "ip_power",
    "player_typ",
    "hohldecke",
    "anzahl_personen",
    "zeitbedarf_min",
    "cms_status",
    "material_status",
    "prozess_status",
    "installationsdatum",
    "cluster",
    "team",
    "bemerkung",
)


class ApiError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("pragma foreign_keys = on")
    return connection


def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    connection = get_connection()
    try:
        cursor = connection.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def fetch_one(
    connection: sqlite3.Connection, query: str, params: tuple = ()
) -> dict | None:
    row = connection.execute(query, params).fetchone()
    return dict(row) if row else None


def clean_text(value: object) -> str:
    return str(value or "").strip()


def optional_text(payload: dict, key: str) -> str | None:
    value = clean_text(payload.get(key))
    return value or None


def required_text(payload: dict, key: str, label: str) -> str:
    value = clean_text(payload.get(key))
    if not value:
        raise ApiError(f"{label} ist ein Pflichtfeld.")
    return value


def parse_bool(payload: dict, key: str, label: str, default: bool = False) -> int:
    value = payload.get(key)
    if value in (None, ""):
        return 1 if default else 0
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, int):
        if value in (0, 1):
            return value
        raise ApiError(f"{label} muss Ja oder Nein sein.")

    normalized = clean_text(value).lower()
    mapping = {
        "1": 1,
        "0": 0,
        "ja": 1,
        "nein": 0,
        "yes": 1,
        "no": 0,
        "true": 1,
        "false": 0,
        "x": 1,
    }
    if normalized not in mapping:
        raise ApiError(f"{label} muss Ja oder Nein sein.")
    return mapping[normalized]


def parse_int(
    payload: dict,
    key: str,
    label: str,
    default: int | None = None,
    minimum: int | None = None,
    allowed: set[int] | None = None,
) -> int | None:
    raw_value = payload.get(key)
    if raw_value in (None, ""):
        return default

    try:
        value = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ApiError(f"{label} muss eine Zahl sein.") from exc

    if minimum is not None and value < minimum:
        raise ApiError(f"{label} muss mindestens {minimum} sein.")
    if allowed is not None and value not in allowed:
        raise ApiError(f"{label} hat einen ungueltigen Wert.")
    return value


def parse_choice(
    payload: dict,
    key: str,
    label: str,
    allowed: set[str],
    default: str | None = None,
) -> str:
    value = clean_text(payload.get(key) or default)
    if not value:
        raise ApiError(f"{label} ist ein Pflichtfeld.")
    if value not in allowed:
        raise ApiError(f"{label} hat einen ungueltigen Wert: {value}")
    return value


def parse_date(payload: dict, key: str, label: str) -> str | None:
    value = clean_text(payload.get(key))
    if not value:
        return None
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ApiError(f"{label} muss im Format YYYY-MM-DD sein.") from exc
    return value


def normalize_payload(payload: dict, standort_id_override: str | None = None) -> dict:
    standort_id = required_text(payload, "standort_id", "Standort-ID")
    if standort_id_override and standort_id != standort_id_override:
        raise ApiError("Standort-ID darf beim Bearbeiten nicht geaendert werden.")

    return {
        "standort_id": standort_id,
        "filiale_name": required_text(payload, "filiale_name", "Filiale"),
        "strasse": optional_text(payload, "strasse"),
        "plz": optional_text(payload, "plz"),
        "ort": required_text(payload, "ort", "Ort"),
        "kanton": optional_text(payload, "kanton"),
        "kontaktperson": optional_text(payload, "kontaktperson"),
        "telefon": optional_text(payload, "telefon"),
        "anmeldung_noetig": parse_bool(payload, "anmeldung_noetig", "Anmeldung noetig"),
        "anmeldung_hinweis": optional_text(payload, "anmeldung_hinweis"),
        "montagefenster": optional_text(payload, "montagefenster"),
        "parkplatz_hinweis": optional_text(payload, "parkplatz_hinweis"),
        "rollout_typ": required_text(payload, "rollout_typ", "Rollout-Typ"),
        "screen_typ": parse_choice(payload, "screen_typ", "Screen", SCREEN_TYPES),
        "halterung_typ": parse_choice(
            payload, "halterung_typ", "Halterung", HALTERUNG_TYPES
        ),
        "ip_power": parse_bool(payload, "ip_power", "IP Power"),
        "player_typ": parse_int(
            payload,
            "player_typ",
            "Player",
            default=1,
            minimum=1,
            allowed={1, 2, 3},
        ),
        "hohldecke": parse_bool(payload, "hohldecke", "Hohldecke"),
        "anzahl_personen": parse_int(
            payload, "anzahl_personen", "Anzahl Personen", default=1, minimum=1
        ),
        "zeitbedarf_min": parse_int(
            payload, "zeitbedarf_min", "Zeitbedarf", default=90, minimum=30
        ),
        "cms_status": parse_choice(
            payload, "cms_status", "CMS-Status", CMS_STATUS, default="offen"
        ),
        "material_status": parse_choice(
            payload,
            "material_status",
            "Materialstatus",
            MATERIAL_STATUS,
            default="offen",
        ),
        "prozess_status": parse_choice(
            payload,
            "prozess_status",
            "Prozessstatus",
            PROZESS_STATUS,
            default="offen",
        ),
        "installationsdatum": parse_date(
            payload, "installationsdatum", "Installationsdatum"
        ),
        "cluster": optional_text(payload, "cluster"),
        "team": optional_text(payload, "team"),
        "bemerkung": optional_text(payload, "bemerkung"),
    }


def next_prefixed_id(
    connection: sqlite3.Connection, table: str, column: str, prefix: str
) -> str:
    rows = connection.execute(
        f"select {column} from {table} where {column} like ?",
        (f"{prefix}%",),
    ).fetchall()
    max_value = 0
    for row in rows:
        raw = str(row[column]).replace(prefix, "", 1)
        if raw.isdigit():
            max_value = max(max_value, int(raw))
    return f"{prefix}{max_value + 1:03d}"


def next_order_bundle(connection: sqlite3.Connection) -> tuple[str, str]:
    rows = connection.execute(
        """
        select auftragsnummer
        from materialbedarf
        where auftragsnummer is not null and trim(auftragsnummer) <> ''
        """
    ).fetchall()
    max_order = 10155
    for row in rows:
        raw = clean_text(row["auftragsnummer"])
        if raw.isdigit():
            max_order = max(max_order, int(raw))

    next_order = max_order + 1
    pso_suffix = max(next_order - 10100, 1)
    pso_nummer = f"PSO.140.101.{pso_suffix:03d}"
    return pso_nummer, str(next_order)


def due_date(installationsdatum: str | None, days_before: int) -> str | None:
    if not installationsdatum:
        return None
    return (
        datetime.strptime(installationsdatum, "%Y-%m-%d") - timedelta(days=days_before)
    ).strftime("%Y-%m-%d")


def default_bestellstatus(material_status: str) -> str:
    if material_status == "komplett":
        return "kommissioniert"
    return "offen"


def build_desired_material(payload: dict) -> list[dict]:
    items = [
        {
            "artikel_typ": "Screen",
            "artikel_code": payload["screen_typ"],
            "menge": 1,
            "hinweis": "Hauptscreen",
        },
        {
            "artikel_typ": "Halterung",
            "artikel_code": payload["halterung_typ"],
            "menge": 1,
            "hinweis": f"Passend zu {payload['screen_typ']}",
        },
        {
            "artikel_typ": "Player",
            "artikel_code": f"PLAYER-{payload['player_typ']}",
            "menge": 1,
            "hinweis": "Player gemaess Rollout",
        },
    ]
    if payload["ip_power"]:
        items.insert(
            2,
            {
                "artikel_typ": "IP Power",
                "artikel_code": "IP-POWER",
                "menge": 1,
                "hinweis": "Zusaetzliche Komponente",
            },
        )
    return items


def sync_materialbedarf(
    connection: sqlite3.Connection, rollout_id: str, payload: dict
) -> None:
    rows = connection.execute(
        """
        select *
        from materialbedarf
        where rollout_id = ?
          and artikel_typ in ('Screen', 'Halterung', 'IP Power', 'Player')
        order by artikel_typ
        """,
        (rollout_id,),
    ).fetchall()
    existing = {row["artikel_typ"]: dict(row) for row in rows}
    desired = {item["artikel_typ"]: item for item in build_desired_material(payload)}

    pso_nummer = next(
        (
            clean_text(row["pso_nummer"])
            for row in existing.values()
            if clean_text(row["pso_nummer"])
        ),
        "",
    )
    auftragsnummer = next(
        (
            clean_text(row["auftragsnummer"])
            for row in existing.values()
            if clean_text(row["auftragsnummer"])
        ),
        "",
    )
    if not pso_nummer or not auftragsnummer:
        pso_nummer, auftragsnummer = next_order_bundle(connection)

    for artikel_typ, item in desired.items():
        row = existing.get(artikel_typ)
        if row:
            connection.execute(
                """
                update materialbedarf
                set artikel_code = ?,
                    menge = ?,
                    hinweis = coalesce(?, hinweis)
                where materialbedarf_id = ?
                """,
                (
                    item["artikel_code"],
                    item["menge"],
                    item["hinweis"],
                    row["materialbedarf_id"],
                ),
            )
            continue

        connection.execute(
            """
            insert into materialbedarf (
                materialbedarf_id,
                rollout_id,
                artikel_typ,
                artikel_code,
                menge,
                bestellstatus,
                pso_nummer,
                auftragsnummer,
                hinweis
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                next_prefixed_id(
                    connection, "materialbedarf", "materialbedarf_id", "MAT-"
                ),
                rollout_id,
                artikel_typ,
                item["artikel_code"],
                item["menge"],
                default_bestellstatus(payload["material_status"]),
                pso_nummer,
                auftragsnummer,
                item["hinweis"],
            ),
        )

    for artikel_typ, row in existing.items():
        if artikel_typ not in desired:
            connection.execute(
                "delete from materialbedarf where materialbedarf_id = ?",
                (row["materialbedarf_id"],),
            )


def build_managed_tasks(payload: dict) -> list[dict]:
    tasks: list[dict] = []

    if payload["material_status"] != "komplett":
        tasks.append(
            {
                "task_typ": "Bestellung",
                "titel": "Materialbedarf pruefen und bestellen",
                "status": "blockiert"
                if payload["material_status"] == "spezialteil offen"
                else "offen",
                "prioritaet": "hoch",
                "owner_rolle": "Einkauf",
                "faellig_am": due_date(payload["installationsdatum"], 7),
                "hinweis": f"Materialstatus aus Bemusterung: {payload['material_status']}",
            }
        )

    if payload["cms_status"] != "geprueft":
        tasks.append(
            {
                "task_typ": "Konfig",
                "titel": "CMS- und Player-Konfiguration abschliessen",
                "status": "offen",
                "prioritaet": "hoch",
                "owner_rolle": "Konfig",
                "faellig_am": due_date(payload["installationsdatum"], 3),
                "hinweis": f"CMS-Status aus Bemusterung: {payload['cms_status']}",
            }
        )

    prep_notes = []
    if payload["anmeldung_noetig"]:
        prep_notes.append(payload["anmeldung_hinweis"] or "Anmeldung erforderlich")
    if payload["hohldecke"]:
        prep_notes.append("Hohldecke beachten")
    if payload["montagefenster"]:
        prep_notes.append(f"Fenster: {payload['montagefenster']}")
    if payload["bemerkung"]:
        prep_notes.append(payload["bemerkung"])

    if prep_notes:
        tasks.append(
            {
                "task_typ": "Montagevorbereitung",
                "titel": "Montagefenster und Sonderpunkte absichern",
                "status": "offen",
                "prioritaet": "mittel",
                "owner_rolle": "Montageplanung",
                "faellig_am": due_date(payload["installationsdatum"], 2),
                "hinweis": " | ".join(prep_notes),
            }
        )

    return tasks


def sync_managed_tasks(
    connection: sqlite3.Connection, rollout_id: str, payload: dict
) -> None:
    rows = connection.execute(
        """
        select *
        from tasks
        where rollout_id = ?
          and quelle = 'Bemusterungsformular'
        """,
        (rollout_id,),
    ).fetchall()
    existing = {row["task_typ"]: dict(row) for row in rows}
    desired = {task["task_typ"]: task for task in build_managed_tasks(payload)}

    for task_typ, task in desired.items():
        row = existing.get(task_typ)
        if row:
            connection.execute(
                """
                update tasks
                set titel = ?,
                    status = ?,
                    prioritaet = ?,
                    owner_rolle = ?,
                    faellig_am = ?,
                    hinweis = ?
                where task_id = ?
                """,
                (
                    task["titel"],
                    task["status"],
                    task["prioritaet"],
                    task["owner_rolle"],
                    task["faellig_am"],
                    task["hinweis"],
                    row["task_id"],
                ),
            )
            continue

        connection.execute(
            """
            insert into tasks (
                task_id,
                rollout_id,
                task_typ,
                titel,
                status,
                prioritaet,
                owner_rolle,
                faellig_am,
                quelle,
                hinweis
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                next_prefixed_id(connection, "tasks", "task_id", "TASK-"),
                rollout_id,
                task_typ,
                task["titel"],
                task["status"],
                task["prioritaet"],
                task["owner_rolle"],
                task["faellig_am"],
                "Bemusterungsformular",
                task["hinweis"],
            ),
        )

    for task_typ, row in existing.items():
        if task_typ not in desired:
            connection.execute("delete from tasks where task_id = ?", (row["task_id"],))


def save_standort(
    connection: sqlite3.Connection,
    raw_payload: dict,
    allow_existing: bool,
    standort_id_override: str | None = None,
) -> dict:
    payload = normalize_payload(raw_payload, standort_id_override=standort_id_override)
    existing_standort = fetch_one(
        connection,
        "select * from standorte where standort_id = ?",
        (payload["standort_id"],),
    )
    existing_rollout = fetch_one(
        connection,
        "select * from rollouts where standort_id = ?",
        (payload["standort_id"],),
    )

    if existing_standort and not allow_existing:
        raise ApiError("Standort-ID existiert bereits. Bitte Bearbeiten verwenden.", 409)
    if standort_id_override and not existing_standort:
        raise ApiError("Standort wurde nicht gefunden.", 404)

    if existing_standort:
        connection.execute(
            """
            update standorte
            set filiale_name = ?,
                strasse = ?,
                plz = ?,
                ort = ?,
                kanton = ?,
                kontaktperson = ?,
                telefon = ?,
                anmeldung_noetig = ?,
                anmeldung_hinweis = ?,
                montagefenster = ?,
                parkplatz_hinweis = ?
            where standort_id = ?
            """,
            (
                payload["filiale_name"],
                payload["strasse"],
                payload["plz"],
                payload["ort"],
                payload["kanton"],
                payload["kontaktperson"],
                payload["telefon"],
                payload["anmeldung_noetig"],
                payload["anmeldung_hinweis"],
                payload["montagefenster"],
                payload["parkplatz_hinweis"],
                payload["standort_id"],
            ),
        )
    else:
        connection.execute(
            """
            insert into standorte (
                standort_id,
                filiale_name,
                strasse,
                plz,
                ort,
                kanton,
                kontaktperson,
                telefon,
                anmeldung_noetig,
                anmeldung_hinweis,
                montagefenster,
                parkplatz_hinweis
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["standort_id"],
                payload["filiale_name"],
                payload["strasse"],
                payload["plz"],
                payload["ort"],
                payload["kanton"],
                payload["kontaktperson"],
                payload["telefon"],
                payload["anmeldung_noetig"],
                payload["anmeldung_hinweis"],
                payload["montagefenster"],
                payload["parkplatz_hinweis"],
            ),
        )

    if existing_rollout:
        rollout_id = existing_rollout["rollout_id"]
        connection.execute(
            """
            update rollouts
            set rollout_typ = ?,
                screen_typ = ?,
                halterung_typ = ?,
                ip_power = ?,
                player_typ = ?,
                hohldecke = ?,
                anzahl_personen = ?,
                zeitbedarf_min = ?,
                cms_status = ?,
                material_status = ?,
                prozess_status = ?,
                installationsdatum = ?,
                cluster = ?,
                team = ?,
                bemerkung = ?
            where rollout_id = ?
            """,
            (
                payload["rollout_typ"],
                payload["screen_typ"],
                payload["halterung_typ"],
                payload["ip_power"],
                payload["player_typ"],
                payload["hohldecke"],
                payload["anzahl_personen"],
                payload["zeitbedarf_min"],
                payload["cms_status"],
                payload["material_status"],
                payload["prozess_status"],
                payload["installationsdatum"],
                payload["cluster"],
                payload["team"],
                payload["bemerkung"],
                rollout_id,
            ),
        )
    else:
        rollout_id = next_prefixed_id(connection, "rollouts", "rollout_id", "RO-")
        connection.execute(
            """
            insert into rollouts (
                rollout_id,
                standort_id,
                rollout_typ,
                screen_typ,
                halterung_typ,
                ip_power,
                player_typ,
                hohldecke,
                anzahl_personen,
                zeitbedarf_min,
                cms_status,
                material_status,
                prozess_status,
                installationsdatum,
                cluster,
                team,
                bemerkung
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rollout_id,
                payload["standort_id"],
                payload["rollout_typ"],
                payload["screen_typ"],
                payload["halterung_typ"],
                payload["ip_power"],
                payload["player_typ"],
                payload["hohldecke"],
                payload["anzahl_personen"],
                payload["zeitbedarf_min"],
                payload["cms_status"],
                payload["material_status"],
                payload["prozess_status"],
                payload["installationsdatum"],
                payload["cluster"],
                payload["team"],
                payload["bemerkung"],
            ),
        )

    sync_materialbedarf(connection, rollout_id, payload)
    sync_managed_tasks(connection, rollout_id, payload)

    return {
        "standort_id": payload["standort_id"],
        "rollout_id": rollout_id,
        "action": "updated" if existing_standort else "created",
    }


def detect_csv_dialect(csv_text: str) -> csv.Dialect:
    sample = csv_text[:2048]
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;")
    except csv.Error:
        class Fallback(csv.excel):
            delimiter = ","

        return Fallback


def import_csv(connection: sqlite3.Connection, csv_text: str) -> dict:
    stripped = csv_text.lstrip("\ufeff").strip()
    if not stripped:
        raise ApiError("Die CSV-Datei ist leer.")

    reader = csv.DictReader(io.StringIO(stripped), dialect=detect_csv_dialect(stripped))
    if not reader.fieldnames:
        raise ApiError("Die CSV-Datei enthaelt keine Kopfzeile.")

    missing_columns = [
        column for column in ("standort_id", "filiale_name", "ort", "screen_typ", "halterung_typ", "player_typ")
        if column not in reader.fieldnames
    ]
    if missing_columns:
        raise ApiError(
            "Im Import fehlen Pflichtspalten: " + ", ".join(missing_columns)
        )

    created = 0
    updated = 0
    standort_ids: list[str] = []

    for row_number, row in enumerate(reader, start=2):
        if not any(clean_text(value) for value in row.values()):
            continue

        try:
            result = save_standort(connection, row, allow_existing=True)
        except ApiError as exc:
            raise ApiError(f"Fehler in CSV-Zeile {row_number}: {exc.message}") from exc

        standort_ids.append(result["standort_id"])
        if result["action"] == "created":
            created += 1
        else:
            updated += 1

    if not standort_ids:
        raise ApiError("Die CSV-Datei enthaelt keine verwertbaren Datenzeilen.")

    return {
        "imported": len(standort_ids),
        "created": created,
        "updated": updated,
        "standort_ids": standort_ids,
    }


def build_material_export(standort_id: str) -> dict:
    connection = get_connection()
    try:
        standort = fetch_one(
            connection,
            "select * from standorte where standort_id = ?",
            (standort_id,),
        )
        rollout = fetch_one(
            connection,
            "select * from rollouts where standort_id = ?",
            (standort_id,),
        )
        if not standort or not rollout:
            return {}

        material_rows = connection.execute(
            """
            select *
            from materialbedarf
            where rollout_id = ?
            order by
                case artikel_typ
                    when 'Screen' then 1
                    when 'Halterung' then 2
                    when 'IP Power' then 3
                    when 'Player' then 4
                    else 9
                end,
                artikel_code
            """,
            (rollout["rollout_id"],),
        ).fetchall()
        material = [dict(row) for row in material_rows]
        if not material:
            return {}

        pso_nummer = clean_text(material[0]["pso_nummer"])
        auftragsnummer = clean_text(material[0]["auftragsnummer"])
        return {
            "standort": standort,
            "rollout": rollout,
            "materialbedarf": material,
            "pso_nummer": pso_nummer or None,
            "auftragsnummer": auftragsnummer or None,
        }
    finally:
        connection.close()


def build_detail(standort_id: str) -> dict:
    standort_rows = fetch_all(
        "select * from standorte where standort_id = ?",
        (standort_id,),
    )
    if not standort_rows:
        return {}

    rollout_rows = fetch_all(
        "select * from rollouts where standort_id = ?",
        (standort_id,),
    )
    rollout = rollout_rows[0] if rollout_rows else None
    rollout_id = rollout["rollout_id"] if rollout else None

    tasks = (
        fetch_all(
            """
            select * from tasks
            where rollout_id = ?
            order by
                case prioritaet
                    when 'hoch' then 1
                    when 'mittel' then 2
                    else 3
                end,
                faellig_am
            """,
            (rollout_id,),
        )
        if rollout_id
        else []
    )

    material = (
        fetch_all(
            """
            select * from materialbedarf
            where rollout_id = ?
            order by
                case artikel_typ
                    when 'Screen' then 1
                    when 'Halterung' then 2
                    when 'IP Power' then 3
                    when 'Player' then 4
                    else 9
                end,
                artikel_code
            """,
            (rollout_id,),
        )
        if rollout_id
        else []
    )

    return {
        "standort": standort_rows[0],
        "rollout": rollout,
        "tasks": tasks,
        "materialbedarf": material,
        "erp_export": build_material_export(standort_id),
    }


def build_dataset() -> dict:
    return {
        "standorte": fetch_all("select * from standorte order by standort_id"),
        "rollouts": fetch_all(
            "select * from rollouts order by installationsdatum, standort_id"
        ),
        "tasks": fetch_all("select * from tasks order by faellig_am, task_id"),
        "materialbedarf": fetch_all(
            "select * from materialbedarf order by rollout_id, artikel_typ"
        ),
        "touren": fetch_all("select * from touren order by datum, tour_id"),
        "tour_stopps": fetch_all(
            "select * from tour_stopps order by tour_id, reihenfolge"
        ),
        "rollout_board": fetch_all("select * from rollout_board"),
        "einkauf_offen": fetch_all("select * from einkauf_offen"),
        "konfig_offen": fetch_all("select * from konfig_offen"),
        "touren_freigabe": fetch_all("select * from touren_freigabe"),
    }


def build_material_csv(payload: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    standort = payload["standort"]
    rollout = payload["rollout"]

    writer.writerow(
        [
            "standort_id",
            "filiale_name",
            "ort",
            "strasse",
            "plz",
            "pso_nummer",
            "auftragsnummer",
            "rollout_typ",
            "artikel_typ",
            "artikel_code",
            "menge",
            "bestellstatus",
            "hinweis",
        ]
    )
    for item in payload["materialbedarf"]:
        writer.writerow(
            [
                standort["standort_id"],
                standort["filiale_name"],
                standort["ort"],
                standort["strasse"] or "",
                standort["plz"] or "",
                payload["pso_nummer"] or "",
                payload["auftragsnummer"] or "",
                rollout["rollout_typ"] or "",
                item["artikel_typ"],
                item["artikel_code"],
                item["menge"],
                item["bestellstatus"],
                item["hinweis"] or "",
            ]
        )
    return output.getvalue()


def render_material_page(payload: dict) -> str:
    standort = payload["standort"]
    rollout = payload["rollout"]
    material_rows = "".join(
        """
        <tr>
          <td>{artikel_typ}</td>
          <td>{artikel_code}</td>
          <td>{menge}</td>
          <td>{bestellstatus}</td>
          <td>{hinweis}</td>
        </tr>
        """.format(
            artikel_typ=html.escape(str(item["artikel_typ"])),
            artikel_code=html.escape(str(item["artikel_code"])),
            menge=html.escape(str(item["menge"])),
            bestellstatus=html.escape(str(item["bestellstatus"])),
            hinweis=html.escape(item["hinweis"] or "-"),
        )
        for item in payload["materialbedarf"]
    )

    headline = " ".join(
        filter(None, [payload.get("pso_nummer"), payload.get("auftragsnummer")])
    )
    address = ", ".join(
        filter(
            None,
            [
                standort.get("strasse"),
                " ".join(filter(None, [standort.get("plz"), standort.get("ort")])),
            ],
        )
    )
    if not address:
        address = standort.get("ort") or "-"

    info_boxes = [
        ("Standort-ID", standort.get("standort_id") or "-"),
        ("Filiale", standort.get("filiale_name") or "-"),
        ("PSO-Nummer", payload.get("pso_nummer") or "-"),
        ("Auftragsnummer", payload.get("auftragsnummer") or "-"),
        ("Rollout", rollout.get("rollout_typ") or "-"),
        ("Installation", rollout.get("installationsdatum") or "-"),
    ]
    info_boxes_html = "".join(
        """
        <article class="meta-card">
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
        """.format(label=html.escape(label), value=html.escape(str(value)))
        for label, value in info_boxes
    )

    return """<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ERP Material {standort_id}</title>
    <style>
      :root {{
        --bg: #f4efe5;
        --surface: rgba(255, 253, 248, 0.92);
        --surface-alt: #f6f1e7;
        --line: #dccfb9;
        --ink: #23302b;
        --muted: #5d665f;
        --accent: #0d5c63;
        --shadow: 0 18px 40px rgba(45, 36, 21, 0.08);
        --radius: 24px;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        min-height: 100vh;
        padding: 28px;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(13, 92, 99, 0.12), transparent 28%),
          radial-gradient(circle at top right, rgba(173, 107, 0, 0.10), transparent 24%),
          linear-gradient(180deg, #fbf8f1 0%, var(--bg) 100%);
      }}
      .page {{
        max-width: 1120px;
        margin: 0 auto;
        display: grid;
        gap: 18px;
      }}
      .hero,
      .content-card,
      .meta-card {{
        background: var(--surface);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }}
      .hero {{
        border-radius: 32px;
        padding: 26px 28px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
      }}
      .eyebrow {{
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
      }}
      h1 {{
        margin: 0;
        font-size: clamp(36px, 5vw, 56px);
        line-height: 0.94;
        font-family: "Avenir Next Condensed", "Franklin Gothic Medium", "Arial Narrow", sans-serif;
      }}
      .subline {{
        margin: 10px 0 0;
        font-size: clamp(18px, 2.4vw, 28px);
        color: var(--muted);
      }}
      .actions {{
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }}
      .button {{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 200px;
        padding: 16px 20px;
        border-radius: 22px;
        border: 1px solid #cfdedc;
        background: rgba(255, 255, 255, 0.78);
        color: var(--ink);
        text-decoration: none;
        font-size: 20px;
      }}
      .meta-grid {{
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }}
      .meta-card {{
        border-radius: 22px;
        padding: 16px 18px;
      }}
      .meta-card span {{
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }}
      .meta-card strong {{
        display: block;
        font-size: 20px;
      }}
      .content-card {{
        border-radius: 28px;
        padding: 22px 24px;
      }}
      .content-card h2 {{
        margin: 0 0 14px;
        font-size: 24px;
      }}
      table {{
        width: 100%;
        border-collapse: collapse;
      }}
      th,
      td {{
        padding: 14px 12px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
      }}
      th {{
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }}
      tbody tr:last-child td {{
        border-bottom: none;
      }}
      .footnote {{
        margin: 0;
        color: var(--muted);
        font-size: 14px;
      }}
      @media (max-width: 900px) {{
        body {{ padding: 18px; }}
        .hero {{
          flex-direction: column;
          border-radius: 26px;
        }}
        .meta-grid {{
          grid-template-columns: 1fr;
        }}
        .button {{
          min-width: 0;
          width: 100%;
        }}
        table,
        thead,
        tbody,
        th,
        td,
        tr {{
          display: block;
        }}
        thead {{
          display: none;
        }}
        tr {{
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
        }}
        td {{
          border: none;
          padding: 6px 0;
        }}
      }}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div>
          <span class="eyebrow">Detail</span>
          <h1>{headline}</h1>
          <p class="subline">{address}</p>
        </div>
        <div class="actions">
          <a class="button" href="/">Zur App</a>
          <a class="button" href="/api/export/material/{quoted_standort_id}.csv">CSV exportieren</a>
        </div>
      </section>

      <section class="meta-grid">
        {info_boxes_html}
      </section>

      <section class="content-card">
        <h2>Materialliste fuer ERP</h2>
        <table>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Artikel</th>
              <th>Menge</th>
              <th>Status</th>
              <th>Hinweis</th>
            </tr>
          </thead>
          <tbody>
            {material_rows}
          </tbody>
        </table>
      </section>

      <section class="content-card">
        <h2>Standortkontext</h2>
        <p class="footnote">
          Standort {standort_id} · {filiale_name} · Kontakt {kontaktperson} · Fenster {montagefenster}
        </p>
      </section>
    </main>
  </body>
</html>
""".format(
        standort_id=html.escape(standort.get("standort_id") or "-"),
        headline=html.escape(headline or (standort.get("standort_id") or "-")),
        address=html.escape(address),
        quoted_standort_id=html.escape(standort.get("standort_id") or "-"),
        info_boxes_html=info_boxes_html,
        material_rows=material_rows,
        filiale_name=html.escape(standort.get("filiale_name") or "-"),
        kontaktperson=html.escape(standort.get("kontaktperson") or "-"),
        montagefenster=html.escape(standort.get("montagefenster") or "-"),
    )


class DemoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        try:
            if parsed.path == "/api/health":
                self.send_json({"status": "ok", "db_path": str(DB_PATH)})
                return

            if parsed.path == "/api/dataset":
                self.send_json(build_dataset())
                return

            if parsed.path.startswith("/erp/material/"):
                standort_id = unquote(parsed.path.rsplit("/", 1)[-1])
                payload = build_material_export(standort_id)
                if not payload:
                    raise ApiError("Standort wurde nicht gefunden.", 404)
                self.send_html(render_material_page(payload))
                return

            if parsed.path.startswith("/api/export/material/") and parsed.path.endswith(
                ".csv"
            ):
                standort_id = unquote(parsed.path.rsplit("/", 1)[-1].removesuffix(".csv"))
                payload = build_material_export(standort_id)
                if not payload:
                    raise ApiError("Standort wurde nicht gefunden.", 404)
                filename = f"material-{standort_id}.csv"
                self.send_csv(build_material_csv(payload), filename)
                return

            if parsed.path.startswith("/api/standort/"):
                standort_id = unquote(parsed.path.rsplit("/", 1)[-1])
                payload = build_detail(standort_id)
                if not payload:
                    raise ApiError("Standort wurde nicht gefunden.", 404)
                self.send_json(payload)
                return
        except ApiError as error:
            self.send_json({"error": error.message}, status=error.status)
            return

        return super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        try:
            if parsed.path == "/api/standort":
                payload = self.read_json_body()
                connection = get_connection()
                try:
                    result = save_standort(connection, payload, allow_existing=False)
                    connection.commit()
                finally:
                    connection.close()
                self.send_json(result, status=201)
                return

            if parsed.path == "/api/import/csv":
                payload = self.read_json_body()
                csv_text = clean_text(payload.get("csv_text"))
                connection = get_connection()
                try:
                    result = import_csv(connection, csv_text)
                    connection.commit()
                finally:
                    connection.close()
                self.send_json(result, status=201)
                return
        except ApiError as error:
            self.send_json({"error": error.message}, status=error.status)
            return

        self.send_json({"error": "not_found"}, status=404)

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/standort/"):
            self.send_json({"error": "not_found"}, status=404)
            return

        standort_id = unquote(parsed.path.rsplit("/", 1)[-1])

        try:
            payload = self.read_json_body()
            connection = get_connection()
            try:
                result = save_standort(
                    connection,
                    payload,
                    allow_existing=True,
                    standort_id_override=standort_id,
                )
                connection.commit()
            finally:
                connection.close()
            self.send_json(result)
        except ApiError as error:
            self.send_json({"error": error.message}, status=error.status)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length") or "0")
        raw_body = self.rfile.read(content_length) if content_length else b"{}"
        if not raw_body:
            return {}

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ApiError("Request-Body ist kein gueltiges JSON.") from exc

        if not isinstance(payload, dict):
            raise ApiError("Request-Body muss ein JSON-Objekt sein.")
        return payload

    def send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_csv(self, body_text: str, filename: str) -> None:
        body = body_text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, body_text: str, status: int = 200) -> None:
        body = body_text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(
            f"Local database not found at {DB_PATH}. Run build_local_db.py first."
        )

    server = ThreadingHTTPServer((HOST, PORT), DemoHandler)
    print(f"Serving demo app on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()

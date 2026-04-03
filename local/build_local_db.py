from pathlib import Path
import sqlite3


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "rollout_demo.db"
SQL_PATH = BASE_DIR / "01_schema_and_seed.sql"


def main() -> None:
    sql = SQL_PATH.read_text(encoding="utf-8")

    if DB_PATH.exists():
        DB_PATH.unlink()

    connection = sqlite3.connect(DB_PATH)
    try:
        connection.executescript(sql)
        connection.commit()
    finally:
        connection.close()

    print(f"Created local demo DB at {DB_PATH}")


if __name__ == "__main__":
    main()

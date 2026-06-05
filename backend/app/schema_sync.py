"""
Align existing PostgreSQL tables with SQLAlchemy models.

`Base.metadata.create_all()` only creates missing tables; it does not add new
columns when a table already exists (e.g. persistent docker volumes).
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _add_column_sql_postgresql(table_name: str, col, dialect) -> str:
    type_sql = col.type.compile(dialect=dialect)
    parts = [
        f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col.name}",
        type_sql,
    ]
    if col.nullable:
        if col.server_default is not None:
            default_sql = str(col.server_default.compile(dialect=dialect))
            parts.append("NULL DEFAULT")
            parts.append(default_sql)
        else:
            parts.append("NULL")
    elif col.server_default is not None:
        default_sql = str(col.server_default.compile(dialect=dialect))
        parts.append("NOT NULL DEFAULT")
        parts.append(default_sql)
    else:
        arg = getattr(col.default, "arg", None) if col.default is not None else None
        if arg is not None and not callable(arg):
            if isinstance(arg, str):
                parts.append(f"NOT NULL DEFAULT '{arg}'")
            elif isinstance(arg, bool):
                parts.append(f"NOT NULL DEFAULT {'true' if arg else 'false'}")
            else:
                parts.append(f"NOT NULL DEFAULT {arg}")
        else:
            parts.append("NULL")
    return " ".join(parts)


def apply_missing_columns(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return

    from app.database import Base

    insp = inspect(engine)
    dialect = engine.dialect

    with engine.begin() as conn:
        for table_name, table in Base.metadata.tables.items():
            if not insp.has_table(table_name):
                continue
            existing = {c["name"] for c in insp.get_columns(table_name)}
            for col in table.columns:
                if col.name in existing:
                    continue
                sql = _add_column_sql_postgresql(table_name, col, dialect)
                conn.execute(text(sql))

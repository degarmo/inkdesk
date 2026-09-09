"""Keep Django-owned tables out of the Prisma ``public`` schema.

Prisma ``migrate deploy`` on a fresh database refuses to run if ``public``
already has tables (P3005). Render may start ``inkdesk-api`` before Next
applies Prisma migrations. Creating Django tables in the ``django`` schema
leaves ``public`` empty for Prisma's baseline, while unmanaged models still
read ``public."Shop"`` (and the rest) via ``search_path=django,public``.
"""

from django.db.backends.signals import connection_created
from django.dispatch import receiver

DJANGO_SCHEMA = "django"


def ensure_django_schema(conn):
    if getattr(conn, "vendor", None) != "postgresql":
        return
    if getattr(conn, "_inkdesk_django_schema", False):
        return
    dbname = ((getattr(conn, "settings_dict", None) or {}).get("NAME") or "")
    if isinstance(dbname, str) and dbname.lower() in {"postgres", "template0", "template1"}:
        return
    with conn.cursor() as cursor:
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {DJANGO_SCHEMA}")
        cursor.execute("SET search_path TO django, public")
    conn._inkdesk_django_schema = True


@receiver(connection_created)
def _on_connection_created(sender, connection, **kwargs):
    ensure_django_schema(connection)

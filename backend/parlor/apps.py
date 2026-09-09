from django.apps import AppConfig


class ParlorConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "parlor"
    verbose_name = "Parlor"

    def ready(self):
        from parlor import db  # noqa: F401 — connection_created → django schema

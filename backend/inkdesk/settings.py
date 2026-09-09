"""Django settings for the Inkdesk API (Phase 1).

PostgreSQL only. The same DATABASE_URL Prisma uses (local Docker or Render
inkdesk-db). SQLite is rejected on purpose.
"""

import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

env = environ.Env()
# Process env (Render) wins. Files fill gaps. Repo .env shares DATABASE_URL with Next/Prisma.
environ.Env.read_env(REPO_ROOT / ".env")
environ.Env.read_env(BASE_DIR / ".env")


def _clean_database_url(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        raise ImproperlyConfigured(
            "DATABASE_URL is required. The Django API uses PostgreSQL only. "
            "See backend/.env.example and the repo-root .env.example."
        )
    scheme = value.split(":", 1)[0].lower()
    if value.startswith("file:") or scheme in {"sqlite", "sqlite3"}:
        raise ImproperlyConfigured(
            "DATABASE_URL points at SQLite. Use the same PostgreSQL URL as Prisma "
            "(Docker Compose or Render inkdesk-db)."
        )
    if value.startswith("postgres://"):
        value = "postgresql://" + value[len("postgres://") :]
    parsed = urlparse(value)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ImproperlyConfigured(
            f"DATABASE_URL must be PostgreSQL, got scheme {parsed.scheme!r}."
        )
    # Prisma accepts ?schema=public; libpq/psycopg does not.
    query = [
        (key, val)
        for key, val in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() != "schema"
    ]
    return urlunparse(parsed._replace(query=urlencode(query)))


SECRET_KEY = env.str("DJANGO_SECRET_KEY", default=None) or env.str("SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
render_hostname = env.str("RENDER_EXTERNAL_HOSTNAME", default="")
if render_hostname:
    ALLOWED_HOSTS.append(render_hostname)
if ".onrender.com" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(".onrender.com")

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
if render_hostname:
    CSRF_TRUSTED_ORIGINS.append(f"https://{render_hostname}")

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:43147", "http://127.0.0.1:43147"],
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "parlor.apps.ParlorConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "inkdesk.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "inkdesk.wsgi.application"

DATABASES = {
    "default": environ.Env.db_url_config(_clean_database_url(env.str("DATABASE_URL", default=""))),
}
DATABASES["default"]["CONN_MAX_AGE"] = 0 if "test" in sys.argv else env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
# Prisma owns public. Django-owned tables go to the django schema (see parlor/db.py).
_db_options = DATABASES["default"].setdefault("OPTIONS", {})
_existing_options = _db_options.get("options", "")
if "search_path" not in _existing_options:
    _db_options["options"] = f"-c search_path=django,public {_existing_options}".strip()

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_ROOT.mkdir(parents=True, exist_ok=True)
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "parlor.authentication.ShopTokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

if DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ]

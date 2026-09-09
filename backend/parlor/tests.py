import bcrypt
from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from inkdesk.settings import _clean_database_url
from parlor.models import Appointment, Artist, Client, Shop, ShopUser
from parlor.passwords import check_password

DOMAIN_MODELS = (Shop, ShopUser, Artist, Client, Appointment)


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=4)).decode("utf-8")


class DatabaseUrlTests(SimpleTestCase):
    def test_rejects_sqlite_file_url(self):
        with self.assertRaises(ImproperlyConfigured):
            _clean_database_url("file:./dev.db")

    def test_rejects_empty(self):
        with self.assertRaises(ImproperlyConfigured):
            _clean_database_url("")

    def test_strips_prisma_schema_query(self):
        cleaned = _clean_database_url(
            "postgresql://inkdesk:inkdesk@localhost:5432/inkdesk?schema=public"
        )
        self.assertNotIn("schema", cleaned)
        self.assertIn("localhost:5432", cleaned)

    def test_rewrites_postgres_scheme(self):
        cleaned = _clean_database_url("postgres://inkdesk:inkdesk@localhost:5432/inkdesk")
        self.assertTrue(cleaned.startswith("postgresql://"))


class PasswordTests(SimpleTestCase):
    def test_bcryptjs_compatible_hash(self):
        hashed = _hash("parlor-demo")
        self.assertTrue(check_password("parlor-demo", hashed))
        self.assertFalse(check_password("wrong", hashed))
        self.assertFalse(check_password("parlor-demo", ""))
        self.assertFalse(check_password("", hashed))


class ParlorApiTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with connection.schema_editor() as editor:
            for model in DOMAIN_MODELS:
                editor.create_model(model)

    @classmethod
    def tearDownClass(cls):
        with connection.schema_editor() as editor:
            for model in reversed(DOMAIN_MODELS):
                editor.delete_model(model)
        super().tearDownClass()

    def setUp(self):
        now = timezone.now()
        self.shop = Shop.objects.create(
            id="shop_blackbird",
            name="Blackbird Ink",
            timezone="America/Los_Angeles",
            hours_open="11:00",
            hours_close="20:00",
            onboarding_completed_at=now,
            onboarding_step=6,
            created_at=now,
            updated_at=now,
        )
        other = Shop.objects.create(
            id="shop_harbor",
            name="Harbor Needle",
            timezone="America/New_York",
            hours_open="11:00",
            hours_close="20:00",
            onboarding_completed_at=now,
            onboarding_step=6,
            created_at=now,
            updated_at=now,
        )
        self.password = "parlor-demo"
        self.user = ShopUser.objects.create(
            id="user_maya",
            email="demo@blackbird.ink",
            password_hash=_hash(self.password),
            name="Maya Chen",
            role="owner",
            active=True,
            shop=self.shop,
            created_at=now,
        )
        ShopUser.objects.create(
            id="user_inactive",
            email="gone@blackbird.ink",
            password_hash=_hash(self.password),
            name="Gone",
            role="staff",
            active=False,
            shop=self.shop,
            created_at=now,
        )
        artist = Artist.objects.create(
            id="artist_diego",
            shop=self.shop,
            name="Diego Reyes",
            specialty="blackwork",
            active=True,
            created_at=now,
            updated_at=now,
        )
        self.client_row = Client.objects.create(
            id="client_priya",
            shop=self.shop,
            name="Priya Nair",
            phone="555-0100",
            email="priya@example.com",
            notes="",
            tags='["regular"]',
            created_at=now,
            updated_at=now,
        )
        Client.objects.create(
            id="client_other",
            shop=other,
            name="Other Shop Client",
            phone="",
            email="",
            notes="",
            tags="[]",
            created_at=now,
            updated_at=now,
        )
        Appointment.objects.create(
            id="appt_1",
            shop=self.shop,
            client=self.client_row,
            artist=artist,
            start_at=now,
            duration_min=90,
            service_type="tattoo",
            status="scheduled",
            deposit_cents=5000,
            deposit_paid=True,
            created_at=now,
            updated_at=now,
        )
        self.api = APIClient()

    def _login(self, email="demo@blackbird.ink", password=None):
        response = self.api.post(
            "/api/auth/login/",
            {"email": email, "password": password or self.password},
            format="json",
        )
        return response

    def test_health_ok(self):
        response = self.api.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_login_and_shop_scoped_clients(self):
        response = self._login()
        self.assertEqual(response.status_code, 200)
        token = response.json()["token"]
        self.assertTrue(token)
        self.assertEqual(response.json()["user"]["email"], "demo@blackbird.ink")
        self.assertEqual(response.json()["user"]["shop"]["name"], "Blackbird Ink")

        self.api.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        listed = self.api.get("/api/clients/")
        self.assertEqual(listed.status_code, 200)
        names = [row["name"] for row in listed.json()["results"]]
        self.assertIn("Priya Nair", names)
        self.assertNotIn("Other Shop Client", names)
        self.assertEqual(listed.json()["results"][0]["tags"], ["regular"])

        detail = self.api.get(f"/api/clients/{self.client_row.id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["id"], "client_priya")

        foreign = self.api.get("/api/clients/client_other/")
        self.assertEqual(foreign.status_code, 404)

        appointments = self.api.get("/api/appointments/")
        self.assertEqual(appointments.status_code, 200)
        self.assertEqual(len(appointments.json()["results"]), 1)
        self.assertEqual(appointments.json()["results"][0]["client"]["name"], "Priya Nair")
        self.assertEqual(appointments.json()["results"][0]["artist"]["name"], "Diego Reyes")

        me = self.api.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["role"], "owner")

    def test_clients_require_auth(self):
        response = self.api.get("/api/clients/")
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_bad_password(self):
        response = self._login(password="nope")
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_inactive(self):
        response = self._login(email="gone@blackbird.ink")
        self.assertEqual(response.status_code, 401)

    def test_client_search(self):
        token = self._login().json()["token"]
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        response = self.api.get("/api/clients/", {"q": "Priya"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)
        miss = self.api.get("/api/clients/", {"q": "zzzz"})
        self.assertEqual(miss.json()["results"], [])

"""Prisma-owned domain tables plus one Django-owned token table.

Phase 1 schema ownership
------------------------
Prisma remains the source of truth for parlor tables. Those models are
``managed = False`` and use PascalCase ``db_table`` plus camelCase
``db_column`` names that match ``prisma/schema.prisma`` and
``prisma/migrations/20260909200000_postgres_init`` +
``20260909210000_shop_onboarding`` +
``20260910021500_shop_usage_fee`` +
``20260910024500_artist_user``.

Django ``migrate`` does **not** create or alter those tables. It only
creates Django system tables and ``django_shop_auth_token`` in the
``django`` schema (not ``public``), so a first-time Prisma migrate still
sees an empty public schema.

Seed bridge: parlor rows come from ``npm run db:seed`` (Prisma). This
app does not seed shops, users, or clients.

Phase 2: take ownership (``managed = True``), stop ``prisma migrate
deploy``, then retire Prisma. See the root README.
"""

import secrets

from django.db import models


class UnmanagedPrismaModel(models.Model):
    """Maps an existing Prisma table. Django must not CREATE/DROP it."""

    class Meta:
        abstract = True
        managed = False


class Shop(UnmanagedPrismaModel):
    id = models.TextField(primary_key=True)
    name = models.TextField()
    timezone = models.TextField(default="America/Los_Angeles")
    hours_open = models.TextField(db_column="hoursOpen", default="11:00")
    hours_close = models.TextField(db_column="hoursClose", default="20:00")
    stripe_publishable_key = models.TextField(db_column="stripePublishableKey", default="", blank=True)
    stripe_secret_key = models.TextField(db_column="stripeSecretKey", default="", blank=True)
    stripe_webhook_secret = models.TextField(db_column="stripeWebhookSecret", default="", blank=True)
    onboarding_completed_at = models.DateTimeField(db_column="onboardingCompletedAt", blank=True, null=True)
    onboarding_step = models.IntegerField(db_column="onboardingStep", default=1)
    usage_fee_percent = models.DecimalField(
        db_column="usageFeePercent",
        max_digits=5,
        decimal_places=1,
        default=0,
    )
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "Shop"

    def __str__(self):
        return self.name


class ShopUser(UnmanagedPrismaModel):
    """Parlor login. Maps Prisma ``User`` — not Django ``auth_user``."""

    id = models.TextField(primary_key=True)
    email = models.TextField(unique=True)
    password_hash = models.TextField(db_column="passwordHash")
    name = models.TextField()
    role = models.TextField(default="owner")
    active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(db_column="lastSeenAt", blank=True, null=True)
    shop = models.ForeignKey(
        Shop,
        models.CASCADE,
        db_column="shopId",
        related_name="users",
    )
    created_at = models.DateTimeField(db_column="createdAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "User"

    def __str__(self):
        return self.email

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return self.active

    def get_username(self):
        return self.email


class PlatformUser(UnmanagedPrismaModel):
    """Inkdesk operator. No shopId. Platform API is Phase 2."""

    id = models.TextField(primary_key=True)
    email = models.TextField(unique=True)
    password_hash = models.TextField(db_column="passwordHash")
    name = models.TextField()
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(db_column="createdAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "PlatformUser"

    def __str__(self):
        return self.email


class Artist(UnmanagedPrismaModel):
    id = models.TextField(primary_key=True)
    shop = models.ForeignKey(Shop, models.CASCADE, db_column="shopId", related_name="artists")
    name = models.TextField()
    specialty = models.TextField(default="", blank=True)
    active = models.BooleanField(default=True)
    user = models.OneToOneField(
        ShopUser,
        models.SET_NULL,
        db_column="userId",
        related_name="artist",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "Artist"

    def __str__(self):
        return self.name


class Client(UnmanagedPrismaModel):
    id = models.TextField(primary_key=True)
    shop = models.ForeignKey(Shop, models.CASCADE, db_column="shopId", related_name="clients")
    name = models.TextField()
    phone = models.TextField(default="", blank=True)
    email = models.TextField(default="", blank=True)
    notes = models.TextField(default="", blank=True)
    tags = models.TextField(default="[]")
    last_visit = models.DateTimeField(db_column="lastVisit", blank=True, null=True)
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "Client"

    def __str__(self):
        return self.name


class Appointment(UnmanagedPrismaModel):
    id = models.TextField(primary_key=True)
    shop = models.ForeignKey(Shop, models.CASCADE, db_column="shopId", related_name="appointments")
    client = models.ForeignKey(Client, models.CASCADE, db_column="clientId", related_name="appointments")
    artist = models.ForeignKey(Artist, models.PROTECT, db_column="artistId", related_name="appointments")
    start_at = models.DateTimeField(db_column="startAt")
    duration_min = models.IntegerField(db_column="durationMin", default=60)
    service_type = models.TextField(db_column="serviceType")
    status = models.TextField(default="scheduled")
    deposit_cents = models.IntegerField(db_column="depositCents", default=0)
    deposit_paid = models.BooleanField(db_column="depositPaid", default=False)
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "Appointment"

    def __str__(self):
        return f"{self.id} ({self.status})"


class SessionNote(UnmanagedPrismaModel):
    id = models.TextField(primary_key=True)
    shop = models.ForeignKey(Shop, models.CASCADE, db_column="shopId", related_name="session_notes")
    client = models.ForeignKey(Client, models.CASCADE, db_column="clientId", related_name="session_notes")
    appointment = models.ForeignKey(
        Appointment,
        models.SET_NULL,
        db_column="appointmentId",
        related_name="session_notes",
        blank=True,
        null=True,
    )
    design_notes = models.TextField(db_column="designNotes", default="", blank=True)
    placement = models.TextField(default="", blank=True)
    ink_colors = models.TextField(db_column="inkColors", default="", blank=True)
    aftercare_given = models.BooleanField(db_column="aftercareGiven", default=False)
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "SessionNote"


class ClientImage(UnmanagedPrismaModel):
    id = models.TextField(primary_key=True)
    shop = models.ForeignKey(Shop, models.CASCADE, db_column="shopId", related_name="images")
    client = models.ForeignKey(Client, models.CASCADE, db_column="clientId", related_name="images")
    appointment = models.ForeignKey(
        Appointment,
        models.SET_NULL,
        db_column="appointmentId",
        related_name="images",
        blank=True,
        null=True,
    )
    kind = models.TextField()
    prep_for_visit = models.BooleanField(db_column="prepForVisit", default=False)
    caption = models.TextField(default="", blank=True)
    storage_key = models.TextField(db_column="storageKey")
    mime_type = models.TextField(db_column="mimeType")
    byte_size = models.IntegerField(db_column="byteSize")
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    uploaded_by = models.ForeignKey(
        ShopUser,
        models.PROTECT,
        db_column="uploadedById",
        related_name="uploaded_images",
    )
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")
    deleted_at = models.DateTimeField(db_column="deletedAt", blank=True, null=True)

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "ClientImage"


class Payment(UnmanagedPrismaModel):
    id = models.TextField(primary_key=True)
    shop = models.ForeignKey(Shop, models.CASCADE, db_column="shopId", related_name="payments")
    appointment = models.ForeignKey(
        Appointment,
        models.SET_NULL,
        db_column="appointmentId",
        related_name="payments",
        blank=True,
        null=True,
    )
    client = models.ForeignKey(
        Client,
        models.SET_NULL,
        db_column="clientId",
        related_name="payments",
        blank=True,
        null=True,
    )
    amount_cents = models.IntegerField(db_column="amountCents")
    currency = models.TextField(default="usd")
    status = models.TextField(default="pending")
    stripe_session_id = models.TextField(db_column="stripeSessionId", blank=True, null=True)
    stripe_payment_intent_id = models.TextField(db_column="stripePaymentIntentId", blank=True, null=True)
    type = models.TextField()
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "Payment"


class IdempotencyKey(UnmanagedPrismaModel):
    key = models.TextField(primary_key=True)
    shop = models.ForeignKey(Shop, models.CASCADE, db_column="shopId", related_name="idempotency_keys")
    kind = models.TextField()
    result_id = models.TextField(db_column="resultId")
    created_at = models.DateTimeField(db_column="createdAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "IdempotencyKey"


class PageView(UnmanagedPrismaModel):
    """First-party visit. shopId is a loose string, not a Prisma FK."""

    id = models.TextField(primary_key=True)
    path = models.TextField()
    shop_id = models.TextField(db_column="shopId", blank=True, null=True)
    session_id = models.TextField(db_column="sessionId")
    surface = models.TextField()
    created_at = models.DateTimeField(db_column="createdAt")

    class Meta(UnmanagedPrismaModel.Meta):
        db_table = "PageView"


class ShopAuthToken(models.Model):
    """Django-owned API token for a Prisma ShopUser. No FK constraint to User.

    Render may boot this service before ``prisma migrate deploy`` has created
    ``User``. A database-level FK would make ``migrate`` fail in that race.
    """

    key = models.CharField(max_length=40, primary_key=True)
    user = models.ForeignKey(
        ShopUser,
        models.CASCADE,
        db_column="user_id",
        db_constraint=False,
        related_name="auth_tokens",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "django_shop_auth_token"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(20)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.key

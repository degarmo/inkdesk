import json

from rest_framework import serializers

from parlor.models import Appointment, Artist, Client, Shop, ShopUser


def _parse_tags(raw: str):
    try:
        value = json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    return []


class ShopPublicSerializer(serializers.ModelSerializer):
    hoursOpen = serializers.CharField(source="hours_open", read_only=True)
    hoursClose = serializers.CharField(source="hours_close", read_only=True)
    onboardingCompletedAt = serializers.DateTimeField(source="onboarding_completed_at", read_only=True)
    onboardingStep = serializers.IntegerField(source="onboarding_step", read_only=True)
    usageFeePercent = serializers.DecimalField(
        source="usage_fee_percent",
        max_digits=5,
        decimal_places=1,
        coerce_to_string=False,
        read_only=True,
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Shop
        fields = (
            "id",
            "name",
            "timezone",
            "hoursOpen",
            "hoursClose",
            "onboardingCompletedAt",
            "onboardingStep",
            "usageFeePercent",
            "createdAt",
            "updatedAt",
        )


class ShopUserSerializer(serializers.ModelSerializer):
    shopId = serializers.CharField(source="shop_id", read_only=True)
    lastSeenAt = serializers.DateTimeField(source="last_seen_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    shop = ShopPublicSerializer(read_only=True)

    class Meta:
        model = ShopUser
        fields = (
            "id",
            "email",
            "name",
            "role",
            "active",
            "shopId",
            "lastSeenAt",
            "createdAt",
            "shop",
        )


class ArtistBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = ("id", "name", "specialty", "active")


class ClientSerializer(serializers.ModelSerializer):
    shopId = serializers.CharField(source="shop_id", read_only=True)
    lastVisit = serializers.DateTimeField(source="last_visit", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = (
            "id",
            "shopId",
            "name",
            "phone",
            "email",
            "notes",
            "tags",
            "lastVisit",
            "createdAt",
            "updatedAt",
        )

    def get_tags(self, obj):
        return _parse_tags(obj.tags)


class AppointmentSerializer(serializers.ModelSerializer):
    shopId = serializers.CharField(source="shop_id", read_only=True)
    clientId = serializers.CharField(source="client_id", read_only=True)
    artistId = serializers.CharField(source="artist_id", read_only=True)
    startAt = serializers.DateTimeField(source="start_at", read_only=True)
    durationMin = serializers.IntegerField(source="duration_min", read_only=True)
    serviceType = serializers.CharField(source="service_type", read_only=True)
    depositCents = serializers.IntegerField(source="deposit_cents", read_only=True)
    depositPaid = serializers.BooleanField(source="deposit_paid", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    client = ClientSerializer(read_only=True)
    artist = ArtistBriefSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "shopId",
            "clientId",
            "artistId",
            "startAt",
            "durationMin",
            "serviceType",
            "status",
            "depositCents",
            "depositPaid",
            "createdAt",
            "updatedAt",
            "client",
            "artist",
        )

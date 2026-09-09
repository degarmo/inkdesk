from django.contrib import admin

from parlor.models import (
    Appointment,
    Artist,
    Client,
    ClientImage,
    Payment,
    PlatformUser,
    Shop,
    ShopAuthToken,
    ShopUser,
)


class ReadOnlyAdmin(admin.ModelAdmin):
    """Prisma owns writes in Phase 1. Inspect only."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Shop)
class ShopAdmin(ReadOnlyAdmin):
    list_display = ("id", "name", "timezone", "onboarding_step", "onboarding_completed_at")
    search_fields = ("name", "id")


@admin.register(ShopUser)
class ShopUserAdmin(ReadOnlyAdmin):
    list_display = ("email", "name", "role", "active", "shop")
    search_fields = ("email", "name")
    list_filter = ("role", "active")


@admin.register(PlatformUser)
class PlatformUserAdmin(ReadOnlyAdmin):
    list_display = ("email", "name", "active", "created_at")
    search_fields = ("email", "name")


@admin.register(Client)
class ClientAdmin(ReadOnlyAdmin):
    list_display = ("name", "email", "phone", "shop")
    search_fields = ("name", "email", "phone")


@admin.register(Artist)
class ArtistAdmin(ReadOnlyAdmin):
    list_display = ("name", "specialty", "active", "shop")


@admin.register(Appointment)
class AppointmentAdmin(ReadOnlyAdmin):
    list_display = ("id", "start_at", "status", "service_type", "shop")
    list_filter = ("status",)


@admin.register(Payment)
class PaymentAdmin(ReadOnlyAdmin):
    list_display = ("id", "amount_cents", "status", "type", "shop")


@admin.register(ClientImage)
class ClientImageAdmin(ReadOnlyAdmin):
    list_display = ("id", "kind", "mime_type", "shop")


@admin.register(ShopAuthToken)
class ShopAuthTokenAdmin(admin.ModelAdmin):
    list_display = ("key", "user", "created_at")
    readonly_fields = ("key", "user", "created_at")

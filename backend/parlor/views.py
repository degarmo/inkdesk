from django.db import connection
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from parlor.models import Appointment, Client, ShopAuthToken, ShopUser
from parlor.passwords import check_password
from parlor.serializers import AppointmentSerializer, ClientSerializer, ShopUserSerializer


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return Response({"status": "ok"})


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""
        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = ShopUser.objects.select_related("shop").filter(email__iexact=email).first()
        if user is None or not user.active or not check_password(password, user.password_hash):
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

        user.last_seen_at = timezone.now()
        user.save(update_fields=["last_seen_at"])

        token = ShopAuthToken.objects.create(user=user)
        return Response(
            {
                "token": token.key,
                "user": ShopUserSerializer(user).data,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = getattr(request, "auth", None)
        if isinstance(token, ShopAuthToken):
            token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = ShopUser.objects.select_related("shop").get(pk=request.user.pk)
        return Response(ShopUserSerializer(user).data)


class ShopScopedMixin:
    def get_shop_id(self):
        return self.request.user.shop_id


class ClientListView(ShopScopedMixin, generics.ListAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Client.objects.filter(shop_id=self.get_shop_id()).order_by("name")
        query = (self.request.query_params.get("q") or "").strip()
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(phone__icontains=query) | Q(email__icontains=query))
        return qs


class ClientDetailView(ShopScopedMixin, generics.RetrieveAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Client.objects.filter(shop_id=self.get_shop_id())


class AppointmentListView(ShopScopedMixin, generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Appointment.objects.filter(shop_id=self.get_shop_id())
            .select_related("client", "artist")
            .order_by("start_at")
        )
        artist_id = (self.request.query_params.get("artistId") or "").strip()
        status_filter = (self.request.query_params.get("status") or "").strip()
        day = (self.request.query_params.get("day") or "").strip()
        start = (self.request.query_params.get("from") or "").strip()
        end = (self.request.query_params.get("to") or "").strip()
        if artist_id:
            qs = qs.filter(artist_id=artist_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if day:
            qs = qs.filter(start_at__date=day)
        if start:
            qs = qs.filter(start_at__gte=start)
        if end:
            qs = qs.filter(start_at__lte=end)
        return qs


class AppointmentDetailView(ShopScopedMixin, generics.RetrieveAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Appointment.objects.filter(shop_id=self.get_shop_id()).select_related("client", "artist")

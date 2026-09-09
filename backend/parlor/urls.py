from django.urls import path

from parlor import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    path("clients/", views.ClientListView.as_view(), name="client-list"),
    path("clients/<str:pk>/", views.ClientDetailView.as_view(), name="client-detail"),
    path("appointments/", views.AppointmentListView.as_view(), name="appointment-list"),
    path("appointments/<str:pk>/", views.AppointmentDetailView.as_view(), name="appointment-detail"),
]

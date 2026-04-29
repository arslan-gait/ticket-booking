from django.urls import path

from .auth_views import StaffMeView, StaffTokenObtainPairView, StaffTokenRefreshView

urlpatterns = [
    path('auth/login/', StaffTokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh/', StaffTokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', StaffMeView.as_view(), name='auth-me'),
]

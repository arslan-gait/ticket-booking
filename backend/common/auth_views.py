from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .auth_constants import IS_ACTIVE_KEY, IS_STAFF_KEY, STAFF_LOGIN_REQUIRED_MESSAGE, USERNAME_KEY, USER_KEY
from .permissions import IsActiveStaffUser


class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        **TokenObtainPairSerializer.default_error_messages,
        'no_active_account': STAFF_LOGIN_REQUIRED_MESSAGE,
    }

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not (user and user.is_active and user.is_staff):
            raise AuthenticationFailed(STAFF_LOGIN_REQUIRED_MESSAGE)

        data[USER_KEY] = {
            USERNAME_KEY: user.get_username(),
            IS_STAFF_KEY: user.is_staff,
            IS_ACTIVE_KEY: user.is_active,
        }
        return data


class StaffTokenObtainPairView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer


class StaffMeView(APIView):
    permission_classes = [IsAuthenticated, IsActiveStaffUser]

    def get(self, request):
        user = request.user
        return Response({
            USERNAME_KEY: user.get_username(),
            IS_STAFF_KEY: user.is_staff,
            IS_ACTIVE_KEY: user.is_active,
        })


class StaffTokenRefreshView(TokenRefreshView):
    pass

from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_active_staff(user) -> bool:
    return bool(user and user.is_authenticated and user.is_active and user.is_staff)


class IsStaffWriteOrReadOnly(BasePermission):
    """
    Allow public read access but require staff privileges for writes.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_active_staff(request.user)


class IsActiveStaffUser(BasePermission):
    """
    Allow only authenticated active staff users.
    """

    def has_permission(self, request, view):
        return is_active_staff(request.user)

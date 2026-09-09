from rest_framework import authentication, exceptions

from parlor.models import ShopAuthToken, ShopUser


class ShopTokenAuthentication(authentication.TokenAuthentication):
    """Authorization: Token <key> for parlor ShopUser rows."""

    keyword = "Token"
    model = ShopAuthToken

    def authenticate_credentials(self, key):
        try:
            token = ShopAuthToken.objects.select_related("user", "user__shop").get(key=key)
        except ShopAuthToken.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Invalid token.") from exc
        user: ShopUser = token.user
        if user is None or not user.active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")
        return (user, token)

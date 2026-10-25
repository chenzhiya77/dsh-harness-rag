"""Static Bearer token authentication for the knowledge service.

The minimal entrypoint exposes no login flow: a configured token is the only
non-browser credential. The token maps to the single-tenant ``default`` admin,
the same identity the auth-disabled bypass uses.
"""

from __future__ import annotations

import os
import secrets
from types import SimpleNamespace

from deerflow.runtime.user_context import DEFAULT_USER_ID

API_TOKEN_ENV_VAR = "DEER_FLOW_API_TOKEN"
API_TOKEN_USER_EMAIL = "api-token@local"


def get_api_token() -> str | None:
    """Return the configured token, or None when unset/blank."""
    token = os.environ.get(API_TOKEN_ENV_VAR, "").strip()
    return token or None


def extract_bearer_token(header: str | None) -> str | None:
    """Return the credential from a ``Bearer`` Authorization header, if any."""
    if not header:
        return None
    scheme, separator, value = header.partition(" ")
    if not separator or scheme.strip().lower() != "bearer":
        return None
    token = value.strip()
    return token or None


def is_valid_api_token(token: str | None) -> bool:
    configured = get_api_token()
    if not token or configured is None:
        return False
    return secrets.compare_digest(token, configured)


def get_api_token_user() -> SimpleNamespace:
    """Return the synthetic single-tenant admin authenticated by the token."""
    return SimpleNamespace(
        id=DEFAULT_USER_ID,
        email=API_TOKEN_USER_EMAIL,
        password_hash=None,
        system_role="admin",
        needs_setup=False,
        token_version=0,
        oauth_provider=None,
    )


def require_api_token_configured() -> None:
    """Refuse to start without a credential unless auth-off is explicit."""
    from app.gateway.auth_disabled import is_auth_disabled

    if is_auth_disabled() or get_api_token():
        return
    raise RuntimeError(f'No API token configured: set {API_TOKEN_ENV_VAR} in backend/.env (generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))") or set DEER_FLOW_AUTH_DISABLED=1 for loopback development.')

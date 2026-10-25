"""Request-time accessors shared by the knowledge routers and auth middleware.

The knowledge service keeps only the configuration and identity readers; the
run-lifecycle accessors that used to live beside them in ``deps.py`` belonged
to the LangGraph gateway surface and were removed with it.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from fastapi import HTTPException, Request

from deerflow.config.app_config import AppConfig, get_app_config

if TYPE_CHECKING:
    from app.gateway.auth.local_provider import LocalAuthProvider
    from app.gateway.auth.repositories.sqlite import SQLiteUserRepository

logger = logging.getLogger(__name__)


def get_config() -> AppConfig:
    """Return the freshest ``AppConfig`` for the current request.

    Routes through :func:`deerflow.config.app_config.get_app_config`, which
    honours runtime ``ContextVar`` overrides and reloads ``config.yaml`` from
    disk when its mtime changes.

    Any failure to materialise the config (missing file, permission denied,
    YAML parse error, validation error) is reported as 503 — semantically
    "the gateway cannot serve requests without a usable configuration" — and
    logged with the original exception so operators have something to debug.
    """
    try:
        return get_app_config()
    except Exception as exc:  # noqa: BLE001 - request boundary: log and degrade gracefully
        logger.exception("Failed to load AppConfig at request time")
        raise HTTPException(status_code=503, detail="Configuration not available") from exc


# Cached singletons to avoid repeated instantiation per request
_cached_local_provider: LocalAuthProvider | None = None
_cached_repo: SQLiteUserRepository | None = None


def get_local_provider() -> LocalAuthProvider:
    """Get or create the cached LocalAuthProvider singleton.

    Must be called after ``init_engine_from_config()`` — the shared
    session factory is required to construct the user repository.
    """
    global _cached_local_provider, _cached_repo
    if _cached_repo is None:
        from app.gateway.auth.repositories.sqlite import SQLiteUserRepository
        from deerflow.persistence.engine import get_session_factory

        sf = get_session_factory()
        if sf is None:
            raise RuntimeError("get_local_provider() called before init_engine_from_config(); cannot access users table")
        _cached_repo = SQLiteUserRepository(sf)
    if _cached_local_provider is None:
        from app.gateway.auth.local_provider import LocalAuthProvider

        _cached_local_provider = LocalAuthProvider(repository=_cached_repo)
    return _cached_local_provider


async def get_current_user_from_request(request: Request):
    """Get the current authenticated user from the request cookie.

    Raises HTTPException 401 if not authenticated.
    """
    state = getattr(request, "state", None)
    state_user = getattr(state, "user", None)
    from app.gateway.auth_disabled import (
        AUTH_SOURCE_API_TOKEN,
        AUTH_SOURCE_AUTH_DISABLED,
        AUTH_SOURCE_INTERNAL,
        AUTH_SOURCE_SESSION,
    )

    if state_user is not None and getattr(state, "auth_source", None) in {
        AUTH_SOURCE_SESSION,
        AUTH_SOURCE_AUTH_DISABLED,
        AUTH_SOURCE_INTERNAL,
        AUTH_SOURCE_API_TOKEN,
    }:
        return state_user

    from app.gateway.auth import decode_token
    from app.gateway.auth.errors import AuthErrorCode, AuthErrorResponse, TokenError, token_error_to_code

    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail=AuthErrorResponse(code=AuthErrorCode.NOT_AUTHENTICATED, message="Not authenticated").model_dump(),
        )

    payload = decode_token(access_token)
    if isinstance(payload, TokenError):
        raise HTTPException(
            status_code=401,
            detail=AuthErrorResponse(code=token_error_to_code(payload), message=f"Token error: {payload.value}").model_dump(),
        )

    provider = get_local_provider()
    user = await provider.get_user(payload.sub)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail=AuthErrorResponse(code=AuthErrorCode.USER_NOT_FOUND, message="User not found").model_dump(),
        )

    # Token version mismatch → password was changed, token is stale
    if user.token_version != payload.ver:
        raise HTTPException(
            status_code=401,
            detail=AuthErrorResponse(code=AuthErrorCode.TOKEN_INVALID, message="Token revoked (password changed)").model_dump(),
        )

    return user


async def require_admin_user(request: Request, *, detail: str) -> None:
    """Require the authenticated caller to be an admin user.

    ``AuthMiddleware`` normally stamps ``request.state.user`` before the request
    reaches a router. Falling back to the strict dependency keeps the route safe
    in tests or alternative ASGI compositions that mount a router without the
    global middleware. ``detail`` is the route-specific 403 message.
    """
    user = getattr(request.state, "user", None)
    if user is None:
        user = await get_current_user_from_request(request)

    if getattr(user, "system_role", None) != "admin":
        raise HTTPException(status_code=403, detail=detail)


async def get_optional_user_from_request(request: Request):
    """Get optional authenticated user from request.

    Returns None if not authenticated.
    """
    try:
        return await get_current_user_from_request(request)
    except HTTPException:
        return None

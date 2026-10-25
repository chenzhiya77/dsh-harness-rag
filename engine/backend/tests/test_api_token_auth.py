"""Bearer token authentication for the minimal knowledge service.

The token is the only non-browser credential once auth-off is disabled, so the
matrix pins both edges: unauthenticated callers never reach a route, and a
valid token authenticates as the single-tenant default admin.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.gateway.api_token_auth import require_api_token_configured
from app.gateway.auth_middleware import AuthMiddleware
from app.gateway.csrf_middleware import CSRFMiddleware

TOKEN = "probe-token-0123456789abcdef0123456789abcdef"


def _make_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(AuthMiddleware)
    app.add_middleware(CSRFMiddleware)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "healthy"}

    @app.get("/protected")
    async def protected(request: Request) -> dict[str, str]:
        return {
            "user_id": request.state.user.id,
            "role": request.state.user.system_role,
            "source": request.state.auth_source,
        }

    @app.post("/protected")
    async def protected_post() -> dict[str, bool]:
        return {"ok": True}

    return app


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("DEER_FLOW_API_TOKEN", TOKEN)
    monkeypatch.delenv("DEER_FLOW_AUTH_DISABLED", raising=False)
    return TestClient(_make_app())


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health_is_public(client: TestClient) -> None:
    assert client.get("/health").status_code == 200


def test_get_without_token_is_rejected(client: TestClient) -> None:
    response = client.get("/protected")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_authenticated"


def test_wrong_bearer_is_rejected(client: TestClient) -> None:
    response = client.get("/protected", headers=_bearer("wrong"))

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "token_invalid"


def test_valid_bearer_maps_to_default_admin(client: TestClient) -> None:
    response = client.get("/protected", headers=_bearer(TOKEN))

    assert response.status_code == 200
    assert response.json() == {"user_id": "default", "role": "admin", "source": "api_token"}


def test_bearer_scheme_is_case_insensitive(client: TestClient) -> None:
    response = client.get("/protected", headers={"Authorization": f"bearer {TOKEN}"})

    assert response.status_code == 200


def test_bearer_post_skips_csrf(client: TestClient) -> None:
    response = client.post("/protected", headers=_bearer(TOKEN))

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_post_without_bearer_keeps_csrf_gate(client: TestClient) -> None:
    response = client.post("/protected")

    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]


def test_auth_disabled_falls_back_when_no_bearer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEER_FLOW_API_TOKEN", raising=False)
    monkeypatch.setenv("DEER_FLOW_AUTH_DISABLED", "1")

    response = TestClient(_make_app()).get("/protected")

    assert response.status_code == 200
    assert response.json() == {"user_id": "default", "role": "admin", "source": "auth_disabled"}


def test_auth_disabled_does_not_mask_a_bad_bearer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEER_FLOW_API_TOKEN", TOKEN)
    monkeypatch.setenv("DEER_FLOW_AUTH_DISABLED", "1")
    app_client = TestClient(_make_app())

    assert app_client.get("/protected", headers=_bearer("wrong")).status_code == 401
    assert app_client.get("/protected").status_code == 200


def test_the_startup_guard_requires_a_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEER_FLOW_API_TOKEN", raising=False)
    monkeypatch.delenv("DEER_FLOW_AUTH_DISABLED", raising=False)

    with pytest.raises(RuntimeError, match="DEER_FLOW_API_TOKEN"):
        require_api_token_configured()


def test_the_startup_guard_accepts_a_token_or_auth_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEER_FLOW_API_TOKEN", TOKEN)
    require_api_token_configured()

    monkeypatch.delenv("DEER_FLOW_API_TOKEN")
    monkeypatch.setenv("DEER_FLOW_AUTH_DISABLED", "1")
    require_api_token_configured()

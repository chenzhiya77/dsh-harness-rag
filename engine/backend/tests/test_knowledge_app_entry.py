"""Surface guard for the minimal knowledge-service entrypoint."""

from fastapi.routing import APIRoute


def test_knowledge_app_exposes_only_the_plugin_surface():
    from app.gateway.knowledge_app import app

    paths = {route.path for route in app.routes if isinstance(route, APIRoute)}

    assert "/health" in paths
    assert "/api/knowledge-bases" in paths
    assert "/api/rag/config" in paths
    assert "/api/models" in paths
    assert not any(path.startswith(("/api/threads", "/api/runs", "/api/channels")) for path in paths)

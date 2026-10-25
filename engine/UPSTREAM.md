# Engine upstream

The Python knowledge service lives under `engine/` as a **snapshot of the
upstream tracked tree** (no git history, no submodule).

| Field | Value |
| --- | --- |
| Source repository | Harness RAG engine (`E:\app\python\agent\harness-rag`, local) |
| Branch | `feat/rag-knowledge-base` |
| Commit | `b34b2d5728509117bf20c3e64f6beab6ea28521b` (`b34b2d572`) |
| Commit date | 2026-10-24 |
| Vendored | 2026-10-25 |
| Method | `git archive --format=tar <commit> \| tar -x -C engine` |
| Tracked files | 1082 |
| License | MIT (`engine/LICENSE`) |
| Local deltas | `engine/README.md` (doc-only) |

The engine code is byte-identical to that commit; `engine/README.md` carries
doc-only edits for the consolidated plugin layout. `engine/UPSTREAM.md` is
repository-side metadata and is not part of the snapshot. The runtime pack
builder (`scripts/build-runtime-pack.mjs`) reads `engine/backend/`,
`engine/config.example.yaml` and `engine/backend/uv.lock` from here; the
backend behaviour must not be edited in this repository.

## Updating

1. In the engine repository, commit the change on
   `feat/rag-knowledge-base`.
2. Re-extract: `git archive --format=tar <commit> | tar -x -C engine`
   after clearing the old tree.
3. Re-apply the doc-only edits to `engine/README.md` (see Local deltas).
4. Update this file and `runtime.json` (`engineCommit`, `engineVersion`,
   `runtimeVersion`) and rebuild the runtime pack.

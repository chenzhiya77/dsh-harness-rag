# Engine upstream and fork record

`engine/` is this repository's backend directory. It began as a one-time
snapshot of the Harness RAG engine; since 2026-10-25 it is **forked** and edited
here directly. There is no whole-tree re-vendor and no submodule.

| Field | Value |
| --- | --- |
| Source repository | Harness RAG engine (`E:\app\python\agent\harness-rag`, local) |
| Source branch | `feat/rag-knowledge-base` |
| Base commit | `b34b2d5728509117bf20c3e64f6beab6ea28521b` (`b34b2d572`) |
| Base commit date | 2026-10-24 |
| Snapshot taken | 2026-10-25 |
| Snapshot method | `git archive --format=tar <commit> \| tar -x -C engine` |
| Base tracked files | 1082 |
| License | MIT (`engine/LICENSE`) |
| Fork status | Active; this repository is the single source of truth |

## Local fork changes

- `backend/app/gateway/routers/knowledge_bases.py`: model-tool endpoint
  `POST /api/knowledge-bases/{kb_id}/tools` with six named calls.
- `backend/app/gateway/services/knowledge_service.py`: tool dispatch to the
  native `_*_impl` functions and the shared graph-config helper.
- `backend/app/gateway/services/citation_runs.py`: bounded per-`(user, run)`
  citation counter cache.
- `backend/tests/knowledge/test_tool_call_{api,citation,documents}.py`:
  contract tests for the endpoint.
- `README.md` (this directory): backend layout, API and build notes.

Use `git log` in this repository for the authoritative change history; the
list above is a map of the fork point, not a changelog.

## Fork commits

- `c78e80b` feat(engine): expose model-facing knowledge tool endpoints
- `36c76fc` feat(tools): align the six hrag tool contracts with the main tree
- `26cdab7` docs(engine): record the fork and the explicit build commit
- `84f037d` docs(tools): sync the product docs with the aligned tool surface
- `a494296` docs(plan): close out the tool parity pair
- `486973c` build(runtime): rebuild the pack at 0.1.0-2

## Building the runtime pack

`scripts/build-runtime-pack.mjs` resolves the engine commit from, in order:
`--engine-commit`, `<engine>/.git` HEAD, then a `Commit` row in this file.
`engine/` is not its own git checkout — the repository's `.git` sits one level
up and the builder deliberately does not walk up — so **pass the commit
explicitly**:

```bash
node scripts/build-runtime-pack.mjs --engine ./engine \
  --engine-commit "$(git rev-parse --short=9 HEAD)"
```

The `Base commit` row above records the vendored base, not the current fork
HEAD, and is intentionally not named `Commit` so a build without
`--engine-commit` fails loudly instead of stamping the wrong commit.

## Updating

1. Edit `engine/` in this repository; run the backend tests and ruff.
2. Rebuild the runtime pack with the explicit `--engine-commit`.
3. When publishing a pack, bump `runtime.json` (`engineCommit`,
   `engineVersion`, `runtimeVersion`) by the existing rules.
4. Upstream changes are reviewed and cherry-picked by hand. Do not run
   `git archive` over this tree.

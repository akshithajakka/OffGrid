# SpacetimeDB module — `warroom`

## Publish (local)

From **repository root** (uses `spacetime.json`):

```bash
spacetime publish warroom --server local
```

Schema-breaking changes:

```bash
spacetime publish warroom --server local --delete-data=always --yes=all
```

## Generate TypeScript bindings (for frontend)

From `frontend/`:

```bash
npm run spacetime:generate
```

# SpacetimeDB module — `offgrid`

## Publish (local)

From **repository root** (uses `spacetime.json`):

```bash
spacetime publish offgrid --server local
```

Schema-breaking changes:

```bash
spacetime publish offgrid --server local --delete-data=always --yes=all
```

## Generate TypeScript bindings (for frontend)

From `frontend/`:

```bash
npm run spacetime:generate
```

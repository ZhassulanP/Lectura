<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All backend calls go through `src/lib/api` (`api` object + react-query hooks in `queries.ts`); components never call fetch directly — keeps the Spring Boot API swappable.
- Demo/sample data lives only in `src/lib/api/mock.ts`, enabled unless `VITE_USE_MOCKS=false` — sample content must never be presented as AI output.
- Study material viewers load items via `GET /presentations/{id}/materials` — the backend has no per-item GET endpoints.
- Data is fetched client-side (no SSR loaders) because the backend runs on the user's machine and isn't reachable from the server.

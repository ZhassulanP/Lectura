# Lectura

Turn PDF/PPTX lecture presentations into notes, mixed multiple-choice/short-answer quizzes, and flashcards. The existing React/TypeScript interface uses TanStack Start, React Query, Tailwind and shadcn/ui. The backend uses Python/FastAPI, PostgreSQL, SQLAlchemy and Alembic. No Lovable account or Supabase service is needed.

## Run locally on macOS

Prerequisites: Node.js 22.12+ (or a newer supported LTS), Bun for the checked-in lockfile, Python 3.12+, and Docker Desktop for PostgreSQL. An existing PostgreSQL installation also works: create a database and adjust `DATABASE_URL`.

Start Docker Desktop and wait until its engine is running. Verify Docker and Compose before starting PostgreSQL:

```sh
docker info
docker compose version
```

From the repository root:

```sh
bun install --frozen-lockfile
cp -n .env.example .env
docker compose up -d db
```

In a backend terminal:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp -n .env.example .env
# Edit backend/.env: set GEMINI_API_KEY and a model available to your account.
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a frontend terminal, from the repository root:

```sh
npm run dev
```

Open **http://localhost:5173**. Backend health: **http://localhost:8000/api/v1/health**. Interactive API contract: **http://localhost:8000/docs**, with machine-readable OpenAPI at `/openapi.json`.

The root `.env.example` sets `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL=http://localhost:8000/api/v1`. Restart Vite after changing either value. Only public connection settings belong in frontend variables. The Gemini key belongs exclusively in `backend/.env`.

## Demo mode

If `VITE_USE_MOCKS` is omitted or is not exactly `false`, the existing development convention enables `src/lib/api/mock.ts`. Every screen displays a sample-data notice. Buttons load sample materials, not AI output. Demo uploads are rejected because the browser mock cannot extract your actual file. Demo materials and attempts reset on refresh. Backend failures never fall back to samples.

## Backend behavior and contract

Responses use camelCase, UUID strings and UTC ISO timestamps, matching `src/lib/types.ts`. Frontend calls go through `src/lib/api` and React Query hooks. Study viewers retrieve saved items through the presentation materials endpoint without regenerating them.

| Method | Path (under `/api/v1`) | Purpose |
| --- | --- | --- |
| GET | `/health` | Check database connectivity |
| POST / GET | `/presentations` | Upload / list presentations |
| GET / DELETE | `/presentations/{id}` | Inspect / delete presentation and associated data |
| GET | `/presentations/{id}/slides` | Original numbered extracted text |
| POST | `/presentations/{id}/notes` | Generate and persist notes |
| POST | `/presentations/{id}/quizzes` | Generate and persist a quiz |
| POST | `/presentations/{id}/flashcards` | Generate and persist a deck |
| GET | `/presentations/{id}/materials` | Saved notes, quizzes, decks and attempts |
| GET | `/quizzes/{id}` | Quiz without answer keys |
| POST / GET | `/quizzes/{id}/attempts` | Submit answers / retrieve attempts |
| GET | `/quiz-attempts/{id}` | Review saved result |

Upload multipart fields: `file`, optional `subject` (100 characters), optional `description` (500 characters). PDF/PPTX content is parsed and validated rather than trusting extension or MIME alone. Defaults: 50 MiB uploads, 500 pages/slides, 2 million extracted characters, bounded expanded PPTX archives. Original files are discarded after extracted text is persisted; filenames are never filesystem paths. Empty pages retain their original numbers. Image-only documents are saved as `FAILED` with an OCR explanation. Malformed, encrypted and unsupported files return useful errors.

Extraction completes during upload, returning `201` with `READY` or `FAILED`. The UI also preserves polling support for processing statuses. Binary file storage, slide image previews, OCR and speaker notes extraction are outside this MVP.

Quiz generation body:

```json
{ "questionCount": 5, "difficulty": "MEDIUM" }
```

Question count is 1–20. Difficulty is `EASY`, `MEDIUM` or `HARD`. Both question types are required when count is at least two. Multiple-choice submissions use the exact option text: the existing frontend contract uses option strings rather than option IDs. Question UUIDs, duplicate answers and allowed options are validated. Submit with:

```json
{ "answers": [{ "questionId": "<question UUID>", "answer": "<selected option or short answer>" }] }
```

Omitted/null/blank answers count as unanswered. Scores are calculated and saved on the server. Short answers use Unicode normalization, case folding and whitespace normalization, then exact matching; equivalent wording may score incorrectly. Results include correct answers, explanations and source references after submission. Previous attempts can be reviewed without another AI call.

Generation uses the [official Gemini Generate Content API](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) through `httpx`, behind a provider interface. Output must pass Pydantic validation, question-count/type checks and nonempty, existing source-slide checks before persistence. Missing credentials, insufficient evidence, timeouts, rate limits and invalid responses produce explicit errors. Lecture text is marked as untrusted evidence. Validation verifies shape and reference existence, but cannot prove every model statement is supported; review original text using source-reference buttons.

Requests are synchronous for this local MVP. Provider timeout defaults to 90 seconds; frontend timeout is 120 seconds. Generation accepts at most 120,000 characters of serialized evidence and rejects larger lectures instead of truncating them. Split large decks. Requests are not queued or automatically retried; after a timeout, check saved materials before retrying because a result may already have been saved. There is no authentication; keep this single-user backend bound to localhost.

## Configuration

`backend/.env.example` documents `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `ALLOWED_ORIGINS` (JSON array), document limits, AI input limit, timeout and API prefix. The default model is `gemini-3.8-flash`, listed as stable in Google's [model catalog](https://ai.google.dev/gemini-api/docs/models); select an available structured-output model for your account. Configuration loads `backend/.env` regardless of working directory. Alembic manages the schema; the app does not silently create tables. The Compose password is for local development only; changing it also requires updating `DATABASE_URL`.

To run the backend in a container:

```sh
docker build -t lectura-backend backend
# Set DATABASE_URL in backend/.env to reach PostgreSQL from the container.
# On macOS use host.docker.internal instead of localhost for a host-published DB port.
docker run --rm --env-file backend/.env lectura-backend alembic upgrade head
docker run --rm --env-file backend/.env -p 127.0.0.1:8000:8000 lectura-backend
```

## Checks

```sh
npm run lint
npm run typecheck
npm run test
npm run build
cd backend
source .venv/bin/activate
python -m pytest -q
```

Backend tests use disposable SQLite by default and a mocked provider; no Gemini key or paid call is needed. For PostgreSQL, set `TEST_DATABASE_URL` to a **dedicated disposable database**: the fixture creates and drops application tables. Never use a development or production database. Run `alembic check` after `alembic upgrade head` to verify migration consistency.

`npm run build` creates frontend assets and a standard Nitro Node server. After building, `npm run start` serves the production frontend (default port 3000). Frontend variables are baked into assets at build time. Add browser origins other than 5173 to backend CORS settings.

## Troubleshooting

- **`unknown shorthand flag: 'd' in -d` / `docker: unknown command: docker compose`:** Docker cannot find its Compose plugin. Docker Desktop includes Compose; finish its initial setup and restart your terminal. If the bundled plugin exists but is not discovered, use `/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose up -d db` from the repository root. If it is missing, repair or reinstall [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/).
- **Cannot connect to the Docker daemon / missing `docker.sock`:** start Docker Desktop and wait for its engine to become ready before retrying. `docker info` must succeed.
- **Port 5432 already in use:** set `POSTGRES_PORT=5433` in the root `.env`, change the port in `backend/.env`'s `DATABASE_URL` to `5433`, and rerun `docker compose up -d db`. The container still uses port 5432 internally. The `cp -n` setup commands preserve existing `.env` files.
- **Cannot reach server:** check FastAPI on 8000, `VITE_USE_MOCKS=false`, and that the base URL includes `/api/v1`.
- **Database unavailable:** start PostgreSQL, check `DATABASE_URL`, and run migrations.
- **CORS errors:** add the exact browser origin to `ALLOWED_ORIGINS` and restart FastAPI.
- **No extracted text:** scanned PDFs need OCR; export a text-based PDF or PPTX.
- **AI unavailable / invalid output:** configure the backend key/model and check provider access, quota and structured-output support.
- **Upload timed out:** use a smaller file and check the presentation list before retrying.

The repository remains connected to Lovable in git history. No history rewrites or deployment are required for local development.

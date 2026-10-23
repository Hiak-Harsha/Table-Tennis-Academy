# Migration & Breaking Changes Log

All breaking changes, schema modifications, security updates, and URL/env variable migrations are recorded here across all implementation phases.

---

## Phase 0: Safety Net & Hygiene (Completed)

### 1. Security & Hygiene Removals
- **Deleted Public Seed Endpoint**: Removed `src/app/api/seed/route.ts`. The public HTTP endpoint previously allowed anyone to reset administrative and student passwords to static values. Replaced with `prisma/seed.ts` (CLI only, strictly refuses execution if `NODE_ENV=production`).
- **Deleted Stale SQLite Artifacts**: Removed SQLite migration scripts (`scripts/add-column.js`, `scripts/migrate.js`, `scripts/test-update.js`), `check_db.js`, `seed.mjs`, and untracked `prisma/dev.db`.
- **Sanitized Uploads**: Removed committed PDF (`public/uploads/1774690320548-DBMS_T.pdf`) and ignored `public/uploads/*` in `.gitignore` (retaining `.gitkeep`).
- **Removed Stale Build Caches**: Untracked `tsconfig.tsbuildinfo`.

### 2. Dependency & Build Configuration
- **Moved `@prisma/client`**: Promoted from `devDependencies` to `dependencies` in `package.json` to prevent production build failures in slim runtime containers (`npm ci --omit=dev`).
- **Prisma Seeding Script**: Configured `prisma.seed` in `package.json` to run `tsx prisma/seed.ts`.
- **Removed Dangerous Push**: Removed `--accept-data-loss` and arbitrary inline shell execution from `package.json` `"build"`. Build is now strictly `prisma generate && next build`.
- **Separate Release Command**: Added `npm run db:migrate:deploy` for running production database migrations safely during deployment.
- **Node.js Types**: Updated `@types/node` from `^20` to `^22.0.0` matching the active Node runtime (`v24.x`).

### 3. Next.js 16 Architectural Alignment
- **Proxy Migration**: Migrated deprecated `src/middleware.ts` to `src/proxy.ts` exporting default `proxy(request: NextRequest)` per Next.js 16 conventions, removing compile warnings and ensuring Node.js runtime alignment.

### 4. Environment Validation (`src/lib/env.ts`)
- Added Zod-based environment validation loaded at startup.
- Added `.env.example` documenting all configuration keys:
  - `DATABASE_URL`: Must be a PostgreSQL connection string (`postgresql://` or `postgres://`).
  - `SESSION_SECRET`: Enforced 32+ characters minimum. Rejects default insecure keys in `production`.
  - `NODE_ENV`: Enforces `development`, `test`, or `production`.
  - `PORT`: Optional, defaults to `3000`.

### 5. Quality, Testing & CI Infrastructure
- **Vitest**: Configured `vitest.config.mjs` with alias resolution and added unit test suite `tests/unit/env.test.ts`.
- **Playwright**: Added `playwright.config.ts` for End-to-End browser test coverage.
- **Prettier**: Added `.prettierrc` and `.prettierignore`.
- **ESLint**: Added explicit directory scoping and node_modules exclusions to `eslint.config.mjs`.
- **CI Pipeline**: Added `.github/workflows/ci.yml` running linting, typechecking, test suite, and production build on GitHub Actions.

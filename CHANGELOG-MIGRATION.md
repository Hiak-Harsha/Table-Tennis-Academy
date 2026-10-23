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

---

## Phase 1: Authentication & Sessions Rebuilt (Completed)

### 1. Cryptographic Session Engine & Database Tracking
- **JWT Cryptography (`jose`)**: Replaced forged base64 cookie scheme with HS256 HMAC-SHA256 cryptographic signatures using `SESSION_SECRET`.
- **Host-Prefixed Cookies**: Automated `__Host-tta_session` cookie prefix in production (`httpOnly`, `secure`, `sameSite: lax`, `path: '/'`).
- **Database Session Persistence**: Added `Session` model to `prisma/schema.prisma` with `tokenHash` (SHA-256), `userId`, `expiresAt`, `revokedAt`, `userAgent`, and `ipAddress`.
- **Session Revocation**: Full revocation support on logout or password change via `revokeSession` and `revokeAllUserSessions`.
- **Active Student Verification**: `validateSession` authoritatively checks database on every request and immediately locks out non-`ACTIVE` student records (e.g. `SUSPENDED`, `INACTIVE`).

### 2. Password Security & Transparent Upgrades
- **Bcrypt Hashing (Cost 12)**: Implemented in `src/lib/password.ts` with minimum 8 characters requirement.
- **Transparent Migration**: Passwords stored as legacy plaintext are verified and transparently migrated to bcrypt cost 12 upon successful authentication.
- **Eliminated Backdoors**: Removed all hardcoded credentials (`9999999999 / admin123`, `8888888888 / demo123`, etc.) and auto-bootstrap logic from `src/actions/auth.ts`.
- **CLI Admin Script**: Created `scripts/create-admin.ts` with `npm run admin:create` for secure out-of-band administrator provisioning.
- **Removed Prototype Secrets**: Purged `NEXUS_SECRET` from `src/lib/auth-constants.ts` and overhauled `src/lib/auth-utils.ts` into a secure facade.

### 3. Rate Limiting & Audit Logging
- **Rate Limiting (`src/lib/rate-limit.ts`)**: Implemented sliding-window rate limiter per phone/IP (5 attempts per 15 minutes) protecting authentication routes against brute-force attacks.
- **Audit Logging (`src/lib/audit.ts`)**: Added asynchronous non-blocking structured audit logging for all auth events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `RATE_LIMITED`, `SESSION_REVOKED`).

### 4. Authoritative Role-Based Access Control (RBAC) Matrix
- **Auth Guardrails (`src/lib/auth-guard.ts`)**:
  - `requireAdmin()`: Enforces administrator privileges across server actions.
  - `requireStudent(targetStudentId?)`: Enforces active athlete enrollment and prevents cross-athlete tampering.
  - `requireAuth()`: Enforces authenticated session.
  - `authorize(user, action, resourceOwnerId)`: Complete authorization matrix across `{anon, student-self, student-other, admin} × {READ, WRITE, DELETE, ADMIN}`.
- **Server Action Protection**: Upgraded all actions in `src/actions/admin.ts`, `src/actions/fees.ts`, `src/actions/student.ts`, and `src/actions/chat.ts` to use authoritative guards and internal UUID references.

### 5. Test Suite Verification
- Added 4 new test suites (total 5 suites, 36 tests passing):
  - `tests/unit/password.test.ts`: Bcrypt cost 12, plaintext upgrade detection, <8 char rejection.
  - `tests/unit/session.test.ts`: Token signing, signature verification, tampering detection, forged secret rejection, expiration.
  - `tests/unit/authz-matrix.test.ts`: Full RBAC matrix verification across all 16 permission combinations.
  - `tests/unit/rate-limit.test.ts`: Sliding-window attempt counting, blocking, and reset.

---

## Phase 2: Data Model & Schema Hardening (Completed)

### 1. Integer Currency Representation (Indian Paise)
- **Eliminated IEEE 754 Floating-Point Precision Vulnerability**: Migrated all monetary amounts in `prisma/schema.prisma` from `Float` to `Int` representing minor units (1 INR = 100 Paise):
  - `AcademyFee.amount`: Stored in integer paise.
  - `Tournament.entryFee`: Stored in integer paise.
  - `TournamentPayment.amountPaid`: Stored in integer paise.
- **Currency Utilities (`src/lib/currency.ts`)**:
  - `rupeesToPaise(rupees)`: Converts rupee inputs to paise using `Math.round(val * 100)`, with validation against NaN, infinity, and negative numbers.
  - `paiseToRupees(paise)`: Converts integer paise to numerical rupee units.
  - `formatINR(paise)`: Formats paise into localized Indian Rupee currency strings (`₹1,500` or `₹1,500.50`).
  - `formatRupees(rupees)`: Formats rupee values into localized currency strings.
- **Price Tampering Prevention**: Server actions (`registerForTournament`, `registerForTournamentAction`) now ignore client-provided prices and fetch the authoritative `tournament.entryFee` directly from the database.

### 2. Relational Integrity & Cascades
- **Explicit `onDelete` Behaviors**:
  - `User` -> `Student`: `onDelete: Cascade`
  - `Student` -> `AcademyFee`: `onDelete: Restrict` (prevents deletion of student records that have fee history, protecting audit trails)
  - `Student` -> `TournamentPayment`: `onDelete: Restrict`
  - `Tournament` -> `TournamentPayment`: `onDelete: Restrict`
  - `User` -> `Notification`: `onDelete: Cascade`
  - `Student` -> `ChatMessage`: `onDelete: SetNull`
  - `User` -> `Session`: `onDelete: Cascade`

### 3. Performance & Integrity Indexes
- Added composite and single-column indexes:
  - `AcademyFee`: `@@index([studentId])`, `@@index([status])`, `@@index([dueDate])`
  - `Tournament`: `@@index([date])`
  - `TournamentPayment`: `@@index([studentId])`, `@@index([tournamentId])`, `@@unique([studentId, tournamentId])` (enforces single enrollment per athlete per tournament at the database constraint level)
  - `Notification`: `@@index([userId, isRead])`, `@@index([createdAt])`
  - `ChatMessage`: `@@index([category, batchType])`, `@@index([recipientId])`, `@@index([createdAt])`
  - `Student`: `@@index([batchType])`, `@@index([enrollmentStatus])`

### 4. UI & Server Action Synchronization
- Updated `addFeeAction` in `src/actions/fees.ts` to convert rupee form inputs to integer paise via `rupeesToPaise`.
- Updated `createTournamentAction` in `src/actions/admin.ts` to convert entry fee inputs to integer paise.
- Updated all frontend displays and payment modals (`PaymentGateway`, `FeePaymentClient`, `RegisterTournamentButton`, `TournamentHubClient`, admin fee tables, dashboard revenue widgets) to display amounts formatted via `formatINR`.
- Seed data in `prisma/seed.ts` updated to integer paise (`250000` paise for ₹2,500, `75000` paise for ₹750).
- Added comprehensive unit test suite `tests/unit/currency.test.ts` (10 tests passing).

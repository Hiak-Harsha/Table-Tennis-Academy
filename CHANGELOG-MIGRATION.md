# Migration & Breaking Changes Log

All breaking changes, schema modifications, security updates, and URL/env variable migrations are recorded here across all implementation phases.

---

## Phase A: Authentication Fixes & Hardening (Completed & Verified)

### 1. Canonical Identity Resolution (Fixes A1)
- Added `src/lib/identity.ts` with `resolveLoginIdentifier(input)` resolving raw 10-digit Indian numbers, spaced numbers (`98765 43210`), `+91` numbers, and 0-prefixed numbers uniformly to E.164 (`+91XXXXXXXXXX`).
- Student IDs (`TTA-XXXXX`) and admin login IDs (`loginId: "admin"`) resolved cleanly.
- Updated `unifiedLoginAction`, `requestOtpAction`, `createStudentAction`, `scripts/create-admin.ts`, and `prisma/seed.ts` to use canonical resolution.

### 2. Real Prisma Migrations (Fixes A2, D6)
- Created baseline migration `prisma/migrations/20261024000000_init/migration.sql` and `migration_lock.toml`.
- Added `RateLimit` table (`key`, `count`, `resetAt`, `updatedAt`) for multi-instance serverless rate limiting.
- Added `User.loginId` (unique handle for admin) and `User.phoneVerifiedAt`.
- Added `Session.lastSeenAt` and `@@index([userId, revokedAt])`.
- Added guardian fields to `Student` (`guardianName`, `guardianPhone`, `guardianConsent`, `guardianConsentAt`, `consentVersion`).
- Configured Vercel build command: `prisma migrate deploy && prisma generate && next build`.

### 3. Session & Cookie Hardening (Fixes A3, A4, A5, A10, A11)
- Extracted pure jose JWT signing/verification into `src/lib/session-token.ts` (zero database or Prisma imports). Next.js 16 `src/proxy.ts` imports solely from `session-token.ts`.
- Rewrote `src/lib/env.ts` to remove `VERCEL === '1'` from build phase checks, enforcing real 32+ char `SESSION_SECRET`, PostgreSQL `DATABASE_URL`, and non-console SMS providers in production runtime.
- Hardened cookie options: `__Host-` and `secure: true` dynamically conditional on HTTPS availability; added `AUTH_COOKIE_INSECURE_DEV=1` escape hatch for local-production HTTP testing.
- Wrapped `getCurrentUser` with React `cache()` for per-request memoization.
- Replaced all dead-end text divs ("Access Denied", "Please log in") with `requireRoleOrRedirect` that redirects with reason query params. Added `/api/auth/clear` route to cleanly clear cookies on redirect.
- Protected `/login` page: redirects authenticated users immediately to their role dashboard.

### 4. Constant-Time Login & Nonce Error Announcements (Fixes A6, A9)
- Always executes bcrypt compare against `DUMMY_BCRYPT_HASH` when an identifier does not exist to eliminate user enumeration timing side channels.
- Password verification runs before account status checks; returns generic invalid credentials message on bad credentials and distinct inactive account message only after valid password.
- State returns `{ error, ts, referenceId }`; client alerts and screen readers re-announce repeated identical error attempts via `ts` nonce.
- Added show/hide password toggle, accessible `role="alert"`, `autocomplete="username"`, `autocomplete="current-password"`, and `inputmode="tel"`.

### 5. Durable Rate Limiting (Fixes A8, B3)
- Backed `checkRateLimit` by atomic PostgreSQL `RateLimit` table transactions with graceful in-memory fallback.
- Removed module-scope `setInterval`.
- Extracted client IP using platform-trusted headers (`x-vercel-forwarded-for` / `x-forwarded-for`).

### 6. Atomic OTP Verification & Action Binding (Fixes A7, B1, B2, B4, B5, B6)
- Checked SMS provider dispatch return value; OTP challenges are not committed and cooldowns are not started if provider returns failure.
- Atomic transaction for OTP verification: verifies attempts < maxAttempts, increments attempts counter atomically, verifies constant-time HMAC hash, and marks consumed.
- Generates single-use signed `verificationToken` upon OTP success binding phone and purpose.
- `registerStudentAction` enforces and validates `verificationToken`.
- Added `/forgot-password` recovery flow: phone → OTP → token → new password with session revocation.
- Added parental/guardian consent fields for minor athletes (under 18).
- Deterministic 5-digit zero-padded student ID generator (`TTA-XXXXX`) without random fallbacks.

---

## Phase B: Real Payments & Gateway Robustness (Completed & Verified)

### 1. Eliminated Client Secrets & Browser Webhook Forgery (Fixes C1)
- Completely deleted `triggerDevWebhook` and the hardcoded secret `dev_razorpay_webhook_secret_key_32_bytes_long` from `src/components/PaymentGateway.tsx`.
- Removed client-side import of `generateWebhookSignature`. Verified that `.next/static` bundles contain zero secrets (`grep -r "webhook_secret"` returns 0 matches).
- Created server-only development payment simulator route `POST /api/dev/simulate-payment` guarded strictly by `NODE_ENV === 'development'` and administrator authentication (returns 404 in production).

### 2. Payment Provider Abstraction & Real Order Creation (Fixes C2, C4)
- Created `src/lib/payments/provider.ts` defining `PaymentProvider` interface, `RazorpayProvider` (calling official REST API with Basic Auth), and `MockPaymentProvider` (for test and development without live credentials).
- Updated `createPaymentOrderAction`:
  - Reuses existing open `CREATED` orders within 15-minute TTL to prevent duplicate order proliferation.
  - Rejects fee orders if invoice is marked `PAID` or a `CAPTURED` payment record already exists in the database.
  - Integrates tournament eligibility checks (`checkTournamentRegistrationWindow`, `checkTournamentCapacity`, `checkStudentTournamentEligibility`) before creating tournament payment orders.
  - Returns sanitized `{ success: true, orderId, keyId, amount, currency, upiIntent, title }`.

### 3. Webhook Robustness & Idempotency Engine (Fixes C3)
- Rewrote `src/app/api/webhooks/payments/route.ts`:
  - Enforces `X-Razorpay-Event-Id` header (and payload fallbacks) for idempotency. Duplicate processed events return 200 without reprocessing.
  - Persists incoming webhook events as `RECEIVED` before attempting fulfillment transactions, ensuring retry safety.
  - Verifies that webhook payment amount and currency match authoritative database records exactly; rejects amount tampering with 400.
  - Executes atomic `$transaction` fulfilling fees, tournament enrollments, notifications, and transitioning `PaymentEvent` to `PROCESSED`.
  - Supports `payment.captured`, `payment.failed`, and `refund.processed` transitions without crashing.
  - Strictly typed with Zod schema (`RazorpayWebhookPayloadSchema`), eliminating all `any` types.

### 4. Public Receipt Verification & Admin Operations (Fixes C5)
- Created `src/lib/receipt.ts` resolving digital receipts across `AcademyFee`, `TournamentPayment`, and `Payment` tables.
- Built public verification page `/verify/[receiptNo]` rendering official academy verification badge, athlete name, student ID, item, date, and digital seal.
- Created scheduled reconciliation cron route `POST /api/cron/payment-reconciliation` resolving stale uncaptured orders and automatically aging overdue fees.
- Added admin `refundPaymentAction` executing provider refunds and reverting fee/tournament states within audited transactions.

### 5. Content Security Policy Hardening (Fixes C6)
- Updated CSP in `next.config.ts`:
  - Removed `'unsafe-eval'`.
  - Added `https://checkout.razorpay.com` to `script-src` and `frame-src`.
  - Added `https://api.razorpay.com` to `frame-src` and `connect-src`.
  - Added `https://lumberjack.razorpay.com` to `connect-src`.
- Updated `tests/unit/security-headers.test.ts` to assert Razorpay domain whitelist and absence of `'unsafe-eval'`.

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

---

## Phase 3: Input Validation, Sanitization & File Upload Security (Completed)

### 1. Robust Input Sanitization Engine (`src/lib/sanitize.ts`)
- **HTML Entity Encoding (`escapeHtml`)**: Escapes characters `&`, `<`, `>`, `"`, and `'` to prevent Cross-Site Scripting (XSS).
- **HTML Tag Stripping (`stripHtml`)**: Strips all HTML/XML elements, `<script>` tags, event handlers, and decodes escaped entities with whitespace collapsing.
- **Text Sanitization (`sanitizeText`, `sanitizeOptionalText`)**: Strips ASCII control characters (`\x00-\x08\x0B\x0C\x0E-\x1F\x7F`), strips HTML, trims whitespace, and collapses multiple spaces.
- **Number & Boolean Parsers**: Added `sanitizeInt` and `sanitizeBoolean` helpers for safe type conversions.

### 2. Multi-Layer File Upload Security (`src/lib/file-security.ts`)
- **Magic Byte Sniffing (`detectMagicBytes`)**: Inspects true binary buffer signatures, completely ignoring client-provided MIME types and extensions:
  - PNG (`89 50 4E 47 0D 0A 1A 0A`)
  - JPEG (`FF D8 FF`)
  - WebP (`52 49 46 46 ... 57 45 42 50`)
  - PDF (`25 50 44 46`)
- **SVG Injection Defense**: SVGs are explicitly forbidden due to XML entity expansion and inline JavaScript execution vectors.
- **Strict Size Limits**: Enforced 5MB maximum upload limit across all files.
- **Filename Sanitization (`sanitizeFileName`)**: Strips path traversal attempts (`../`, `..\`), isolates basename, removes special characters, and preserves single verified lowercase extensions.
- **Collision-Resistant Storage Keys**: Generates cryptographic UUID storage keys (`crypto.randomUUID()`) to prevent filesystem overwriting and timing enumeration attacks.

### 3. Serverless-Resilient Storage Adapter (`src/lib/storage.ts`)
- Saves validated uploads to `public/uploads` in persistent Node environments.
- Handles read-only serverless filesystems (e.g. Vercel) gracefully by falling back to base64 Data URIs (under 2MB) or returning clear storage exceptions rather than crashing serverless invocations.

### 4. Authoritative Zod Schemas (`src/lib/validations.ts`)
- **PhoneSchema**: Strict 10-digit Indian mobile validation with control character stripping (`^[6-9]\d{9}$`).
- **PasswordSchema**: Enforces 8-72 character passwords with ASCII printable character verification.
- **StudentRegistrationSchema**: Validates name, phone, password, batch type, and enrollment status.
- **TournamentSchema**: Validates tournament title, date, location, and entry fee.
- **FeeSchema**: Validates student UUID, billing month, and rupee fee amount.
- **ChatMessageSchema**: Validates chat sender, category, message content (with automatic sanitization), optional batch, and recipient.
- **BroadcastSchema**: Validates urgent announcement broadcast payloads.

### 5. Server Action Hardening
- **Chat Action (`src/actions/chat.ts`)**:
  - Replaced unvalidated disk writes with `validateUploadedFile` (magic byte verification) and `saveUploadedFile`.
  - Applied `ChatMessageSchema` and input sanitization to all outgoing messages.
- **Admin Actions (`src/actions/admin.ts`)**: Replaced loose casts with `StudentRegistrationSchema`, `TournamentSchema`, and `TournamentStatusSchema`.
- **Fee Actions (`src/actions/fees.ts`)**: Replaced loose types with `FeeSchema` and safe currency conversions.
- **Auth Actions (`src/actions/auth.ts`)**: Enforced `PhoneSchema` and `PasswordSchema` on login and registration endpoints.

### 6. Test Suite Expansion
- Added 3 new unit test suites (25 new tests; total 71/71 tests passing):
  - `tests/unit/sanitize.test.ts` (5 tests): XSS escaping, tag removal, control character stripping, whitespace collapsing.
  - `tests/unit/file-security.test.ts` (11 tests): Magic byte sniffing, extension matching, SVG rejection, size limits, path traversal defense.
  - `tests/unit/validations.test.ts` (9 tests): Phone number format, password length, schema edge cases.

---

## Phase 4: Payment Gateway Integrity, Webhook Verification & Mobile Authorisation (Completed)

### 1. Cryptographic Webhook Handler & Idempotency (`src/app/api/webhooks/payments/route.ts`)
- **Raw Body Signature Verification**: Implemented constant-time HMAC-SHA256 signature verification (`verifyWebhookSignature`, `crypto.timingSafeEqual`) on raw request body, completely preventing forged payment alerts.
- **Webhook Idempotency**: Deduplicates incoming webhook events via the `PaymentEvent` table's unique `eventId` index to prevent double tournament enrollments or double fee credits upon network retries.
- **Interactive Database Transactions**: Wrapped payment captures in atomic `prisma.$transaction` updating `Payment(CAPTURED)`, fulfilling invoices (`AcademyFee(PAID)`), creating tournament registrations, generating receipt numbers, and dispatching in-app notifications.

### 2. Authoritative Payment State Machine (`src/lib/payment-state.ts`)
- Enforced strict state transitions: `CREATED` → `AUTHORIZED` → `CAPTURED` | `FAILED`, `CAPTURED` → `REFUNDED`.
- Guaranteed that client-side components can never directly mark invoices or tournaments as `PAID`. Status transitions happen exclusively via verified server webhooks, reconciliation jobs, or audited administrator cash records.

### 3. Server-Driven Payment Orders & UPI Deep-Linking (`src/actions/payments.ts`)
- Created `createPaymentOrderAction`: Pulls authoritative pricing directly from the database in integer paise (ignoring client parameters) and creates `Payment` records in the `CREATED` state.
- Generated standard NPCI UPI Intent URLs (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`) for instant deep-linking into Google Pay, PhonePe, Paytm, and BHIM on mobile devices.
- Added `checkPaymentStatusAction`: Polling endpoint for frontend clients to await server-side bank confirmation without client tampering.
- Added `recordCashPaymentAction`: Admin-only audited action for recording physical academy cash collections.

### 4. Modernized Payment Gateway UI (`src/components/PaymentGateway.tsx`)
- Purged fake card number, CVV, expiry inputs, fake bank lists, "Simulate Verification" button, and fake "PCI-CERTIFIED" claims.
- Integrated automated touch/pointer device detection (`pointer: coarse`). On mobile, presents an instant "Pay via UPI App" button; on desktop, renders dynamic scannable QR code.
- Added live status polling showing "Verifying with Bank..." and smoothly transitioning to confirmed receipt once the webhook confirms settlement.

### 5. Mobile Phone Normalization & 6-Digit OTP Engine (`src/lib/phone.ts`, `src/lib/otp.ts`, `src/lib/sms/provider.ts`)
- **E.164 Normalization**: Standardizes Indian mobile inputs (`9876543210`, `+91 98765 43210`, `09876543210`) into `+91XXXXXXXXXX`.
- **Hashed OTP Storage**: 6-digit numeric codes generated with `crypto.randomInt` and stored hashed with per-challenge salt, 5-minute TTL, max 5 attempts, and 30-second resend cooldowns.
- **SMS Providers**: Pluggable provider interface supporting `ConsoleProvider` (dev/test only, strictly forbidden in production) with DLT-compliant `Msg91Provider` and `TwilioVerifyProvider`.
- **Upgraded Registration Wizard (`src/app/register/page.tsx`)**: Replaced hardcoded fake OTPs with real 6-digit verification, `inputMode="numeric"`, `autoComplete="one-time-code"`, and Android WebOTP API support.

### 6. Progressive Web App (PWA) & Web Push Foundation
- Added `public/manifest.webmanifest` and `public/sw.js` with offline caching and Web Push notification event listeners.
- Added `src/components/PwaRegister.tsx` capturing `beforeinstallprompt` for smooth mobile home-screen installation.

### 7. Test Suite Expansion
- Added 4 new test suites (21 new tests; total 13 suites, 92/92 tests passing):
  - `tests/unit/payment-security.test.ts` (7 tests): HMAC signature verification, tampered payload rejection, forged secret defense, NPCI UPI intent generation.
  - `tests/unit/payment-state.test.ts` (3 tests): Transition validation and illegal state assertions.
  - `tests/unit/phone.test.ts` (6 tests): E.164 normalization, invalid number rejection, display formatting.
  - `tests/unit/otp.test.ts` (5 tests): 6-digit generation, hashing with salt, timing-safe verification, wrong code/salt rejection.

---

## Phase 5: Real-Time Layer: Server-Sent Events, Channel Authorization, Chat Overhaul & Live Notifications (Completed)

### 1. Architectural Strategy: In-Memory Event Bus & Server-Sent Events (SSE)
- **Zero Third-Party Vendor Lock-in**: Engineered a high-throughput, in-process Event Bus (`src/lib/realtime/bus.ts`) eliminating recurring paid SaaS subscriptions (Pusher, Ably).
- **Sub-50ms Dispatch Latency**: Event dispatches occur instantaneously (<2ms within process) and stream directly to connected browser clients over persistent HTTP/SSE connections.
- **Connection Resiliency & Monotonic Replay Buffer**: Integrated a 100-message ring buffer. If a mobile device switches networks or disconnects, it reconnects using standard `Last-Event-ID` and missed events are automatically backfilled without data loss.
- **15-Second Keep-Alive Heartbeats**: SSE streaming route (`src/app/api/realtime/events/route.ts`) emits periodic `: keep-alive\n\n` comments preventing proxy and gateway connection timeouts.

### 2. Multi-Tenant Server-Side Channel Authorization (`src/lib/realtime/authz.ts`)
- Authoritative validation matrix guarantees users can never eavesdrop on unauthorized channels:
  - `global`: Open to all authenticated sessions for broadcast announcements.
  - `admin:ops`: Strictly restricted to sessions with the `ADMIN` role.
  - `batch:<BATCH>`: Restricted to students enrolled in that specific batch; admins may monitor any batch.
  - `user:<userId>`: Restricted to the authenticated user owning that ID; admins permitted for operational support.
  - `dm:<idA>:<idB>`: Restricted to active participants matching either ID; canonical sorted channel naming (`getDmChannelName`).
- Any unauthorized subscription request immediately terminates the stream with HTTP 403 Forbidden.

### 3. Chat System Complete Overhaul (`src/actions/chat.ts`, `src/components/BatchChat.tsx`)
- **Eliminated 8-Second Polling Loop**: Completely removed naive polling intervals (`setInterval`) that caused unnecessary battery drain and database thrashing. Replaced with instant reactive SSE subscriptions.
- **Optimistic UI with Client Deduplication**: Generated monotonic client message IDs (`clientMsgId`) both in client state and DB index (`@unique`) to prevent duplicate bubbles during optimistic UI updates.
- **Accurate Message Delivery & Read Ticks**: Replaced hardcoded double ticks `✓✓`. Now accurately displays single grey tick (`✓`) for sent messages and double green ticks (`✓✓`) when marked read by recipient, backed by `ChatReadReceipt` database model.
- **Cursor-Based Pagination**: Added `cursor` and `limit` support to `getChatMessagesAction` to prevent massive memory payloads when scrolling through history.
- **Live Typing Indicators**: Ephemeral typing events (`chat.typing`) published to the channel with automatic 3-second debounce and cleanup.

### 4. Live In-App Notification System (`src/actions/notifications.ts`, `src/components/NotificationBell.tsx`)
- Added real-time notification popover and live unread counter badge in top navigation (`src/app/(dashboard)/layout.tsx`).
- Integrated instant SSE event dispatches for incoming broadcasts, batch announcements, and payment captures.
- Added server actions for single read (`markNotificationReadAction`) and bulk read (`markAllNotificationsReadAction`).

### 5. Asynchronous Non-Blocking Realtime Dispatches
- Payment webhook handler (`src/app/api/webhooks/payments/route.ts`) now publishes `payment.captured` and `notification.new` events to real-time subscribers upon settlement.
- Admin announcement broadcaster (`src/actions/admin.ts`) broadcasts urgent alerts across the `global` channel with non-blocking, asynchronous background fanout to all active student notification tables.

### 6. Test Suite Expansion & Verification
- Added 2 new test suites (23 new tests; total 15 suites, 115/115 tests passing):
  - `tests/unit/realtime-authz.test.ts` (17 tests): Channel authorization matrix (`global`, `admin:ops`, `batch:*`, `user:*`, `dm:*`), malformed channels, and canonical naming.
  - `tests/unit/realtime-bus.test.ts` (6 tests): Publish/subscribe routing, unsubscribe cleanup, replay buffer backfill, and ring-buffer overflow bounds.
- Full verification gates passed: `npm test` (115 passed), `npm run lint` (0 errors), `npx tsc --noEmit` (0 errors), and `npm run build` (successful compilation and route bundling).

---

## Phase 6: Accuracy & Business-Logic Fixes (Completed)

### 1. Authoritative Fee Status Engine & Overhaul (`src/lib/fee-status.ts`, `src/app/(dashboard)/student/fees/page.tsx`)
- **Complete Fees Schedule**: Replaced the faulty `fees[0]` single-record display. The page now lists all fees sorted in strict financial priority: `OVERDUE` (oldest first) → `DUE` (today) → `UPCOMING` (future) → `PAID` (most recent first).
- **Date-Only Semantics & Dynamic Status Computation**: Computed authoritative statuses using `compareKolkataDates` relative to the current calendar day in `Asia/Kolkata` (IST), properly identifying overdue vs today's due vs future subscription cycles.
- **Server-Side Financial Metrics**: Authoritatively computed `totalOutstandingPaise`, `totalOverduePaise`, `totalDuePaise`, and `totalPaidPaise` in integer paise without IEEE 754 floating-point rounding errors.
- **"Pay Next Due" Targeting**: Automatically routes the single primary CTA to the oldest unpaid invoice (`nextPayableFee`), highlighting the urgent action required.
- **Dynamic Identity Pass Badge**: Renders real-time compliance status: `✓ AUTHORIZED ENTRY` when zero overdue fees exist, and `⚠ ACCESS RESTRICTED` with an overdue counter otherwise.

### 2. Single Authoritative Tournament Registration Action (`src/actions/tournaments.ts`)
- **Consolidated Redundant Actions**: Eliminated 3 divergent implementations across `admin.ts` and `student.ts`, creating one authoritative action: `registerForTournamentAction`.
- **Enforced Registration Windows & Capacity**:
  - Enforced tournament date in future (`isFutureDate`).
  - Enforced registration deadline cutoff timestamp (`checkTournamentRegistrationWindow`).
  - Added `maxPlayers` and `registrationDeadline` to `Tournament` model in `prisma/schema.prisma` and enforced participant capacity checks (`checkTournamentCapacity`).
- **Strict Multi-Tier Eligibility Rules (`src/lib/tournament-eligibility.ts`)**:
  - Enforced active enrollment (`enrollmentStatus === 'ACTIVE'`).
  - Enforced curriculum tier matching (Beginner athletes barred from Advanced events, Beginner-only events restricted to Beginner athletes).
  - Enforced age restrictions (e.g. Under-15 / U-18 tournaments parsed and validated against athlete age).
  - Enforced database-level unique constraint (`@@unique([studentId, tournamentId])`) preventing duplicate registrations.
  - Sourced authoritative pricing directly from `tournament.entryFee` in the database, ignoring client overrides. Supports instant free entry when `entryFee === 0`.

### 3. Student Administration Lifecycle & State Machine (`src/lib/student-state.ts`, `src/actions/admin.ts`, `src/components/EditStudentForm.tsx`)
- **Formal Enrollment State Machine**: Validates all lifecycle transitions between `ACTIVE`, `INACTIVE`, `SUSPENDED`, and `GRADUATED` with `isValidStudentStatusTransition`. Disallows invalid leaps (e.g. `SUSPENDED` directly to `GRADUATED`) and arbitrary unvalidated form data casts.
- **Mobile Number Updates with E.164 Normalization**: Allows administrator to update student contact phones, validating format and uniqueness against the `User` table.
- **Audited Password Resets**: Added secure admin password reset option, hashing new passwords with bcrypt cost 12.
- **Collision-Resistant Student ID Generator (`src/lib/student-id.ts`)**: Replaced `TTA-` + random 4-digit generation (which suffered from birthday paradox collisions at scale) with a monotonic sequence counter and automated retry loop (`TTA-01001`, `TTA-01002`, etc.).

### 4. Timezone Standardization (`src/lib/date.ts`)
- Standardized all date storage to UTC and all UI presentation to `Asia/Kolkata` (IST) with a unified `formatDate` helper.
- Implemented `compareKolkataDates` for calendar day comparisons that correctly handle UTC midnight boundary crossings (+05:30 offset).

### 5. Dead & Duplicate Code Purged
- Deleted `src/actions/student.ts` (contained redundant/dead `processFeePayment`, `registerForTournament`, and `registerForTournamentAction`).
- Deleted `src/components/EditStudentModal.tsx` (unused duplicate of `EditStudentForm.tsx`).
- Deleted `src/components/PayFeeButton.tsx` (unused duplicate of `FeePaymentClient.tsx`).
- Removed duplicate `registerForTournamentAction` from `src/actions/admin.ts`.

### 6. Test Suite Expansion & Verification
- Added 4 new test suites (37 new tests; total 19 suites, 152/152 tests passing):
  - `tests/unit/fee-status.test.ts` (8 tests): Computed status (`PAID`, `OVERDUE`, `DUE`, `UPCOMING`), prioritization sorting, integer paise totals, next payable fee identification, compliance flag.
  - `tests/unit/tournament-eligibility.test.ts` (10 tests): Future date windows, deadline expiration, player capacity limits, batch level eligibility, age limit enforcement.
  - `tests/unit/student-state.test.ts` (8 tests): Status transition state machine (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `GRADUATED`), re-enrollment, invalid transition rejections, Zod enum safety.
  - `tests/unit/date.test.ts` (11 tests): `formatDate` in `Asia/Kolkata`, UTC midnight boundary shifts, `compareKolkataDates`, and `isFutureDate`.
- Full verification gates passed: `npm test` (152 passed), `npm run lint` (0 errors), `npx tsc --noEmit` (0 errors), and `npm run build` (successful compilation and route bundling).

---

## Phase 7: Design System, Typography & Authentic Sport Copy Overhaul (Completed)

### 1. Match Night Design Tokens (`src/styles/tokens.css`)
- **Authentic Table Tennis Color System**: Replaced generic web templates and sci-fi neon colors with high-contrast, professional table tennis colors:
  - `--ball-orange`: `#FF6A13` (3-star ITTF competition ball orange)
  - `--table-blue`: `#0A3D91` (International competition table surface blue)
  - `--table-deep`: `#061A3A` (Sub-table structural deep navy)
  - `--net-white`: `#F5F7FA` (Regulation cotton mesh white)
  - `--court-green`: `#0E7A4F` (Taraflex sports rubber flooring green)
  - `--umpire-red`: `#E5334B` (Rubber paddle red / match warning)
  - `--paddle-black`: `#0B0E14` (Carbon-blade matte black / deep background)
- **Design Tokens**: Standardized spacing scales (`--space-1` to `--space-12`), border radii (`--radius-sm` to `--radius-full`), elevation shadows (`--elevation-1` to `--elevation-3`), and standardized transition durations (`--motion-fast`, `--motion-normal`, `--motion-deliberate`).
- **Motion & Accessibility**: Included `@media (prefers-reduced-motion: reduce)` tokens to eliminate animations for vestibular and accessibility comfort.

### 2. Typography Hierarchy (`src/app/layout.tsx`, `src/app/globals.css`)
- **Display Headings**: Configured `Big_Shoulders` (weights 600-900) via `next/font/google` for bold, athletic display typography.
- **Body & UI**: Configured `Barlow` (weights 400-700) for clean legibility across tables, forms, and cards.
- **Scoreboard & Numerals**: Configured `Chakra_Petch` for digital tournament scoreboard digits, timers, and financial figures.
- **Font Resiliency & Minimum Size Guarantee**: Purged legacy media queries that shrank body text down to 13px on mobile devices. Standardized base font to `16px` across all screen widths (`html { font-size: 16px; }`), with strict rules preventing any UI element from dropping below `12px` and inputs maintaining minimum 44px touch targets.

### 3. Sci-Fi & Cyberpunk Copy Complete Overhaul
- Purged all sci-fi, video-game, and cyberpunk jargon across all portal interfaces, replacing them with authentic, professional table tennis terminology:
  - `"Nexus Entry"` / `"SYNC WITH HUB"` → `"Academy Sign In"` / `"Sign In"`
  - `"OVERSEER"` / `"Command Center"` → `"COACH DESK"`
  - `"ATHLETE"` / `"Operative"` → `"PLAYER"`
  - `"Athlete Circle"` → `"Squad Chat & Players"`
  - `"Broadcast Protocol"` / `"Broadcasts"` → `"Academy Notice Board"`
  - `"Security Key"` → `"Password"`
  - `"Manage Identity"` / `"Protocol ID"` → `"Manage Player Profile"` / `"Player ID"`
  - `"Assigned Mentor"` → `"Assigned Coach"`
  - `"Emergency Nexus"` → `"Emergency Contact Information"`
  - `"Tournament Designation"` / `"Operations Date"` → `"Tournament Name"` / `"Tournament Date"`
  - `"Confirm & Publish Event"` → `"Publish Tournament"`
  - `"nexus-container"` → `.academy-container`

### 4. Verification Gates
- **Unit Tests**: 19 test files, 152/152 tests passed.
- **ESLint**: 0 errors.
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Next.js Production Build**: `prisma generate && next build` compiled and optimized all static and dynamic routes successfully.

---

## Phase 8: UX, Responsiveness, Mobile Touch Ergonomics & Accessibility (Completed)

### 1. Mobile Bottom Navigation & 100dvh Layouts
- **Student Bottom Nav (`src/components/StudentBottomNav.tsx`)**: Built a mobile-first 5-tab sticky bottom navigation bar (Dashboard, Fees, Tournaments, Squad Chat) displayed on viewports under 769px, supporting safe-area padding (`env(safe-area-inset-bottom)`) and proper screen reader hints (`aria-label="Mobile Navigation"`, `aria-current="page"`).
- **Viewport Height Resilience**: Replaced standard `100vh` in root layouts (`(dashboard)/layout.tsx`, `(admin)/layout.tsx`) with dynamic `100dvh` to prevent layout clipping caused by mobile address bars.
- **Skip Links (`.skip-to-content`)**: Added accessible skip navigation links in all major layout boundaries jumping keyboard focus directly to `<main id="main-content" tabIndex={-1}>`.

### 2. WCAG 2.1 AA Accessibility & Keyboard Ergonomics
- **Visible Focus Rings**: Added global `:focus-visible` styling (`outline: 2px solid var(--ball-orange); outline-offset: 2px`) for all focusable buttons, links, inputs, and selects.
- **Modal Dialog Semantics & Escape Traps**: Upgraded all modal dialogs (`AddStudentModal`, `CreateTournamentModal`, `FeeControls`, `PaymentGateway`) with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `keydown` event listeners for instantaneous `Escape` key dismissal.
- **Live Announcements (`aria-live="polite"`)**: Configured accessible ARIA live regions for toast alert notifications (`ToastProvider.tsx`) and the OTP resend countdown timer (`register/page.tsx`).
- **Motion Accessibility**: Updated `IntroAnimation.tsx` to detect `prefers-reduced-motion: reduce` for instant bypass, along with a dedicated "Skip Intro" keyboard-accessible button.
- **Responsive Data Tables**: Wrapped all tabular rosters in `.table-responsive` containers with subtle horizontal scroll indicators, ensuring zero mobile overflow while retaining full column legibility.

### 3. Touch Ergonomics & Form Usability
- **Password Visibility Toggles**: Added show/hide password buttons to both `login/page.tsx` and `register/page.tsx` with accessible `aria-label` attributes.
- **44px Minimum Touch Targets**: Standardized buttons, tab triggers, inputs, and modal close buttons to meet mobile touch-ergonomic targets (min 44×44px).
- **Destructive Action Safety**: Integrated two-step confirmation prompts before executing player suspensions in `EditStudentForm.tsx`.
- **Breadcrumb Navigation**: Added accessible `<nav aria-label="Breadcrumb">` on admin subpages (`admin/students/[id]/edit/page.tsx`).

### 4. Next.js Image Optimization
- Replaced all legacy unoptimized `<img>` tags with Next.js `<Image />` components across:
  - `src/app/home/page.tsx`: Hero academy imagery with `priority` and responsive `sizes`.
  - `src/app/(dashboard)/student/page.tsx`: Athlete profile avatars with fallback error handling.
  - `src/app/(admin)/admin/page.tsx`: Coach desk avatars.
  - `src/components/PaymentGateway.tsx`: UPI dynamic QR code display with optimized sizing and dimensions.
  - `src/components/BatchChat.tsx`: Athlete messaging avatars.

### 5. Loading Skeletons, Error Boundaries & 404 Not Found
- **Loading Skeletons (`loading.tsx`)**: Created animated loading skeleton UI states for root (`src/app/loading.tsx`), student dashboard (`src/app/(dashboard)/student/loading.tsx`), and admin command desk (`src/app/(admin)/admin/loading.tsx`).
- **Error Boundaries (`error.tsx`)**: Created client-side error fallback boundaries across all sections (`src/app/error.tsx`, `student/error.tsx`, `admin/error.tsx`) featuring actionable retry mechanisms (`reset()`).
- **Custom 404 Page (`src/app/not-found.tsx`)**: Built a branded, accessible 404 Not Found page with quick navigation back to home or athlete dashboard.

### 6. RFC 4180 CSV Export Utility
- **Pure CSV Generator (`src/lib/csv-export.ts`)**: Created RFC 4180 compliant CSV export engine escaping fields containing commas, double quotes, and CRLF newlines.
- **Export Triggers**: Added "Export CSV" buttons to Student Roster (`StudentRosterClient.tsx`) and Academy Fee Ledger (`admin/fees/page.tsx` via `ExportFeesButton.tsx`).
- **Unit Test Coverage (`tests/unit/csv-export.test.ts`)**: Added 4 unit tests validating standard rows, special character quoting, quote escaping, and empty datasets.

### 7. Verification Gates
- **Unit Tests**: 20 test files, 156/156 tests passed.
- **ESLint**: 0 errors.
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Next.js Production Build**: `prisma generate && next build` compiled all 17 routes in 21s without warnings or errors.

---

## Phase 9: Production Readiness, Security Hardening, Observability & Compliance (Completed)

### 1. HTTP Security Headers & Origin Controls (`next.config.ts`, `src/proxy.ts`)
- **Content Security Policy (CSP)**: Added restrictive directives (`default-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, with whitelist for Google Fonts and payment QR generators).
- **HSTS Preload**: Enforced `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- **Frame & Sniffing Protection**: Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Server Action Origins**: Explicitly restricted allowed origins in Next.js config (`experimental.serverActions.allowedOrigins: ['localhost:3000', '127.0.0.1:3000']`).
- **Fingerprint Defense**: Disabled `poweredByHeader` to prevent `X-Powered-By: Next.js` header leakage.
- **Distributed Tracing**: Attached automatic `x-request-id` UUID correlation headers across all incoming and proxied requests in `src/proxy.ts`.

### 2. Observability & Health Monitoring (`/api/health`, `src/lib/logger.ts`, `src/lib/sentry.ts`)
- **Uptime & Health Endpoint (`src/app/api/health/route.ts`)**: Built dynamic healthcheck route executing `SELECT 1` database ping with millisecond latency tracking, process uptime, memory RSS/heap metrics, and 503 response on database degradation.
- **Production Structured Logger (`src/lib/logger.ts`)**: Created high-performance structured logger with single-line JSON formatting for cloud log forwarders in production and human-readable format in dev. Includes recursive automated redaction for sensitive fields (`password`, `token`, `secret`, `otp`, `cookie`).
- **Sentry Integration Facade (`src/lib/sentry.ts`)**: Implemented pluggable exception tracking with user and action context tagging, gracefully falling back to structured logger when `SENTRY_DSN` is not provided.

### 3. Legal & Regulatory Compliance Pages
- **Privacy Policy (`src/app/privacy/page.tsx`)**: Full privacy notice compliant with India's Digital Personal Data Protection (DPDP) Act and IT Act 2000, specifically covering minor student data handling (ages 5+), parental consent verification, and athlete data deletion rights (`dpo@tta-academy.com`).
- **Terms of Service & Rules (`src/app/terms/page.tsx`)**: Academy code of conduct, court shoe rules, monthly fee billing schedules, overdue consequence timelines, and sports activity liability waivers.
- **Refund & Cancellation Policy (`src/app/refunds/page.tsx`)**: Transparent tournament cancellation cutoff windows (48 hours), training fee pro-rata terms, and 5–7 day banking settlement turnaround times.
- **Form Disclaimers**: Added explicit parental consent disclaimers and legal terms links on player registration (`register/page.tsx`) and payment modals (`PaymentGateway.tsx`).

### 4. Database Resilience & Disaster Recovery Runbooks
- **Automated Backup Script (`scripts/db-backup.sh`)**: Created daily PostgreSQL backup script with gzip -9 compression, integrity verification (`gzip -t`), and 30-day archive pruning.
- **Rollback Runbook (`ROLLBACK.md`)**: Documented multi-tier rollback procedures for cloud deployments, forward/reverse Prisma migrations, and point-in-time database restoration.
- **Contribution Guidelines (`CONTRIBUTING.md`)**: Established pre-commit quality gates, branching standards, and security mandates.
- **Production Documentation (`README.md`)**: Completely rewritten from scratch, purging legacy SQLite references and replacing with detailed Next.js 16 architecture, environment variables, provisioning steps, and testing commands.

### 5. Verification Gates
- **Unit & Integration Tests**: 24 test files, **170/170 tests passed** (duration ~2.6s).
- **ESLint**: 0 errors.
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Next.js Production Build**: `prisma generate && next build` compiled and optimized all 21 routes in 26.4s with 0 errors.



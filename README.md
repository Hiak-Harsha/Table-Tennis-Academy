# Table Tennis Academy (TTA) — Management Portal

A high-performance, production-grade academy operations and athlete portal engineered with **Next.js 16 (App Router)**, **React 19**, **Prisma ORM**, **PostgreSQL**, and the **Match Night Design System**.

---

## 🏓 System Overview

Table Tennis Academy (TTA) provides enterprise-grade academy administration, athlete progression tracking, financial accounting, and competition logistics for professional table tennis academies.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TTA Web Portal                                │
│          Next.js 16 App Router • React 19 • Server Actions              │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
     HTTP / REST / Server Actions            SSE Event Stream (/api/realtime)
                    │                                 │
┌───────────────────▼─────────────────────────────────▼───────────────────┐
│                      Next.js 16 Proxy Engine                            │
│           Role-Based Access Control • Cryptographic Session             │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                    ▼                    ▼
     ┌───────────────────┐ ┌───────────────────┐ ┌───────────────┐
     │  PostgreSQL (DB)  │ │  Razorpay / UPI   │ │  In-Memory    │
     │  Prisma ORM 5.22  │ │  Webhook Engine   │ │  SSE EventBus │
     │  Integer Paise    │ │  HMAC-SHA256      │ │  Replay Ring  │
     └───────────────────┘ └───────────────────┘ └───────────────┘
```

---

## 🌟 Core Features & Modules

### 1. Athlete Dashboard (`/student`)
- **Match Night Overview**: Real-time snapshot of training schedule, pending academy dues, upcoming sanctioned tournaments, and academy notices.
- **Financial Ledger & UPI Payments**: Authoritative integer paise billing. Direct UPI intent deep-linking (`upi://pay`) and dynamic QR code generation with instantaneous webhook reconciliation.
- **Tournament Registration**: Verified category eligibility checking, entry fee processing, and single-registration idempotency guarantees.
- **Squad & Coach Chat**: Real-time messaging with live typing signals, optimistic message deduplication, and zero-reload delivery powered by Server-Sent Events (SSE).
- **Mobile Touch Ergonomics**: Native-like 5-tab sticky bottom navigation (`StudentBottomNav.tsx`), 44px minimum touch targets, and `100dvh` viewport stability.

### 2. Coach Desk & Administration (`/admin`)
- **Athlete Roster Management**: Full player lifecycle tracking (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `GRADUATED`), batch assignments (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`), emergency guardian contacts, and medical safety notes.
- **Financial Ledger & Fee Audits**: Comprehensive fee ledger tracking overdue balances, cash/offline overrides with mandatory audit notes, and RFC 4180 CSV export.
- **Tournament Operations**: Tournament publishing, entry fee configurations, eligibility controls, and participant roster monitoring.
- **Academy Notice Board**: Academy-wide notices categorized by urgency (General, Tournament, Holiday, Urgent).
- **Player Suspension Guardrails**: Two-step destructive confirmation modals and instant cryptographic session revocation on suspension.

---

## 🔒 Security Architecture

| Security Domain | Implementation Standard |
| :--- | :--- |
| **Session Authentication** | Cryptographic HS256 JWT signatures (`jose`) stored in `__Host-` prefixed `httpOnly`, `secure`, `sameSite: lax` cookies, backed by database session records (`Session` model). |
| **Password Security** | Bcrypt (Cost 12) with automatic transparent migration from legacy formats upon successful login. |
| **Brute-Force Defense** | Sliding-window memory rate limiters per IP and phone number (5 attempts / 15 minutes). |
| **Authorization Matrix** | Strict server-side RBAC guards (`requireAdmin()`, `requireStudent(id)`) enforcing cross-tenant isolation across all actions. |
| **Financial Integrity** | Currency represented strictly in integer Indian Paise (1 INR = 100 Paise) eliminating IEEE 754 float drift. Prices always read authoritatively from PostgreSQL. |
| **Payment Webhooks** | HMAC-SHA256 cryptographic signature validation with 5-minute replay prevention and idempotency key locking. |
| **File Upload Security** | Magic byte sniffing (JPEG, PNG, WebP, PDF only). Absolute ban on executable formats and SVGs. Content stored using UUID keys with strict `Content-Disposition`. |
| **Content Security Policy** | Strict CSP headers in `next.config.ts`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `HSTS` preload. |
| **Sanitization & A11y** | DOMPurify HTML sanitization for broadcast announcements. WCAG 2.1 AA focus rings, skip-to-content links, and ARIA live regions. |

---

## 🛠️ Technology Stack

- **Runtime & Framework**: Node.js `v22+` / `v24.x`, Next.js `16.2.1` (App Router), React `19.2.4`
- **Database & ORM**: PostgreSQL with Prisma ORM `5.22.0`
- **Authentication & Cryptography**: `jose` (JWT), `bcryptjs` (Cost 12), Node.js native `crypto`
- **Validation**: Zod `v3.25` schema validation across all inputs and server actions
- **Realtime Engine**: Server-Sent Events (SSE) with circular ring-buffer replay and channel authorization
- **Design System**: Match Night Custom Design Tokens (`tokens.css`), Google Fonts (`Big_Shoulders`, `Barlow`, `Chakra_Petch`)
- **Testing**: Vitest `v5.0` (Unit & Integration, 20 test suites, 160+ tests), Playwright (E2E)

---

## 📋 Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

| Variable | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/tta_db` | PostgreSQL connection string |
| `SESSION_SECRET` | **Yes** | 32+ characters | HS256 HMAC cryptographic signing secret |
| `NODE_ENV` | Optional | `development` | Environment mode (`development`, `test`, `production`) |
| `PORT` | Optional | `3000` | Application HTTP port |
| `RAZORPAY_KEY_ID` | Optional | `rzp_live_...` | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Optional | String | Razorpay API Secret |
| `RAZORPAY_WEBHOOK_SECRET`| Optional | String (min 16 chars) | Webhook signature verification secret |
| `UPI_VPA` | Optional | `tta.academy@upi` | Academy merchant Virtual Payment Address |
| `UPI_MERCHANT_NAME` | Optional | `Table Tennis Academy` | Payee name displayed in UPI apps |
| `SMS_PROVIDER` | Optional | `console` | OTP SMS dispatcher (`console`, `msg91`, `twilio`) |
| `SENTRY_DSN` | Optional | `https://...@sentry.io/...` | Sentry error monitoring DSN |

---

## 🚀 Quickstart & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and a strong 32+ char SESSION_SECRET
```

### 3. Initialize Database
```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations
npm run db:migrate:deploy
```

### 4. Provision Initial Administrator
```bash
npm run admin:create
# Follow interactive prompts to configure phone number, name, and secure password
```

### 5. Start Development Server
```bash
npm run dev
# Access http://localhost:3000 in your browser
```

---

## 🧪 Testing & Verification Suite

TTA adheres to a strict zero-regression quality gate. All checks must pass before any production deployment:

```bash
# Run complete unit and integration test suite (Vitest)
npm test

# Run ESLint validation
npm run lint

# Run strict TypeScript compiler verification
npx tsc --noEmit

# Run production build and page optimization
npm run build

# Run Playwright End-to-End browser test suite
npx playwright test
```

---

## 📦 Operational Runbooks & Release Engineering

### Production Deployment Procedure
1. **Pre-Flight Check**: Ensure all tests, linter, and typechecks pass (`npm test && npm run lint && npx tsc --noEmit`).
2. **Database Migration**: Run `npm run db:migrate:deploy` to apply new PostgreSQL migrations safely without data loss.
3. **Build Bundle**: Execute `npm run build`.
4. **Health Check**: After launch, verify endpoint responds with `200 OK`:
   ```bash
   curl -i https://your-domain.com/api/health
   ```

### Automated Database Backups
A production backup script with automated 30-day retention pruning is provided in `scripts/db-backup.sh`:
```bash
chmod +x scripts/db-backup.sh
./scripts/db-backup.sh
```

### Rollback Procedures
For detailed disaster recovery and rollback guidelines, consult [ROLLBACK.md](ROLLBACK.md).

---

## ⚖️ Legal & Compliance

- **Privacy Policy**: Minor athlete data protections (ages 5+), parental consent verification, and DPDP Act compliance documented at `/privacy`.
- **Terms of Service**: Academy code of conduct, fee billing cycles, and liability waivers documented at `/terms`.
- **Refund & Cancellation**: Transparent tournament fee cancellation windows and training fee terms documented at `/refunds`.

---

© 2026 Table Tennis Academy. Engineered for Champions.

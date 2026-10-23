# Vercel Production Deployment Guide

This guide details how to deploy the **Table Tennis Academy (TTA)** management portal to Vercel for high-availability, zero-maintenance serverless production.

---

## 🚀 1. One-Click / Git Deployment via Vercel Dashboard

1. **Import Project**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository: `Hiak-Harsha/Table-Tennis-Academy`.
   - **Framework Preset**: Vercel will automatically detect `Next.js`.
   - **Root Directory**: `./` (leave default).

2. **Build and Output Settings**:
   - The project includes [`vercel.json`](./vercel.json) pre-configured with:
     ```json
     {
       "$schema": "https://openapi.vercel.sh/vercel.json",
       "framework": "nextjs",
       "buildCommand": "prisma generate && next build"
     }
     ```
   - No overrides are required in the Vercel dashboard.

---

## 🔐 2. Environment Variables Configuration

Add the following environment variables in your Vercel Project Settings under **Settings -> Environment Variables**:

| Variable | Environment | Required | Value / Format | Description |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Production, Preview | **Yes** | `postgresql://user:pass@host:5432/db?sslmode=require` | Connection string to your hosted PostgreSQL database (Neon, Supabase, Vercel Postgres, AWS RDS, Railway) |
| `SESSION_SECRET` | Production, Preview | **Yes** | 32+ character random string | Cryptographic HS256 JWT signing secret. Generate with `openssl rand -base64 32` |
| `UPI_VPA` | Production | Optional | `tta.academy@upi` | Academy merchant UPI VPA identifier |
| `UPI_MERCHANT_NAME` | Production | Optional | `Table Tennis Academy` | Payee business name displayed in UPI apps |
| `RAZORPAY_KEY_ID` | Production | Optional | `rzp_live_...` | Razorpay gateway live key ID |
| `RAZORPAY_KEY_SECRET` | Production | Optional | Live secret string | Razorpay gateway live secret |
| `RAZORPAY_WEBHOOK_SECRET` | Production | Optional | 16+ character string | Webhook signature HMAC secret |
| `SENTRY_DSN` | Production | Optional | `https://...@sentry.io/...` | Sentry error monitoring DSN |

> [!IMPORTANT]
> - Never use the default development string for `SESSION_SECRET` in production runtime; the application will reject requests to prevent session tampering.
> - Ensure your PostgreSQL provider allows inbound connections from Vercel Serverless IPs (`0.0.0.0/0` with SSL enabled).

---

## 🗄️ 3. Database Schema Provisioning

Because Vercel Serverless builds run in ephemeral containers without direct interactive database migration prompts, apply your schema directly to your production database once:

From your local machine or terminal:
```bash
# Push schema directly to your hosted database
DATABASE_URL="postgresql://user:password@host/db?sslmode=require" npx prisma db push

# Provision your primary Academy Administrator account
DATABASE_URL="postgresql://user:password@host/db?sslmode=require" npm run admin:create
```

---

## 🛡️ 4. Security & Optimization Features Included

The repository has been built with native Vercel production hardening:
- **Prisma Dual Architecture**: `schema.prisma` includes `rhel-openssl-3.0.x` and `debian-openssl-3.0.x` binary targets for seamless AWS Lambda / Vercel Serverless execution.
- **Server Action CSRF Protection**: `next.config.ts` automatically recognizes `*.vercel.app` and `process.env.VERCEL_URL`.
- **Content Security Policy (CSP)**: Whitelists Vercel Web Analytics (`https://va.vercel-scripts.com`, `https://*.vercel-insights.com`, `https://*.vercel-analytics.com`).
- **Build-Time Resilience**: Prerendering and static bundling in `src/lib/env.ts` gracefully fallback during builds, while strictly enforcing credentials at request time.

---

## 🩺 5. Post-Deployment Verification

After deployment completes:

1. **Health Check Endpoint**:
   Visit:
   ```
   https://<your-project>.vercel.app/api/health
   ```
   You should receive a `200 OK` response with:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "uptime": 12.34,
     "database": {
       "status": "healthy",
       "latencyMs": 14
     },
     "memory": { ... }
   }
   ```

2. **Admin Portal**:
   Navigate to `https://<your-project>.vercel.app/login` and log in with your provisioned administrator credentials.

3. **Custom Domain (Optional)**:
   If configuring a custom domain (e.g. `portal.myacademy.com`):
   - Add the domain in Vercel **Settings -> Domains**.
   - If using Server Actions from that domain, add your custom domain to `vercelOrigins` in `next.config.ts` or set `NEXT_PUBLIC_APP_URL`.

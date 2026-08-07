# TTA Elite Academy — Management System

A premium, modern, and fully-responsive Table Tennis Academy Management System built with **Next.js (App Router)**, **TypeScript**, **Prisma ORM**, **SQLite**, and a custom **Vanilla CSS Design System**.

---

## 🌟 Features

### 👨‍🎓 Student Dashboard
* **Overview Feed**: Instant lookup of upcoming academy fees, registered tournaments, system announcements, and unread notifications.
* **Profile Management**: Update training bios, custom social links (Twitter/X, Instagram), and basic contact detail records.
* **Fee Verification & History**: View complete fee history, submit payments (supporting UPI payment confirmation hashes, Cash, or Cards), and view receipt references.
* **Tournament Enrollment**: Register for upcoming tournaments, view venue/eligibility rules, and process tournament entry fee payments.
* **Interactive Connect Hub**: Communicate with coaches, administrative staff, or fellow athletes using private, batch-specific (Beginner, Intermediate, Advanced), or global chat channels with support for media file sharing (Images, PDFs, and Documents).

### 👑 Administrative Portal
* **Student Roster Management**: Add new student athletes, assign unique Academy IDs, modify active training batch categories, and toggle enrollment statuses (Active, Inactive, Suspended, Graduated).
* **Financial Ledger & Billing**: Track fee statuses across the academy (PAID, DUE, OVERDUE), review mock payments, approve student UPI transactions, and issue receipts.
* **Tournament Operations**: Schedule new tournaments (date, location, entry fee, levels, eligibility) and monitor entry payments for each event.
* **System Broadcasts**: Publish academy-wide announcements (categorized as General, Tournament, Holiday, or Urgent) appearing instantly on all student feeds.
* **Coaching & Chat Center**: Manage private chat messages and answer student queries directly.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | React Server Components & Server Actions for data fetching & mutations |
| **Database** | SQLite | Serverless local SQL database, ideal for prototyping and standalone deployments |
| **ORM** | Prisma | Typesafe database client, schemas, and migrations |
| **Styling** | Vanilla CSS (CSS Variables) | Tailored HSL color palette, dark mode, glassmorphism, responsive utilities, and smooth micro-animations |
| **Validation** | Zod | Robust schema validation for API payloads and forms |
| **Language** | TypeScript | Strong typing across client, server, and database layers |

---

## 📂 Project Architecture

```text
table-tennis-app/
├── prisma/                  # Prisma schema, migrations, and SQLite DB files
│   ├── dev.db               # SQLite local database (ignored in Git)
│   └── schema.prisma        # Prisma Database Schema definition
├── src/
│   ├── actions/             # Next.js Server Actions (mutations & queries)
│   │   ├── admin.ts         # Administrative dashboard actions
│   │   ├── auth.ts          # Auth credentials management & session handling
│   │   ├── chat.ts          # Real-time chat & document sharing operations
│   │   ├── fees.ts          # Fee auditing & student payment processing
│   │   └── student.ts       # Student profile & tournament registry actions
│   ├── app/                 # Next.js App Router Pages
│   │   ├── (admin)/         # Admin dashboard pages and layout
│   │   ├── (dashboard)/     # Student dashboard pages and layout
│   │   ├── api/             # API routes (e.g. database seed checking)
│   │   ├── home/            # Welcome/landing page
│   │   ├── login/           # Authentication portal (Login)
│   │   ├── register/        # Student self-enrollment page
│   │   ├── globals.css      # Core Design System, CSS variables & animations
│   │   ├── layout.tsx       # Root layout entry point
│   │   └── page.tsx         # Root routing redirect logic
│   ├── components/          # Reusable shared UI components
│   ├── lib/                 # Core utilities, auth helpers, and Prisma client
│   └── middleware.ts        # Route protection & role-based authentication check
├── check_db.js              # Script to inspect DB records directly via CLI
├── seed.mjs                 # Seed file to pre-populate database with default admin & student accounts
├── package.json             # NPM dependencies & project scripts
└── tsconfig.json            # TypeScript configuration
```

---

## 🗄️ Database Schema & Models

The SQLite database is managed using Prisma. The primary entities are:
* **`User`**: Account credentials, telephone login, role identification (`ADMIN` or `STUDENT`).
* **`Student`**: Extended profile containing academy details, enrollment state, batch assignment, and relationships to fees/tournaments.
* **`AcademyFee`**: Recurring monthly fee items detailing due date, billing status (`DUE`, `PAID`, `OVERDUE`), payment mechanism, and confirmation hash.
* **`Tournament`**: Scheduled competitions showing location, entry fees, eligibility criteria, and date.
* **`TournamentPayment`**: Tracks registered students for a specific tournament and their entry payment status.
* **`Notification`**: Direct user notifications alerting them of overdue bills or system changes.
* **`Broadcast`**: Academy-wide notices published by admins.
* **`ChatMessage`**: Logs chat channels, supporting file sharing details (file URL, type, and name).

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js** (v18.x or later recommended)
* **npm**, **yarn**, or **pnpm**

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root of the project:
```env
DATABASE_URL="file:./prisma/dev.db"
SESSION_SECRET="your-super-secret-random-key"
```

### 3. Database Initialization & Seed
Generate the Prisma Client, run migration scripts, and seed the database with initial users:
```bash
# Generate Prisma Client
npx prisma generate

# Create tables & run migrations
npx prisma db push

# Seed the database with initial test credentials
node seed.mjs
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔑 Default Credentials

After seeding, the database will be pre-populated with:

* **Administrator Portal**:
  * **Phone**: `admin`
  * **Password**: `admin`
* **Student Portal**:
  * **Phone**: `1234567890`
  * **Password**: `pw`

---

## 🛠️ Verification & Direct Utilities

You can verify active database contents at any point in terminal without loading the web interface:
```bash
node check_db.js
```
This utility lists all registered phones, roles, profile completion states, and active student registries.

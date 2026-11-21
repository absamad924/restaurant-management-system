# Restaurant Management System (RMS)

A full-stack, real-time Restaurant Management System built with **Express**, **Prisma 8 ORM (`@prisma/orm-postgres`)**, **PostgreSQL**, **React (Vite + Tailwind CSS)**, **Socket.io**, and **Expo (React Native)**. Designed for fast local-network operation with real-time synchronization between the **Admin Control Panel**, **Cashier POS**, **Kitchen Display System (KDS)**, and **Customer Mobile App**.

---

## Key Features

- **Role-Based Access Control (RBAC):** Dedicated authentication and route guards for `MANAGER`, `CASHIER`, and `KITCHEN` accounts.
- **Cashier POS (`/pos`):**
  - Live menu catalog search and instant out-of-stock status updates.
  - **Dual-Order Flow:**
    - **Direct Sale:** Instant payment settlement (`CASH`, `CARD`, `TRANSFER`) with automatic change calculation and **80mm thermal receipt printing**.
    - **Kitchen Order:** Dispatches orders straight to the KDS queue and tracks unpaid bills in a real-time **Open Kitchen Tabs** slide-over drawer.
- **Kitchen Display System (`/kds`):**
  - Live WebSocket ticket queue (`new_order`) with audio alerts.
  - One-tap **Bump (Complete)** action (`READY`) that notifies the Cashier POS in real time.
- **Admin Control Panel (`/admin`):**
  - Live sales analytics (Total Revenue, Total Orders, Average Order Value).
  - Monthly-grouped **Transaction Ledger** and **Recent Transactions** (`DD/MM/YYYY` formatting) with color-coded payment badges.
  - Menu catalog & stock availability management (`menu_updated` live broadcast).
  - Staff password reset settings for `manager`, `cashier`, and `kitchen` accounts.
- **Customer Mobile App (`apps/mobile`):**
  - Account-free price checking and self-ordering UI for Dine-In / Takeaway *(in progress on `phase-5`)*.

---

## Project Structure

```text
restaurant-management-system/
├── apps/
│   ├── server/              # Express API, Socket.io server & Prisma 8 PostgreSQL runtime
│   │   ├── prisma/          # schema.prisma & seed.ts
│   │   ├── prisma.config.ts # Prisma 8 ORM & contract configuration
│   │   └── src/             # Routes, middleware & emitted Prisma contract (src/prisma/)
│   ├── web/                 # React + Vite + Tailwind CSS frontend (Admin, POS, KDS)
│   └── mobile/              # Expo (React Native + TypeScript) Customer App
└── package.json
```

---

## Prerequisites

Make sure the following are installed on your machine before cloning:

- **Node.js** (v20 or higher)
- **PostgreSQL** (running locally on port `5432`)
- **Git**

---

## Getting Started (Installation & Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/absamad924/restaurant-management-system.git
cd restaurant-management-system
```

### 2. Configure the Backend (`apps/server`)
Navigate to the server folder and install dependencies:
```bash
cd apps/server
npm install
```

Create a `.env` file inside `apps/server/` with your PostgreSQL connection string and JWT secret:
```env
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/rms_db"
JWT_SECRET="your_super_secret_jwt_key"
PORT=5000
```

Emit the Prisma 8 schema contract, sign & verify the PostgreSQL database, and seed the default staff accounts and menu items:
```bash
npx prisma contract emit
npx prisma db sign
npx prisma db verify
npx tsx prisma/seed.ts
```

Start the Express + Socket.io backend server (use `watch` during development for auto-reload):
```bash
npx tsx watch src/server.ts
```
*(The API and WebSocket server will run on `http://localhost:5000`.)*

### 3. Configure the Web Frontend (`apps/web`)
Open a second terminal, navigate to `apps/web`, install dependencies, and start Vite:
```bash
cd apps/web
npm install
npm run dev
```
*(The web app will be available at `http://localhost:5173`.)*

---

## Default Staff Credentials

After running `npx tsx prisma/seed.ts`, you can log in at `http://localhost:5173/login` with these seeded accounts:

| Role | Username | Default Password | Redirect Route |
| :--- | :--- | :--- | :--- |
| **Manager (Admin)** | `manager` | `managerSecure123` | `/admin` |
| **Cashier (POS)** | `cashier` | `cashierSecure123` | `/pos` |
| **Kitchen (KDS)** | `kitchen` | `kitchenSecure123` | `/kds` |

*(Passwords can be changed anytime by a Manager under **Admin Control Panel → System Settings**.)*

---

## Useful Database & Contract Commands

Run these inside `apps/server`:

- **Re-emit Contract After Editing `schema.prisma`:**
  ```bash
  npx prisma contract emit
  ```
- **Sign & Verify Database Schema State:**
  ```bash
  npx prisma db sign
  npx prisma db verify
  ```
- **Re-seed Default Users & Menu:**
  ```bash
  npx tsx prisma/seed.ts
  ```
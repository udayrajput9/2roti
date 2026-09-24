# 2 ROTI – Full-Stack Food Ordering & Enterprise ERP Platform

A modern, production-grade, and security-audited full-stack food delivery and operations ecosystem built for **2 Roti**, serving Gorakhpur campuses (**Jhungiya, Buddha, KIPM, ITM**) and the **Jhungiya Physical Outlet**.

---

## 🏗️ Architecture & Component Overview

```
2roti/
├── api-server/         # Node.js/Express Backend (Port 5000)
│   ├── Knex + SQLite DB (Postgres-ready schema)
│   ├── Real-time WebSockets (/ws) with Audio Chimes
│   ├── Razorpay Payment Gateway & Idempotent Webhook Engine
│   ├── Customer Loyalty Wallet (₹3 Cashback on Delivery)
│   ├── Vendor Cost Accounting & UTR Batch Settlements
│   ├── Dynamic CSV/XLSX Menu Uploader with Validation & Audits
│   └── Anti-Bot Shield (Honeypot, Rate Limiter, IP Threat Scorer)
│
├── website/            # Customer Web App (Port 5173 - Mobile-First React)
│   ├── Animated SVG 2 Roti Splash Screen
│   ├── Phone OTP / Password Authentication
│   ├── Mandatory Campus Onboarding (Jhungiya, Buddha, KIPM, ITM)
│   ├── 4 Category Tabs (Curry, Thali, Biryani, Pizza)
│   ├── Search Page with Veg/Non-Veg & Price Filters
│   ├── Strict Proximity-Gated Outlet Section (CSV Menu Items)
│   ├── 1-Click "Pay with 2 Roti Wallet" (>= ₹50 balance check)
│   ├── Live Order Tracking Stepper with Campus Runner details
│   └── Mobile Thumb-Friendly BottomNav
│
└── admin-web/          # Modern ERP Portal (Port 5174 - Admin & Vendor)
    ├── Executive ERP Dashboard (GMV, Platform Net Margin, Distribution)
    ├── Mobile-Friendly Kitchen & Dispatch Feed (Touch targets, Chimes)
    ├── Vendor Settlements & Wallet Ledger (Bank UTR tracking, Order Locking)
    ├── Dynamic Menu Management (CSV Upload, Validation, Preview & Audit)
    ├── Customer Directory with Campus Distribution & Account Blocking
    ├── Razorpay Realtime Captured Logs & Gated Webhook Simulator
    ├── Instant Refund Engine with Automatic Wallet Re-Credit
    ├── Role-Based Access Control (RBAC: Admin, Manager, Vendor)
    └── Security Audit Dashboard & IP Blacklist
```

---

## 🚀 How to Run the Applications

### Prerequisites
- Node.js (v18+) and npm installed.

### 1. Start the API Server (Backend)
```bash
cd api-server
npm start
```
*API runs on `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`)*

### 2. Start the Customer Website (Frontend)
```bash
cd website
npm run dev
```
*Customer Web App opens on `http://localhost:5173`*

### 3. Start the Admin & Vendor ERP (Operations Portal)
```bash
cd admin-web
npm run dev
```
*Admin ERP opens on `http://localhost:5174`*

---

## 🔑 Default Staff Credentials (Pre-Seeded)

The database comes pre-seeded with test accounts for all roles:

| Role | Email | Password | Scope / Permissions |
|---|---|---|---|
| **Super Admin** | `admin@2roti.com` | `Admin@2Roti2026` | Full platform access (Analytics, Settlements, CSV Upload, Security, Refunds, RBAC) |
| **Order Manager** | `manager@2roti.com` | `Manager@2Roti2026` | Live campus order dispatch, runner assignment, customer directory |
| **Jhungiya Vendor** | `vendor.jhungiya@2roti.com` | `Vendor@2Roti2026` | Mobile-friendly kitchen orders (Jhungiya outlet only), vendor wallet balance & settlement payouts |

---

## 💎 Key Business & Architectural Features

### 1. Animated Splash Screen
Exact high-fidelity port of `assets/splash_screen.html` with glowing squircle, bouncing teardrop pin, spinning roti puff inside the pin hole, animated swoosh lines, and phased status progress bar ("Fresh roti on the way" ➔ "Piping hot" ➔ "Rider on the way" ➔ "Delivered!").

### 2. Customer Loyalty Wallet
- **₹3 Cashback**: Credited automatically when order reaches `DELIVERED` status (strictly non-wallet real-money orders to prevent infinite loop exploits).
- **1-Click Redemption**: When balance is $\ge ₹50.00$ and covers the full order, customer can pay 100% via wallet at checkout.
- **Refunds & Zero-Floor Protection**: Wallet-paid orders are refunded back to the customer's wallet. If a delivered order is refunded, cashback is revoked without allowing balance to drop below ₹0.

### 3. Vendor Financial Accounting & Double-Entry Ledger
- Vendor **always** receives their negotiated `vendor_cost` for delivered orders, regardless of customer paying via Razorpay or Loyalty Wallet (platform absorbed).
- **Settlement Batches**: Super Admin enters the Bank UTR / IMPS reference number. Upon payment confirmation, the batch of orders is stamped with `settlement_id` and permanently locked against duplicate payouts.
- Downloadable settlement history report (CSV export).

### 4. Dynamic Menu CSV/XLSX Upload
- Super Admin can upload new outlet menu sheets anytime.
- Pre-validation ensures prices are numeric, customer price $\ge$ vendor cost, duplicates are flagged, and invalid rows are rejected.
- Live interactive preview table shows calculated margins before committing to SQLite.
- Complete audit trail logs who uploaded what and when.

### 5. Proximity-Gated Outlet Orders
- Enforces the mandatory disclaimer:
  > *"Aap tabhi order karein jab aap humare outlet pe ho. Agar outlet ke paas nahi hai jo ki Jhungiya me hai toh aap is section me order na karein."*
- Proximity confirmation modal requires explicit confirmation before viewing or ordering the 25+ outlet CSV items.

### 6. Security & Anti-Bot Shield
- `httpOnly` secure cookies with refresh token rotation.
- Hidden honeypot form fields (`_hp_trap`) trap automated crawlers and immediately block malicious IPs with threat scoring.
- Webhook idempotency prevents duplicate credits on retried Razorpay webhooks.
- Test webhook simulator is strictly gated and requires typing `"CONFIRM"` in capital letters.

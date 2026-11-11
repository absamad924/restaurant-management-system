# Software Requirements Specification (SRS)
## Restaurant Management System (RMS)

### 1. Introduction

#### 1.1 Purpose
This document serves as the formal project breakdown and technical specification for the Restaurant Management System (RMS). It outlines the comprehensive system architecture, functional and non-functional requirements, data schemas, and hardware/software specifications required to develop and deploy the proposed enterprise solution.

#### 1.2 System Scope
The RMS manages multi-channel restaurant operations, bridging frontline cashiers, kitchen staff, restaurant managers, and customers. The system supports two distinct order processing workflows:
1. **Kitchen Order Flow:** Post-paid, multi-item appendable orders requiring thermal prep slips, order status tracking (PENDING_KITCHEN -> READY -> SERVED), and deferred payment settlement.
2. **Direct Sales Flow:** Immediate counter checkouts for instant items bypassing the kitchen queue with single-step payment settlement.

---

### 2. Overall Architecture & Project Layout

#### 2.1 Monorepo Architecture
The platform is organized as a unified monorepo divided into isolated sub-applications and shared packages:
* **apps/web**: Single Page Application (React, Vite, Tailwind CSS) hosting the Cashier POS, Manager Analytics Dashboard, Landing Page, and User Authentication.
* **apps/mobile**: Cross-platform customer mobile application (React Native, Expo) for live price checking and order placement.
* **apps/server**: Central Node.js, Express, and Socket.io API server controlling real-time data sync, database persistence via Prisma ORM, and ESC/POS thermal printing commands.
* **packages/shared-types**: Shared TypeScript interface definitions and Data Transfer Objects (DTOs) utilized across web, mobile, and server environments.

#### 2.2 Directory Structure
```text
restaurant-management-system/
├── apps/
│   ├── web/             # React (Vite) - Cashier POS, Manager Dashboard, Landing, Auth
│   ├── mobile/          # React Native (Expo) - Customer Price Lookup & Ordering
│   └── server/          # Node.js Express API, WebSockets & ESC/POS Printers
├── packages/
│   └── shared-types/    # Shared TypeScript interfaces & DTOs
├── docs/
│   └── SRS.md           # Software Requirements Specification
├── package.json         # Master workspace configuration
└── README.md
```

---

### 3. User Roles & Access Control

* **Cashier:** Primary interface is the Web POS (`apps/web`). Capable of creating kitchen orders, appending extra items to open tables, processing direct counter sales, settling payments, and issuing thermal receipt print jobs.
* **Manager:** Primary interface is the Admin Dashboard (`apps/web`). Capable of reviewing real-time sales analytics, controlling menu catalog pricing and stock levels, managing staff accounts, and viewing audit logs.
* **Customer:** Primary interface is the Mobile App (`apps/mobile`). Capable of browsing the digital menu catalog, verifying live pricing, selecting fulfillment mode (Takeaway or manual Table Number), and placing orders.

---

### 4. Functional Requirements

#### 4.1 Landing Page & Authentication Module
* **FR-AUTH-01 (Public Showcase):** The system must present a public landing page detailing platform capabilities, feature overviews, and entry points for restaurant operations.
* **FR-AUTH-02 (Unified Authentication):** The system must provide role-based authentication supporting CASHIER, MANAGER, and CUSTOMER credentials.
* **FR-AUTH-03 (Role Routing):** Upon successful authentication, users must be automatically routed to their authorized workspace (`/pos` for Cashiers, `/admin` for Managers, `/menu` for Customers).

#### 4.2 Cashier Point of Sale (POS) Module
* **FR-POS-01 (Dual Flow Mode):** Cashiers must be able to toggle dynamically between Kitchen Order mode and Direct Sale mode per transaction.
* **FR-POS-02 (Kitchen Ticket Generation):** Submitting a Kitchen Order must assign the status PENDING_KITCHEN and issue a print payload to the kitchen thermal printer.
* **FR-POS-03 (Order Appending):** Cashiers must be able to query active PENDING_KITCHEN orders by Table Number or Order ID to append additional items, issuing supplemental kitchen prep slips.
* **FR-POS-04 (Payment Settlement):** Executing payment settlement on active orders must transition status to COMPLETED, update paymentStatus to PAID, log the payment method (CASH, CARD, TRANSFER), print a customer receipt, and record the transaction in sales analytics.
* **FR-POS-05 (Direct Sales Execution):** Direct Sales must process as a single atomic transaction that marks the order COMPLETED and PAID immediately, bypassing the kitchen queue.

#### 4.3 Manager Analytics & Catalog Module
* **FR-MGR-01 (Real-Time Revenue Analytics):** The dashboard must calculate live metrics including total revenue, peak sales hours, average transaction value, and payment method breakdowns.
* **FR-MGR-02 (Catalog Management):** Managers must have full CRUD control over Menu Items and Categories. Price adjustments must update instantly across POS screens and customer mobile apps.
* **FR-MGR-03 (Automated Stock Tracking):** Completing an order must automatically deduct raw stock counts. Items reaching zero stock must display an "Out of Stock" badge across all interfaces.

#### 4.4 Customer Mobile App Module
* **FR-MOB-01 (Live Price & Catalog Lookup):** The mobile application must fetch up-to-date item pricing, descriptions, and stock availability directly from the central database.
* **FR-MOB-02 (Manual Fulfillment Selection):** Customers must specify whether their order is Takeaway or manually input their Table Number (for Dine-in). QR code scanning is excluded.
* **FR-MOB-03 (Direct Order Placement):** Submitted mobile orders must dispatch directly into the Cashier POS order queue and trigger kitchen ticket creation.

---

### 5. Entity & Data Schema Specifications

#### 5.1 State Machine Transitions

Draft/Cart -> Submit Kitchen -> PENDING_KITCHEN -> Prep Complete -> READY -> Payment Settle -> COMPLETED (Sales Logged)

Draft/Cart -> Direct Checkout -> COMPLETED (Sales Logged)

#### 5.2 Core Data Models

* **User**: id, name, email, role (MANAGER, CASHIER, CUSTOMER), passwordHash, createdAt.
* **Category**: id, name, description.
* **MenuItem**: id, categoryId, name, price, description, isAvailable, stockCount.
* **Order**: id, orderNumber, tableNumber, flow (KITCHEN_ORDER, DIRECT_SALE), type (DINE_IN, TAKEAWAY), status (PENDING_KITCHEN, READY, COMPLETED, CANCELLED), paymentStatus (UNPAID, PAID), paymentMethod (CASH, CARD, TRANSFER), totalAmount, createdAt.
* **OrderItem**: id, orderId, menuItemId, quantity, unitPrice, notes, addedAt.

---

### 6. Non-Functional Requirements

#### 6.1 Performance & Sync
* **POS Responsiveness:** Cart recalculations and menu item additions must execute in under 50ms.
* **Real-time Synchronization:** Orders submitted via mobile app or POS interfaces must update connected kitchen and manager screens via WebSockets within 500ms.

#### 6.2 Hardware & Thermal Printer Integration
* **Thermal Printing:** The server must interface with local network or USB ESC/POS thermal printers via raw TCP/IP or serial sockets to format and cut receipt slips.

#### 6.3 Security & Data Integrity
* **Role-Based Access Control:** API endpoints must validate user permissions via JWT tokens.
* **ACID Transactions:** Financial record updates and inventory deductions must execute within database transactions to prevent partial commits.
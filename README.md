# Campus Grid — Resource Governance System

A centralized, production-ready web platform for managing room bookings and shared campus resources. Built with **Next.js 15**, **PostgreSQL**, **Prisma**, and **Tailwind CSS**.

## Features

- **JWT Authentication** with role-based access control (Student, Club Admin, Department Officer, Super Admin)
- **Resource & Room Registry** — create/manage rooms, equipment, and assets with booking constraints
- **Weekly Calendar View** — real-time availability with visual slot display
- **Deterministic Waitlist** — FCFS mechanism with automatic promotion on cancellation
- **Approval Workflow** — routed requests with approve/reject + comments
- **Audit Logging** — immutable log for all booking and admin actions
- **Email Notifications** — booking confirmations, approvals, rejections, waitlist promotions
- **Real-time Notifications** — in-app notification bell with unread counts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API Routes (REST), Zod validation |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (jose), bcryptjs, HttpOnly cookies |
| Email | Nodemailer |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secret
```

### 3. Set up database

```bash
# Start PostgreSQL with Docker (optional)
docker compose up db -d

# Push schema and generate client
npx prisma db push
npx prisma generate

# Seed with test data
npm run db:seed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker Deployment

```bash
docker compose up --build
```

## Test Accounts

All test accounts use password: `password123`

| Role | Email |
|------|-------|
| Super Admin | admin@campusgrid.edu |
| Department Officer | officer@campusgrid.edu |
| Club Admin | clubadmin@campusgrid.edu |
| Student | student@campusgrid.edu |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login & Registration pages
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── dashboard/   # Overview with stats
│   │   ├── calendar/    # Weekly calendar view
│   │   ├── bookings/    # My bookings + create
│   │   ├── resources/   # Resource registry
│   │   ├── approvals/   # Pending approval queue
│   │   ├── audit/       # Immutable audit logs
│   │   └── admin/users/ # User management (Super Admin)
│   └── api/             # REST API endpoints
├── components/          # Reusable UI components
├── hooks/               # React hooks
├── lib/                 # Server utilities (auth, db, email, audit)
└── types/               # TypeScript type definitions
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/me` | Current user | Required |
| GET/POST | `/api/resources` | List/Create resources | Required |
| GET/PUT/DELETE | `/api/resources/[id]` | Resource CRUD | Required |
| GET/POST | `/api/bookings` | List/Create bookings | Required |
| GET | `/api/bookings/[id]` | Booking details | Required |
| PATCH | `/api/bookings/[id]/approve` | Approve booking | Officer+ |
| PATCH | `/api/bookings/[id]/reject` | Reject booking | Officer+ |
| PATCH | `/api/bookings/[id]/cancel` | Cancel booking | Owner |
| GET | `/api/calendar/[resourceId]` | Weekly calendar data | Required |
| GET | `/api/audit` | Audit logs | Officer+ |
| GET | `/api/users` | User list | Super Admin |
| PATCH | `/api/users/[id]/role` | Change user role | Super Admin |
| GET/PATCH | `/api/notifications` | Notifications | Required |
| GET | `/api/stats` | Dashboard stats | Required |

## Role Permissions

| Feature | Student | Club Admin | Dept Officer | Super Admin |
|---------|---------|------------|-------------|-------------|
| Create bookings | Yes | Yes | Yes | Yes |
| View calendar | Yes | Yes | Yes | Yes |
| Approve bookings | — | Own resources | Own resources | All |
| Create resources | — | — | Yes | Yes |
| View audit logs | — | — | Yes | Yes |
| Manage users | — | — | — | Yes |

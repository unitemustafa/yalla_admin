# Yalla Admin

Yalla Admin is the internal management dashboard for Yalla Market. It is built with the Next.js App Router and connects directly to the Django REST API to manage products, orders, offers, customers, partners, couriers, cities, and delivery zones.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest
- ESLint

## Prerequisites

Before running the dashboard, make sure you have:

- Node.js 20 or later
- npm 10 or later
- A running instance of `yalla_backend`
- A valid backend admin account

## Getting Started

Install the dependencies and create your local environment file:

```bash
npm ci
cp .env.example .env.local
```

On Windows PowerShell, use the following command instead of `cp`:

```powershell
Copy-Item .env.example .env.local
```

Update the backend URLs in `.env.local`, then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with an admin account from the Django backend.

## Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Full Django API base URL, typically ending in `/api/v1`. |
| `NEXT_PUBLIC_BACKEND_URL` | Backend origin used to resolve relative `/media/` paths. |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Optional dedicated media origin when files are served from a separate domain. |

All `NEXT_PUBLIC_*` values are embedded in the browser bundle during `next build`. Do not use them for passwords, access tokens, or other secrets.

Local `.env*` files are ignored by Git. Only `.env.example` should be committed.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with Webpack. |
| `npm run dev:turbo` | Start the development server with Turbopack. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Generate Next.js route types and run strict TypeScript checks. |
| `npm run sizecheck` | Fail when a source file exceeds 800 lines. |
| `npm run test` | Run the Vitest test suite once. |
| `npm run test:coverage` | Run unit tests with coverage thresholds. |
| `npm run deadcode` | Find unused files, exports, and dependencies with Knip. |
| `npm run build` | Create an optimized production build. |
| `npm run start` | Start the production server after a successful build. |
| `npm run audit:prod` | Audit production dependencies for known vulnerabilities. |
| `npm run check` | Run linting, type checks, tests, dead-code checks, a production build, and the production dependency audit. |

Knip ignores `tailwindcss` and `tw-animate-css` because they are loaded through CSS imports in `app/globals.css`, which are not tracked by TypeScript export analysis.

## Production Build

Run the complete verification pipeline before deployment:

```bash
npm ci
npm run check
```

To run the production build locally:

```bash
npm run start
```

Configure production environment variables on the hosting platform before running `npm run build`, because public environment values are embedded at build time.

## Project Structure

```text
app/                 Next.js routes and lightweight route wrappers
components/          Shared application components
features/auth/       Authentication state, login, and route protection
features/dashboard/  Dashboard domains, pages, API clients, and UI components
lib/                 Shared configuration and utilities
public/              Fonts, branding assets, and placeholder images
tests/               Application-level tests
```

The Django API remains the source of truth. Route files under `app/` should stay lightweight, while screen logic and domain behavior belong under `features/`.

## Main Routes

- Authentication: `/login`
- Dashboard: `/dashboard`
- Products: `/items`, `/items/create`, `/items/edit/[itemId]`
- Product organization: `/items/shops`, `/items/store-subcategories`, `/items/addons`
- Categories: `/categories/markets`, `/categories/market-types`
- Orders: `/orders`, `/orders/create`, `/orders/view/[orderId]`
- Offers: `/offers`, `/offers/create`
- Customers and partners: `/customers`, `/partners`
- Delivery operations: `/cities`, `/delivery-zone`, `/delivery/couriers`
- Administration: `/account`, `/settings`, `/notifications`
- Archives: `/archives/products`, `/archives/shops`, `/archives/offers`, `/archives/cities`, `/archives/delivery-zones`

## Additional Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) explains the domain structure, data flow, and canonical routes.
- [`API_REPORT.md`](./API_REPORT.md) documents known Django API contract mismatches that remain outside the admin dashboard refactor scope.

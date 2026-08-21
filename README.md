
# Odinum (Project: Odin-Book)

![Odinum](.github/images/odinum-header.png)

Odinum is a full-stack, real-time social networking platform built with a **TypeScript Monorepo architecture**. It’s a portfolio project built as the final project in [The Odin Project](https://www.theodinproject.com/lessons/node-path-nodejs-odin-book) Node.js course and designed to explore how complex validation, decoupled workspace packages, and fluid real-time communication work together across full-stack applications.

Rather than taking quick and easy shortcuts, this platform was built to tackle real-world development challenges, like handling serverless cloud cold starts smoothly and keeping asynchronous database mutations fully type-safe. It goes well beyond TOP's project requirements, as it was written in TypeScript over JavaScript, while implementing real-time messaging via Socket.io, and using Zod for platform-wide validation and Zustand for state management on the frontend.

---

## The Tech Stack

The workspace is organized using **pnpm workspaces** to keep the codebase modular, clean, and synchronized between the frontend and backend.

* **Monorepo Workspace:** `pnpm` Workspaces orchestration.
* **Real-Time Architecture:** **Socket.io** utilizing bidirectional WebSocket channels for instantaneous event streaming.
* **Database & ORM:** PostgreSQL hosted on serverless cloud nodes via **Neon**, integrated using **Prisma ORM**.
* **Backend Server:** **Node.js** running **Express** with modular, feature-isolated routing.
* **Frontend Interface:** **React 19** paired with **React Router 7** and native CSS Modules for isolated, semantic styling.
* **Data Validation:** Shared data models powered by **Zod** that enforce type boundaries platform-wide.
* **Media Storage:** Direct client-to-cloud asset uploads via **Cloudinary**.
* **Testing Suite:** Automated E2E API integration and unit assertions running on **Vitest** and **Supertest**.

---

## Interesting Engineering Challenges & Solutions

### Bidirectional Real-Time Communication Hub

To deliver zero-latency chat messaging and instant state updates, Odinum bypasses traditional HTTP polling overhead by implementing a stateful, event-driven network layer using **Socket.io**.

* **State Synchronization**: The backend initializes a dedicated socket manager that dynamically maps unique user IDs to active connection channels. This allows instant message distribution and fluid online/offline indicator updates.
* **Defensive Reconnection**: The client wrapper encapsulates native socket listeners within React hooks, establishing automatic backoff-reconnection strategies if the network link wavers or the browser tab enters a background suspend state.

### The Shared Validation Firewall

To keep the frontend form states and the backend REST API controllers in proper structural alignment, all schema definitions live inside an isolated npm-style workspace package called `@project-odin-book/validation`.

* **How it works:** Both the React Hook Form client-side input data resolvers and the Express API server controllers import the *exact same* Zod validation models natively.
* **Security Enforcement:** The schema aggressively sanitizes incoming parameters (`PATCH /users/me`). For instance, profile pictures must pass a strict Cloudinary HTTPS URL regex check to prevent tracking pixel injections or malicious third-party script links.

### On-Demand Ephemeral Guest Sandboxes

Shared guest accounts are a common bottleneck in portfolio sites—if one visitor updates the bio, deletes posts, or compromises data, the next recruiter sees a completely broken app. Odinum solves this using an **On-Demand Ephemeral Sandbox Pattern**.

* **Just-In-Time (JIT) Cleaning:** When someone clicks "Guest Sign-In", the backend triggers a non-blocking `deleteMany` sweep to drop expired sandbox rows older than 6 hours. This keeps storage clean automatically without artificial server-uptime hacks.
* **Isolated Sessions:** Every guest receives a completely unique account signature on the fly (e.g., `guest_7a2f9b@odinbook.local`). The factory transaction automatically seeds the profile with a fresh, mutual follow mesh connected to 20 baseline simulation accounts, ensuring their home feed timeline is full, active, and fully operational right on day zero.

### Handling Cold Starts with a Lazy Route Interceptor

Because the API server sits on a free cloud tier subject to sudden sleep cycles, a recruiter clicking your link could easily face a 404 error page or a 45-second blank screen while the container wakes up.

* **The Cinematic Shield:** A high-fantasy **Gateway Loading Screen** intercepts the view on frame zero right inside `main.tsx`. It launches a background polling loop that pings a lightweight, public `/status` route on the server every 3 seconds to test the hardware link.
* **Lazy Router Delay:** React Router 7 eagerly parses configuration schemas on file import, meaning its initial authentication loaders would normally detonate into an unhandled connection exception against a sleeping server. To prevent this, the routing config is wrapped inside a lazy `getRouter()` constructor function. It remains completely dormant in memory until the server responds with a clean `200 OK`, dropping the shield and hydrating the routing network.

### Technical Trade-offs: Pagination Architecture

The platform's feeds currently utilize an **Offset-based pagination mechanism** (`skip`/`take`) combined with an infinite scrolling frontend viewport.

* **The Reality:** Offset-based pagination was a conscious choice to prioritize rapid implementation of the real-time core messaging layers and GitHub OAuth integrations.
* **The Next Steps:** In active, high-mutation feeds, offset pagination is less than optimal because new posts or deletions cause content to duplicate or slip out of view mid-scroll. It also incurs an O(N) scanning penalty as database depth grows. Moving the timeline query engine to **Cursor-based pagination** (using an immutable timestamp or CUID anchor for highly efficient \(O(\log N)\) indexed lookups) is marked as a future milestone for the platform architecture.

---

## Repository Structure

```text
├── apps/
│   ├── client/           # React 19 / Vite SPA Frontend
│   └── server/           # Node.js / Express Backend REST API
├── packages/
│   ├── db/               # Prisma Schema, Migrations, and Main Seed Scripts
│   └── validation/       # Monorepo Shared Zod Schemas and DTO Types
├── package.json
└── pnpm-workspace.yaml
```

---

## Quickstart Setup Guide

Make sure you have **Node.js v20+** and **pnpm v9+** installed globally.

### 1. Install Workspace Dependencies

Clone the repository and run the installer from the root workspace directory to hook up all localized symlinks:

```bash

pnpm install
```

### 2. Configure Environment Variables

Create an `.env` file inside `apps/server/` and a matching `.env.test` file to define your environment boundaries:

```env
PORT=3000
DATABASE_URL="postgresql://your_main_db_postgres_credentials"
TEST_DATABASE_URL="postgresql://your_test_db_postgres_credentials"
JWT_ACCESS_SECRET="your_high_entropy_secret_key"
JWT_REFRESH_SECRET="your_secondary_secret_key"
COOKIE_SECRET="your_cookie_signing_token"

CLOUDINARY_CLOUD_NAME="your_cloud_id"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

GITHUB_CLIENT_ID="your_oauth_app_id"
GITHUB_CLIENT_SECRET="your_oauth_secret_token"
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/github/callback"
```

### 3. Migrate and Seed the Database

Synchronize your database structure with the application schema, then seed the local database with 10 tags, 200 user profiles, 1,000 posts, 3,000 comments, and 5,000 likes:

```bash
# Push your core schema directly onto your database container
pnpm db:push

# Populate the realm with your baseline simulation community data
pnpm db:seed
```

### 4. Boot Up the Workspace Applications

Launch the concurrent developer compilation watch loops. Your Vite client SPA will spin up on port `5173` and communicate seamlessly with the Express REST API container listening on port `3000`:

```bash
pnpm dev
```

### 5. Run the Automated Tests

The application utilizes an isolated, independent test database to guard development entries. Synchronize your local test schema shell and trigger the full 134-assertion Vitest suite:

```bash
# Push the core validation tables onto your test database container
npx prisma db push --url "postgresql://your_user:pass@localhost:5432/project_odin_book_test"

# Run the full suite sweep
pnpm test
```

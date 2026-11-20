
# Odinum (Project: Odin-Book)

![Odinum](.github/images/odinum-header.png)

Odinum is a full-stack, real-time social networking platform built with a **TypeScript Monorepo architecture**. It’s a portfolio project built as the final project in [The Odin Project](https://www.theodinproject.com/lessons/node-path-nodejs-odin-book) Node.js course.

## Motivation

I wanted to avoid taking quick and easy shortcuts, so I built this platform to try and tackle real-world development challenges, like handling serverless cloud cold starts smoothly and keeping asynchronous database mutations fully type-safe. I designed it to explore how complex validation, decoupled workspace packages, and fluid real-time communication work together across full-stack applications. It goes well beyond TOP's project requirements, as it was written in TypeScript instead of JavaScript, while implementing real-time messaging via Socket.io, and using Zod for platform-wide validation and Zustand for state management on the frontend.

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

## Interesting Engineering Challenges & Solutions

### Bidirectional Real-Time Communication Hub

To deliver zero-latency chat messaging and instant state updates across the platform, Odinum bypasses traditional HTTP polling overhead by implementing a stateful, event-driven network layer using **Socket.io**.

* **Centralized State Management:** All global socket connection events (`user_online`, `message_created`, etc.) are encapsulated directly within a persistent **Zustand store** rather than short-lived React component lifecycles. This ensures event listeners remain active across view transitions, allowing the application to cleanly absorb Socket.io's native backoff-reconnection loops without leaking event listeners.
* **Hybrid Sync Guard:** To fix a silent room-desynchronization issue where freshly created channels left users appearing offline to each other, the server-side route controller automatically forces both participants' active socket ids to join the socket room channel natively on the conversation's creation frame.

### The Shared Validation Firewall

To keep the frontend form states and the backend REST API controllers in perfect structural alignment, all schema definitions live inside an isolated workspace package called `@project-odin-book/validation`.

* **Single Source of Truth:** Both the React Hook Form client-side resolvers and the Express API request parsing controllers import the *exact same* **Zod** models natively, guaranteeing zero data contract drifting across the network bridge.
* **Security Enforcement:** The application aggressively sanitizes parameters on sensitive endpoints (`PATCH /users/me`). For instance, profile pictures must clear a strict Cloudinary HTTPS URL regex validator to prevent hidden tracking pixel injections or malicious link tracking attacks.

### On-Demand Ephemeral Guest Sandboxes

Shared guest accounts are a massive bottleneck for portfolio apps—if one reviewer changes a profile bio or deletes messages, the next visitor opens a completely broken experience. Odinum resolves this by spinning up dynamic, isolated sandbox environments.

* **Just-In-Time (JIT) Cleanup:** The exact second a reviewer clicks "Guest Sign-In", the backend triggers a non-blocking Prisma `deleteMany` sweep to drop sandbox records older than 6 hours, keeping cloud database storage clean automatically.
* **Isolated Sessions:** Every guest receives a completely unique account signature on the fly (e.g., `guest_7a2f9b@odinum.local`). The database transaction automatically seeds the profile with a fresh follow mesh connected to 20 baseline simulation accounts, ensuring their timeline feed is full, active, and interactive on day zero.

### Handling Cold Starts with a Lazy Route Interceptor

Because the backend API server sits on a free cloud hosting tier subject to idle sleep cycles, a recruiter clicking the live link could easily face a broken error page or a 45-second blank screen while the container wakes up.

* **The Atmospheric Shield:** A minimalist **Gateway Loading Screen** intercepts the view on frame zero right inside `main.tsx`, running a background polling loop that pings a public, lightweight `/status` route on the server every 3 seconds to monitor the server link.
* **Lazy Router Delay:** React Router 7 eagerly parses configuration schemas on file import, meaning its initial authentication loaders would normally drop an uncaught connection exception against a sleeping server. To prevent this, the routing engine is wrapped inside a lazy `getRouter()` function. It remains completely dormant in memory until the server responds with a clean `200 OK`, dropping the shield and rendering the app routes cleanly.

### Technical Trade-offs: Pagination Architecture

The platform's feeds currently utilize an **Offset-based pagination mechanism** (`skip`/`take`) combined with an infinite scrolling frontend viewport.

* **The Reality:** Offset-based pagination was a conscious choice to prioritize the implementation of the real-time core messaging layers and GitHub OAuth integrations.
* **The Next Steps:** In active, high-mutation feeds, offset pagination can cause content to duplicate or slip out of view mid-scroll if items are posted or deleted while browsing. It also incurs an O(N) scanning penalty at extreme database depths. Moving the timeline query engine to **Cursor-based pagination** (using an immutable timestamp or CUID anchor for highly efficient $O(\log N)$ indexed lookups) is marked as a future platform optimization goal.

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

## Quick Start

Navigate to [odinum.netlify.app](https://odinum.netlify.app/).
Register as a user or log in if you already have an account OR use the guest sign-in feature to access the app without registering.
Post, like, comment, or just click around and have fun! :)

## Usage Guide

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

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.
If you'd like to submit a change, please fork the repository and open a pull request with a clear description of your updates.

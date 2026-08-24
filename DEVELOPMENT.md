# AgroConnect implementation notes

The app keeps browsing public and only asks visitors to register or sign in when they want to post, message a seller, or place an order. Accounts have one of three roles: farmer, buyer, or supplier.

The React client talks to the Express API through `/api`. The backend creates a local SQLite database at `server/data/agroconnect.db` the first time it starts and seeds it with example produce, farm inputs, and services. The database file is deliberately ignored by Git so each development environment has its own data.

The main resources are users, produce listings, products (inputs or services), orders with order items, and messages. Ownership checks protect listing edits and deletes; server-side validation protects all create and update requests. Authentication uses a JSON Web Token stored locally for the development project.

`GET /api/farmers` and `GET /api/farmers/:id` provide the farmer contact profile required by an external consumer without exposing account emails or password data. The produce and product catalogue endpoints are public as well.

## Running locally

```bash
npm install
npm run dev
```

This starts the Express API on port 3001 and Vite on port 5173. `npm run build` checks that the client can produce a production build, and `npm run lint` runs the code-quality checks.

## Seed account

Use `grace@agroconnect.local` with password `agroconnect` to inspect the farmer listing workflow. The seeded supplier accounts use the same password.

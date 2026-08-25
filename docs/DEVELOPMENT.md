# AgroConnect Developer Guide

The app keeps browsing public and only asks visitors to register or sign in when they want to post or place an order. Accounts have one of three roles: farmer, buyer, or supplier.

The React client talks to the Express API through `/api`. The backend creates a local SQLite database at `server/data/agroconnect.db` the first time it starts and seeds it with example produce, farm inputs, and services. The database file is deliberately ignored by Git so each development environment has its own data.

The main resources are users, produce listings, products (inputs or services), orders with order items, and messages. Ownership checks protect listing edits and deletes; server-side validation protects all create and update requests. Authentication uses a JSON Web Token stored locally for the development project.

`GET /api/farmers` and `GET /api/farmers/:id` provide the farmer contact profile required by an external consumer without exposing account emails or password data. The produce and product catalogue endpoints are public as well.


## 1. Prerequisites & Environment Setup

- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **Package Manager**: `npm` (v9+)
- **Git**: Configured with user name and email

### Repository Setup
```bash
git clone https://github.com/Jmukami/farmers-agroconnect.git
cd farmers-agroconnect
npm install
```

---

## 2. Environment Variables

The backend uses standard environment variables with automatic local fallbacks:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Express API listener port |
| `JWT_SECRET` | `agroconnect-school-project-local-secret` | Cryptographic secret used to sign and verify session JWTs |

To customize for staging or production, define them in your environment:
```bash
# Windows PowerShell
$env:PORT="3001"
$env:JWT_SECRET="your-secure-random-secret"
npm run dev

# Linux / macOS
PORT=3001 JWT_SECRET="your-secure-random-secret" npm run dev
```

---

## 3. Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `concurrently ...` | Runs both the Express API and Vite React client concurrently with colorized terminal logging |
| `npm run dev:server` | `node server/index.js` | Runs only the Express REST API on port 3001 |
| `npm run dev:client` | `vite --open` | Runs only the Vite client on port 5173 with browser auto-open |
| `npm run build` | `vite build` | Compiles the React frontend into static assets in `dist/` |
| `npm run lint` | `eslint .` | Runs ESLint across all `.js` and `.jsx` files |
| `npm run preview` | `vite preview` | Serves the production build locally for verification |
| `npm start` | `node server/index.js` | Production server start command |

---

## 4. Database Management

The application uses an embedded SQLite database managed by `better-sqlite3`.

- **Database File**: `server/data/agroconnect.db` (automatically created and ignored in `.gitignore`).
- **Schema Auto-Migration & Seeding**: [`server/db.js`](file:///C:/Users/Emmanuel/School/2.2/API/Projects/farmers-agroconnect/server/db.js) executes `CREATE TABLE IF NOT EXISTS` at startup. If the `users` table is empty, it runs seed transactions populating test accounts and listings.

### Resetting Local Database
To wipe and re-seed the local database to clean initial state:
```bash
# Windows PowerShell
Remove-Item -Path "server\data\agroconnect.db" -ErrorAction SilentlyContinue

# Linux / macOS
rm -f server/data/agroconnect.db
```
The database will be freshly recreated and re-seeded on the next server start (`npm run dev` or `npm run dev:server`).

### Seed Accounts Reference
- **Farmer**: `grace@agroconnect.local` | Password: `agroconnect`
- **Farmer 2**: `peter@agroconnect.local` | Password: `agroconnect`
- **Supplier (Inputs)**: `rift@agroconnect.local` | Password: `agroconnect`
- **Supplier (Services)**: `vetcare@agroconnect.local` | Password: `agroconnect`
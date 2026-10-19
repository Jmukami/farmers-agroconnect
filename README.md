# AgroConnect API

AgroConnect is a REST API for an agricultural marketplace in Kenya. It lets farmers publish produce, suppliers advertise farm inputs and services, and buyers discover sellers and place orders. It is intended for frontend developers and integration partners building farmer directories, catalogues, and purchasing workflows.

## 1. Run locally from a clean clone

Install Git, **Node.js 22.13 or newer in the 22.x line**, and npm (bundled with Node). Request examples below use **Bash** (Linux, macOS, WSL, or Git Bash on Windows) and curl. Run the commands in order; keep the server terminal open and use a second Bash terminal for requests.

```bash
git clone https://github.com/Jmukami/farmers-agroconnect.git
cd farmers-agroconnect
npm ci
npm start
```

The API listens at **http://localhost:3001/api**. SQLite tables and demo data are created automatically in `server/data/agroconnect.db`; no database service, migration command, or environment file is required. Data persists across restarts. The server reads `PORT` and `JWT_SECRET` from the process environment; it does not automatically load `server/.env`. Its default signing secret and demo credentials are for local development. For a deployment, supply a private `JWT_SECRET` through the environment.

If `npm ci` fails while installing `better-sqlite3`, check `node --version` against the supported Node version above. Native builds may need access to nodejs.org for Node headers, plus Python and C++ build tools when no prebuilt binary is available. On restricted networks, ask the administrator to allow the required download or configure an approved proxy. Keep the lockfile and retry `npm ci` after fixing the underlying error; do not disable TLS verification.

Configuration examples are in `server/.env.example`. Files named `.env` are not loaded automatically. In PowerShell, set `$env:JWT_SECRET='your-private-secret'` before `npm start`; in Bash, use `JWT_SECRET='your-private-secret' npm start`. Production startup rejects a missing or default secret. Tests use `DATABASE_PATH` to isolate their SQLite database.

To run the React frontend and API together instead, use `npm run dev` (frontend normally at http://localhost:5173). API-only use does not require a frontend build.

### Check the API — GET /health

```bash
curl -i 'http://localhost:3001/api/health'
```

Response: **200 OK**

```json
{
  "status": "ok"
}
```

## 2. One-command quickstart: browse available produce

After starting the local server, copy and paste this command. Produce discovery is public, so it needs no token or account:

```bash
curl -i 'http://localhost:3001/api/produce?search=tomatoes'
```

Response: **200 OK**

```json
{
  "listings": [
    {
      "id": 1,
      "ownerId": 1,
      "title": "Fresh tomatoes",
      "category": "Vegetables",
      "price": 85,
      "unit": "kg",
      "quantity": 320,
      "county": "Nakuru",
      "description": "Firm, graded field tomatoes. Available for pickup or arranged delivery.",
      "createdAt": "2026-10-12 10:51:06",
      "updatedAt": "2026-10-12 10:51:06",
      "sellerName": "Grace Wanjiku",
      "sellerPhone": "0712 555 818",
      "sellerRole": "farmer",
      "availableFrom": "Available now"
    }
  ]
}
```

The responses in this guide were captured from a fresh, isolated local database. Timestamps use UTC in `YYYY-MM-DD HH:mm:ss` format (Nairobi is UTC+3). Timestamps and JWTs vary per run; IDs and quantities match when you follow this guide once on a fresh database. Only JWT values are replaced with explanatory text. Always use the token returned by your own request. No hosted API URL is configured in this repository.

## 3. Authenticate

Register below, then sign in. Both endpoints return `{user, token}`. Send that JWT on protected requests as `Authorization: Bearer YOUR_TOKEN`. Tokens expire after **7 days**; sign in again to obtain another. There is no refresh-token or logout endpoint; discard the token on the client when signing out.

Registration requires `fullName` and `county` (at least 2 characters), a valid email, a phone with at least 9 digits, a password of at least 8 characters, and a role of `farmer`, `buyer`, or `supplier`. `focus` is optional. Reusing an email returns 409; if you already registered this example user, skip registration and log in.

### Register a buyer — POST /auth/register

```bash
curl -i -X POST 'http://localhost:3001/api/auth/register' -H 'Content-Type: application/json' -d '{"fullName":"Alex Buyer","email":"alex@example.com","phone":"0712345678","county":"Nairobi","role":"buyer","password":"example-pass-123","focus":"Fresh produce"}'
```

Response: **201 Created**

```json
{
  "user": {
    "id": 5,
    "fullName": "Alex Buyer",
    "email": "alex@example.com",
    "phone": "0712345678",
    "county": "Nairobi",
    "role": "buyer",
    "focus": "Fresh produce",
    "createdAt": "2026-10-12 10:51:06"
  },
  "token": "<JWT returned by this request>"
}
```

### Sign in — POST /auth/login

```bash
curl -i -X POST 'http://localhost:3001/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"alex@example.com","password":"example-pass-123"}'
```

Response: **200 OK**

```json
{
  "user": {
    "id": 5,
    "fullName": "Alex Buyer",
    "email": "alex@example.com",
    "phone": "0712345678",
    "county": "Nairobi",
    "role": "buyer",
    "focus": "Fresh produce",
    "createdAt": "2026-10-12 10:51:06"
  },
  "token": "<JWT returned by this request>"
}
```

Save a fresh buyer token in your current Bash session (Node parses the JSON, so jq is not required):

```bash
TOKEN=$(curl -sS http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"alex@example.com","password":"example-pass-123"}' | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const r=JSON.parse(s);if(!r.token){console.error(r);process.exit(1)}process.stdout.write(r.token)})')
```

### Check your identity — GET /auth/me

```bash
curl -i 'http://localhost:3001/api/auth/me' -H "Authorization: Bearer $TOKEN"
```

Response: **200 OK**

```json
{
  "user": {
    "id": 5,
    "fullName": "Alex Buyer",
    "email": "alex@example.com",
    "phone": "0712345678",
    "county": "Nairobi",
    "role": "buyer",
    "focus": "Fresh produce",
    "createdAt": "2026-10-12 10:51:06"
  }
}
```

The following seeded accounts all use password `agroconnect`:

| Email | Role | Name |
| --- | --- | --- |
| grace@agroconnect.local | farmer | Grace Wanjiku |
| peter@agroconnect.local | farmer | Peter Otieno |
| rift@agroconnect.local | supplier | Rift Farm Supplies |
| vetcare@agroconnect.local | supplier | VetCare Kenya |

Save seller tokens for the later examples in the same terminal:

```bash
FARMER_TOKEN=$(curl -sS http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"grace@agroconnect.local","password":"agroconnect"}' | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const r=JSON.parse(s);if(!r.token){console.error(r);process.exit(1)}process.stdout.write(r.token)})')
SUPPLIER_TOKEN=$(curl -sS http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"rift@agroconnect.local","password":"agroconnect"}' | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const r=JSON.parse(s);if(!r.token){console.error(r);process.exit(1)}process.stdout.write(r.token)})')
```

Public routes are health, farmer discovery, and GET listings. All listing writes, order routes, and `/auth/me` require authentication. Only farmers can create produce; only suppliers can create products/services. Updating or deleting a listing requires its owner's token. Any signed-in user can order another user's listing.

## 4. Discover farmers, inputs, and services

### List farmers — GET /farmers

```bash
curl -i 'http://localhost:3001/api/farmers'
```

Response: **200 OK**

```json
{
  "farmers": [
    {
      "id": 1,
      "fullName": "Grace Wanjiku",
      "phone": "0712 555 818",
      "county": "Nakuru",
      "focus": "Maize and horticulture",
      "createdAt": "2026-10-12 10:51:06"
    },
    {
      "id": 2,
      "fullName": "Peter Otieno",
      "phone": "0722 610 445",
      "county": "Kisumu",
      "focus": "Rice and poultry",
      "createdAt": "2026-10-12 10:51:06"
    }
  ]
}
```

### Get a farmer — GET /farmers/:id

```bash
curl -i 'http://localhost:3001/api/farmers/1'
```

Response: **200 OK**

```json
{
  "farmer": {
    "id": 1,
    "fullName": "Grace Wanjiku",
    "phone": "0712 555 818",
    "county": "Nakuru",
    "focus": "Maize and horticulture",
    "createdAt": "2026-10-12 10:51:06"
  }
}
```

### Browse inputs and services — GET /products

```bash
curl -i 'http://localhost:3001/api/products?kind=input&search=Hybrid'
```

Response: **200 OK**

```json
{
  "listings": [
    {
      "id": 1,
      "ownerId": 3,
      "title": "Hybrid maize seed",
      "category": "Seeds",
      "price": 450,
      "unit": "kg",
      "quantity": 75,
      "county": "Nakuru",
      "description": "Drought-tolerant maize seed suited to mid-altitude regions.",
      "createdAt": "2026-10-12 10:51:06",
      "updatedAt": "2026-10-12 10:51:06",
      "sellerName": "Rift Farm Supplies",
      "sellerPhone": "0708 312 908",
      "sellerRole": "supplier",
      "kind": "input"
    }
  ]
}
```

Both `GET /produce` and `GET /products` accept optional `search` (title/description substring), `county`, and `category` (case-sensitive exact matches). Products also accept `kind=input` or `kind=service`. Use `curl --get --data-urlencode 'search=soil testing' http://localhost:3001/api/products` for values containing spaces. Collections return all matches without pagination; no matches returns `{"listings":[]}`. Product stock is exposed as **quantity** in the running API.

## 5. Place and manage an order

Use the buyer token to order 2 kg of the seeded tomatoes (85 per kg). Send 1–25 items, each with a listing `id`, `type` of `produce` or `product`, and a positive integer `quantity`. The server calculates the total and decrements available inventory. You cannot order your own listing.

### Place an order — POST /orders

```bash
curl -i -X POST 'http://localhost:3001/api/orders' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"items":[{"id":1,"type":"produce","quantity":2}]}'
```

Response: **201 Created**

```json
{
  "order": {
    "id": 1,
    "total": 170,
    "status": "pending",
    "createdAt": "2026-10-12 10:51:06"
  }
}
```

### Read your orders — GET /orders

```bash
curl -i 'http://localhost:3001/api/orders' -H "Authorization: Bearer $TOKEN"
```

Response: **200 OK**

```json
{
  "orders": [
    {
      "id": 1,
      "buyerId": 5,
      "total": 170,
      "status": "pending",
      "createdAt": "2026-10-12 10:51:06",
      "buyerName": "Alex Buyer",
      "buyerPhone": "0712345678",
      "sellers": [{ "sellerId": 1, "status": "pending" }],
      "items": [
        {
          "id": 1,
          "title": "Fresh tomatoes",
          "unit": "kg",
          "price": 85,
          "quantity": 2,
          "sellerId": 1,
          "sellerName": "Grace Wanjiku"
        }
      ]
    }
  ]
}
```

### Confirm an order as its seller — PATCH /orders/:id/status

```bash
curl -i -X PATCH 'http://localhost:3001/api/orders/1/status' -H "Authorization: Bearer $FARMER_TOKEN" -H 'Content-Type: application/json' -d '{"status":"confirmed"}'
```

Response: **200 OK**

```json
{
  "status": "confirmed"
}
```

`GET /orders` returns orders where you are the buyer or a seller. Buyers see all items, the full total, and a `sellers` array of `{sellerId, status}`. Sellers see only their own items, subtotal, seller entry, and portion status. Duplicate lines for the same listing type and ID are combined before inventory is checked. Item IDs and quantities must be positive JSON integers; types must be exactly `produce` or `product`.

Each seller portion starts `pending`. Sellers can move their portion from `pending` to `confirmed`, then `fulfilled`, or cancel a pending/confirmed portion. Terminal portions cannot be reopened (409). Buyers can cancel the entire order only while every portion is pending (403 otherwise). PATCH returns the requested `{status}`; fetch the order again for its aggregate state. The buyer's aggregate status is `cancelled` when all portions are cancelled, `fulfilled` when all remaining portions are fulfilled, `pending` when all portions are pending, and `confirmed` otherwise. Cancellation does **not** restore inventory. Existing databases receive seller portions with their previous shared order status; historical per-seller states cannot be recovered.

## 6. Publish, update, and remove listings

The following examples create new listings, update them, then delete them. IDs 5 (produce) and 7 (product) assume the fresh seeded database; otherwise use the IDs returned by your POST requests. PUT requires the complete listing fields, not just the changed field.

Listing fields: `title`, `category`, and `county` must have at least 2 characters; `unit` must be nonempty; `description` needs at least 12 characters; `price` is a finite nonnegative JSON number; `quantity` is a nonnegative JSON integer. Numeric strings, nulls, and booleans are rejected. Produce accepts optional `availableFrom` text. Products require `kind`: `input` or `service` (service availability also uses `quantity`).

### Create produce — POST /produce

```bash
curl -i -X POST 'http://localhost:3001/api/produce' -H "Authorization: Bearer $FARMER_TOKEN" -H 'Content-Type: application/json' -d '{"title":"Quickstart carrots","category":"Vegetables","price":90,"unit":"kg","quantity":20,"county":"Nakuru","description":"Fresh carrots available for collection.","availableFrom":"Available now"}'
```

Response: **201 Created**

```json
{
  "listing": {
    "id": 5,
    "ownerId": 1,
    "title": "Quickstart carrots",
    "category": "Vegetables",
    "price": 90,
    "unit": "kg",
    "quantity": 20,
    "county": "Nakuru",
    "description": "Fresh carrots available for collection.",
    "createdAt": "2026-10-12 10:51:06",
    "updatedAt": "2026-10-12 10:51:06",
    "sellerName": "Grace Wanjiku",
    "sellerPhone": "0712 555 818",
    "sellerRole": "farmer",
    "availableFrom": "Available now"
  }
}
```

### Replace produce fields — PUT /produce/:id

```bash
curl -i -X PUT 'http://localhost:3001/api/produce/5' -H "Authorization: Bearer $FARMER_TOKEN" -H 'Content-Type: application/json' -d '{"title":"Quickstart carrots","category":"Vegetables","price":95,"unit":"kg","quantity":20,"county":"Nakuru","description":"Fresh carrots available for collection.","availableFrom":"Available now"}'
```

Response: **200 OK**

```json
{
  "listing": {
    "id": 5,
    "ownerId": 1,
    "title": "Quickstart carrots",
    "category": "Vegetables",
    "price": 95,
    "unit": "kg",
    "quantity": 20,
    "county": "Nakuru",
    "description": "Fresh carrots available for collection.",
    "createdAt": "2026-10-12 10:51:06",
    "updatedAt": "2026-10-12 10:51:06",
    "sellerName": "Grace Wanjiku",
    "sellerPhone": "0712 555 818",
    "sellerRole": "farmer",
    "availableFrom": "Available now"
  }
}
```

### Delete produce — DELETE /produce/:id

```bash
curl -i -X DELETE 'http://localhost:3001/api/produce/5' -H "Authorization: Bearer $FARMER_TOKEN"
```

Response: **204 No Content** — empty body (do not parse as JSON).

### Create an input or service — POST /products

```bash
curl -i -X POST 'http://localhost:3001/api/products' -H "Authorization: Bearer $SUPPLIER_TOKEN" -H 'Content-Type: application/json' -d '{"kind":"input","title":"Quickstart compost","category":"Fertiliser","price":500,"unit":"bag","quantity":10,"county":"Nakuru","description":"Composted organic matter for vegetable gardens."}'
```

Response: **201 Created**

```json
{
  "listing": {
    "id": 7,
    "ownerId": 3,
    "title": "Quickstart compost",
    "category": "Fertiliser",
    "price": 500,
    "unit": "bag",
    "quantity": 10,
    "county": "Nakuru",
    "description": "Composted organic matter for vegetable gardens.",
    "createdAt": "2026-10-12 10:51:06",
    "updatedAt": "2026-10-12 10:51:06",
    "sellerName": "Rift Farm Supplies",
    "sellerPhone": "0708 312 908",
    "sellerRole": "supplier",
    "kind": "input"
  }
}
```

### Replace product fields — PUT /products/:id

```bash
curl -i -X PUT 'http://localhost:3001/api/products/7' -H "Authorization: Bearer $SUPPLIER_TOKEN" -H 'Content-Type: application/json' -d '{"kind":"input","title":"Quickstart compost","category":"Fertiliser","price":550,"unit":"bag","quantity":10,"county":"Nakuru","description":"Composted organic matter for vegetable gardens."}'
```

Response: **200 OK**

```json
{
  "listing": {
    "id": 7,
    "ownerId": 3,
    "title": "Quickstart compost",
    "category": "Fertiliser",
    "price": 550,
    "unit": "bag",
    "quantity": 10,
    "county": "Nakuru",
    "description": "Composted organic matter for vegetable gardens.",
    "createdAt": "2026-10-12 10:51:06",
    "updatedAt": "2026-10-12 10:51:06",
    "sellerName": "Rift Farm Supplies",
    "sellerPhone": "0708 312 908",
    "sellerRole": "supplier",
    "kind": "input"
  }
}
```

### Delete a product — DELETE /products/:id

```bash
curl -i -X DELETE 'http://localhost:3001/api/products/7' -H "Authorization: Bearer $SUPPLIER_TOKEN"
```

Response: **204 No Content** — empty body (do not parse as JSON).

## 7. Recognize failures

Check the **HTTP status code**: 200/201 indicate success with JSON, and 204 indicates success with no body. Errors return JSON with a human-readable `message` and, for some validation failures, a `fields` object mapping request field names to messages. When there are no field details, `fields` is omitted. There is no `success` flag or machine-readable error code.

### Missing authentication

```bash
curl -i 'http://localhost:3001/api/auth/me'
```

Response: **401 Unauthorized**

```json
{
  "message": "Sign in to continue."
}
```

### Invalid registration fields

```bash
curl -i -X POST 'http://localhost:3001/api/auth/register' -H 'Content-Type: application/json' -d '{"fullName":"A","email":"bad","phone":"1","county":"N","role":"guest","password":"short"}'
```

Response: **422 Unprocessable Entity**

```json
{
  "message": "Please correct the highlighted fields.",
  "fields": {
    "fullName": "Enter your full name.",
    "email": "Enter a valid email address.",
    "phone": "Enter a valid phone number.",
    "county": "Enter your county.",
    "role": "Choose how you will use AgroConnect.",
    "password": "Use at least 8 characters."
  }
}
```

| Status | Meaning / actual message example |
| --- | --- |
| 400 | Missing body, malformed JSON, or a body that is not a JSON object |
| 413 | Body exceeds 100 KB |
| 415 | Unsupported content type: `Use Content-Type: application/json.` |
| 401 | Missing token: `Sign in to continue.`; bad login: `Email or password is incorrect.`; invalid/expired token: `Your session has expired. Please sign in again.` |
| 403 | Wrong role or owner: `You can only manage your own listings.`; `Only farmer accounts can post produce listings.`; forbidden order changes |
| 404 | Missing resource or route: `This API route was not found.`; `This listing no longer exists.` |
| 409 | Duplicate email: `An account with this email already exists.` with `fields.email` equal to `Try signing in instead.`; invalid status transition; unavailable inventory: `One or more items are no longer available in the requested quantity.` |
| 422 | Invalid fields or order: `Every item needs a valid quantity.`; `You cannot order your own listing.`; invalid item type or ID |
| 500 | `Something went wrong on the server. Please try again.` |

Send valid JSON with `Content-Type: application/json`. The body limit is 100 KB. Malformed JSON returns 400, oversized bodies return 413, and unsupported content types return 415. Unexpected server failures return 500.

Run `npm test` for isolated API regression checks, `npm run lint` for static checks, and `npm run build` for the frontend production build.

## API reference and team

See [openapi.yaml](openapi.yaml) for the broader API contract. Entries marked **PROPOSED** (farm location, individual listing detail, and dedicated inventory routes) are not implemented and return 404. This README documents the routes and response shapes currently implemented in [server/index.js](server/index.js).

Maintained by Team 6: Abelle Emmanuel, Mukundi Jochebed Mukami, Bruce Ouma, and Mark Kage.

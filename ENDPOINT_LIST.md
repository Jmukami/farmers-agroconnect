# AgroConnect API Endpoint List

**Project**: AgroConnect (Team 6)  
**Downstream Consumer**: Campus Hub (Team 7)  

---

## 1. Implemented API Endpoints

The table below lists all **19 active REST endpoints** currently implemented in the AgroConnect backend (`server/index.js`):

| Method | Path | Authentication / Role | Purpose | Maps to Need |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Return server health status (`{ status: "ok" }`). | System monitoring & health check |
| `POST` | `/api/auth/register` | Public | Register a new user account (`farmer`, `buyer`, or `supplier`) and return JWT. | User onboarding & identity creation |
| `POST` | `/api/auth/login` | Public | Authenticate with email and password to receive a JWT session token. | User authentication & session management |
| `GET` | `/api/auth/me` | Required (Any authenticated user) | Retrieve the currently authenticated user's profile details. | Session validation & profile display |
| `GET` | `/api/farmers` | Public | Retrieve a list of all registered farmer profiles sorted by name. | Discovery of registered farmers |
| `GET` | `/api/farmers/:id` | Public | Retrieve sanitized public profile & contact information for a specific farmer by ID. | **Campus Hub Need 1**: Read farmers' personal details (contact info) for member identity verification |
| `GET` | `/api/produce` | Public | Browse and filter farm produce listings (supports `search`, `category`, `county` queries). | Marketplace produce browsing & discovery |
| `POST` | `/api/produce` | Required (`farmer` role) | Create a new agricultural produce listing with harvest availability and pricing. | Farmer produce inventory publishing |
| `PUT` | `/api/produce/:id` | Required (Listing owner) | Update an existing produce listing (title, price, unit, quantity, county, etc.). | Farmer inventory management |
| `DELETE` | `/api/produce/:id` | Required (Listing owner) | Remove an active produce listing from the marketplace. | Farmer inventory management |
| `GET` | `/api/products` | Public | Browse and filter farm inputs & services (supports `kind`, `search`, `category`, `county`). Returns name, category, description, and available stock. | **Campus Hub Need 3 & 4**: Read farming product information & access inventory/stock details |
| `POST` | `/api/products` | Required (`supplier` role) | Create a new farm input or service offering (`kind`: `'input'` \| `'service'`). | Supplier catalog management |
| `PUT` | `/api/products/:id` | Required (Listing owner) | Update details, pricing, and stock of an existing farm input or service offering. | Supplier catalog management |
| `DELETE` | `/api/products/:id` | Required (Listing owner) | Remove a farm input or service offering from the platform catalog. | Supplier catalog management |
| `POST` | `/api/orders` | Required (Any authenticated user) | Submit a multi-item purchase order for produce and/or inputs with transactional stock decrement. | Order placement & stock reservation |
| `GET` | `/api/orders` | Required (Any authenticated user) | Retrieve all orders where the authenticated user is either the buyer or a seller. | Order history, fulfillment & tracking |
| `PATCH` | `/api/orders/:id/status` | Required (Buyer or Seller on order) | Update order status (`confirmed`, `fulfilled`, or `cancelled`). | Order lifecycle workflow & status management |
| `GET` | `/api/messages` | Required (Any authenticated user) | List all direct messages sent or received by the authenticated user. | Direct buyer-seller trade communication |
| `POST` | `/api/messages` | Required (Any authenticated user) | Send a direct message inquiry to another registered platform user. | Direct buyer-seller trade communication |

---

## 2. Proposed Endpoints to Add / Edit for Client Requirements (Campus Hub)

To fully satisfy Campus Hub's requirements as detailed in `API_NEEDS.md`, the following endpoints are identified for upcoming addition or enhancement.

| Proposed Action | Method | Path | Target Requirement / Need | Rationale & Changes Needed |
| :--- | :--- | :--- | :--- | :--- |
| **EDIT** | `GET` | `/api/farmers/:id` | **Need 2**: Access locations of members' farms to facilitate farm visits | Enhance response payload to include specific farm location data (`farmLocation` / `subCounty` / GPS or landmark) in addition to county. |
| **ADD** | `GET` | `/api/farmers/:id/farm-location` | **Need 2**: Detailed farm location & visitation details | Dedicated endpoint returning farm physical address, sub-county/ward, landmark, acreage, and farm visit contact instructions. |
| **ADD** | `GET` | `/api/products/:id` | **Need 3 & 4**: Product details & single-item listing on Campus Hub | Return full details (name, category, description, price, unit, stock, seller details) for an individual product by ID. |
| **ADD** | `GET` | `/api/produce/:id` | **Need 3 & 4**: Produce details & single-item listing on Campus Hub | Return full details (name, category, description, price, unit, quantity, availableFrom, seller) for an individual harvest listing by ID. |
| **ADD** | `GET` | `/api/products/:id/inventory` | **Need 4**: Dedicated real-time inventory & stock check | Lightweight endpoint returning current available stock, unit, and real-time replenishment status for a product. |

---

## 3. Client Needs Mapping (`API_NEEDS.md` &rarr; Endpoints)

This matrix maps Campus Hub's 4 stated downstream needs to both existing implemented endpoints and proposed additions/edits:

| # | Campus Hub Stated Need | Current Endpoint Status | Proposed Addition / Modification | Fulfillment Strategy |
| :- | :--- | :--- | :--- | :--- |
| **1** | *"Campus Hub needs to read farmers’ personal details (contact info) in order to verify member identities and register memberships."* | **Implemented**: `GET /api/farmers` & `GET /api/farmers/:id` | *Optional*: Add search filter (`GET /api/farmers?search=...`) | Current endpoint returns farmer ID, full name, phone number, county, and farming focus, enabling identity & membership verification without exposing passwords. |
| **2** | *"Campus Hub needs to access the locations of members’ farms in order to easy facilitate activities that may involve visits to said farms."* | **Partially Implemented**: Returns `county` only. | **EDIT**: `GET /api/farmers/:id` to include `farmLocation`<br>**ADD**: `GET /api/farmers/:id/farm-location` | Extend farmer profile schema with specific farm address, sub-county, and visit instructions so Campus Hub can coordinate educational visits. |
| **3** | *"Campus Hub needs to read farming product information including the name, category, description and other relevant product details to be listed on their website as well."* | **Implemented (List)**: `GET /api/products` & `GET /api/produce` | **ADD**: `GET /api/products/:id`<br>**ADD**: `GET /api/produce/:id` | The list endpoints currently provide title (name), category, description, price, and unit. Adding single-item lookup endpoints allows Campus Hub to render dedicated product detail pages. |
| **4** | *"Campus Hub also needs to access inventory details for the farming products, that is, the available products, quantity/stock etc."* | **Implemented (List)**: `GET /api/products` (has `stock`) & `GET /api/produce` (has `quantity`) | **ADD**: `GET /api/products/:id/inventory`<br>*Optional query*: `GET /api/products?inStock=true` | Product and produce listings currently return live stock/quantities. A dedicated inventory endpoint or in-stock query filter allows Campus Hub to avoid displaying out-of-stock items. |
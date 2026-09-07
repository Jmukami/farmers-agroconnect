# AgroConnect API Endpoint List

**Project**: AgroConnect — Digital Agricultural Marketplace & Service Platform (Team 6)  
**Client / Downstream Consumer**: Campus Hub (Team 7)  
**Base URL**: `http://localhost:3001/api`  
**Protocol**: REST / JSON (`application/json`)  
**Authentication**: Standard Bearer Token via HTTP Header:
```http
Authorization: Bearer <jwt_token>
```

---

## 1. Summary of Implemented API Endpoints

The table below lists all **19 active REST endpoints** currently implemented in the AgroConnect Express backend (`server/index.js`):

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

To fully satisfy Campus Hub's requirements as detailed in `API_NEEDS.md`, the following endpoints are identified for upcoming addition or enhancement. *(Note: Code in `server/index.js` remains unchanged for now; these are documented here for API contract alignment.)*

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

---

## 4. Detailed Specifications: Implemented Endpoints

### 4.1 System Health & Authentication

#### `GET /api/health`
- **Access**: Public
- **Description**: Verifies that the server and SQLite database connection are operational.
- **Response `200 OK`**:
  ```json
  { "status": "ok" }
  ```

#### `POST /api/auth/register`
- **Access**: Public
- **Description**: Registers a new user account as a farmer, buyer, or supplier.
- **Request Body (JSON)**:
  - `fullName` *(string, min 2 chars, required)*
  - `email` *(string, valid email format, unique, required)*
  - `phone` *(string, min 9 digits, required)*
  - `county` *(string, min 2 chars, required)*
  - `role` *(string, required: `'farmer'` | `'buyer'` | `'supplier'`)*
  - `password` *(string, min 8 chars, required)*
  - `focus` *(string, optional)*
- **Response `201 Created`**:
  ```json
  {
    "user": {
      "id": 1,
      "fullName": "Grace Wanjiku",
      "email": "grace@agroconnect.local",
      "phone": "0712 555 818",
      "county": "Nakuru",
      "role": "farmer",
      "focus": "Maize and horticulture",
      "createdAt": "2026-08-24 17:30:00"
    },
    "token": "<jwt_token>"
  }
  ```
- **Error Codes**: `409 Conflict` (email already exists), `422 Unprocessable Entity` (validation failure).

#### `POST /api/auth/login`
- **Access**: Public
- **Description**: Authenticates with email and password to retrieve a JWT token.
- **Request Body (JSON)**:
  - `email` *(string, required)*
  - `password` *(string, required)*
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": 1,
      "fullName": "Grace Wanjiku",
      "email": "grace@agroconnect.local",
      "phone": "0712 555 818",
      "county": "Nakuru",
      "role": "farmer",
      "focus": "Maize and horticulture",
      "createdAt": "2026-08-24 17:30:00"
    },
    "token": "<jwt_token>"
  }
  ```
- **Error Codes**: `401 Unauthorized` (incorrect email or password).

#### `GET /api/auth/me`
- **Access**: Authenticated (Bearer Token)
- **Description**: Retrieves profile details for the currently authenticated session.
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": 1,
      "fullName": "Grace Wanjiku",
      "email": "grace@agroconnect.local",
      "phone": "0712 555 818",
      "county": "Nakuru",
      "role": "farmer",
      "focus": "Maize and horticulture",
      "createdAt": "2026-08-24 17:30:00"
    }
  }
  ```
- **Error Codes**: `401 Unauthorized` (missing, invalid, or expired token).

---

### 4.2 Farmer Profiles (Client Integration)

#### `GET /api/farmers`
- **Access**: Public
- **Description**: Returns all registered farmers with public contact details, sorted alphabetically by full name.
- **Response `200 OK`**:
  ```json
  {
    "farmers": [
      {
        "id": 1,
        "fullName": "Grace Wanjiku",
        "phone": "0712 555 818",
        "county": "Nakuru",
        "focus": "Maize and horticulture",
        "createdAt": "2026-08-24 17:30:00"
      },
      {
        "id": 2,
        "fullName": "Peter Otieno",
        "phone": "0722 610 445",
        "county": "Kisumu",
        "focus": "Rice and poultry",
        "createdAt": "2026-08-24 17:30:00"
      }
    ]
  }
  ```

#### `GET /api/farmers/:id`
- **Access**: Public
- **Path Parameter**: `id` *(integer, required — farmer user ID)*
- **Description**: Returns sanitized profile and contact details of a specific farmer.
- **Response `200 OK`**:
  ```json
  {
    "farmer": {
      "id": 1,
      "fullName": "Grace Wanjiku",
      "phone": "0712 555 818",
      "county": "Nakuru",
      "focus": "Maize and horticulture",
      "createdAt": "2026-08-24 17:30:00"
    }
  }
  ```
- **Error Codes**: `404 Not Found` (farmer ID not found or user role is not farmer).

---

### 4.3 Produce Marketplace (`/api/produce`)

#### `GET /api/produce`
- **Access**: Public
- **Query Parameters**:
  - `search` *(optional string)*: Keyword search against `title` and `description`.
  - `county` *(optional string)*: Exact county filter.
  - `category` *(optional string)*: Exact category filter (e.g., `Vegetables`, `Cereals`).
- **Response `200 OK`**:
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
        "availableFrom": "Available now",
        "createdAt": "2026-08-24 17:30:00",
        "updatedAt": "2026-08-24 17:30:00",
        "sellerName": "Grace Wanjiku",
        "sellerPhone": "0712 555 818",
        "sellerRole": "farmer"
      }
    ]
  }
  ```

#### `POST /api/produce`
- **Access**: Authenticated (`role === 'farmer'` only)
- **Request Body (JSON)**:
  - `title` *(string, min 2 chars, required)*
  - `category` *(string, min 2 chars, required)*
  - `price` *(number, >= 0, required)*
  - `unit` *(string, min 1 char, required)*
  - `quantity` *(integer, >= 0, required)*
  - `county` *(string, min 2 chars, required)*
  - `description` *(string, min 12 chars, required)*
  - `availableFrom` *(string, optional)*
- **Response `201 Created`**: Returns created produce listing object with seller metadata.
- **Error Codes**: `401 Unauthorized`, `403 Forbidden` (non-farmers), `422 Unprocessable Entity`.

#### `PUT /api/produce/:id`
- **Access**: Authenticated (Listing owner only)
- **Path Parameter**: `id` *(integer, listing ID)*
- **Request Body (JSON)**: Same schema as produce creation.
- **Response `200 OK`**: Returns updated produce listing object.
- **Error Codes**: `401 Unauthorized`, `403 Forbidden` (not owner), `404 Not Found`, `422 Unprocessable Entity`.

#### `DELETE /api/produce/:id`
- **Access**: Authenticated (Listing owner only)
- **Path Parameter**: `id` *(integer, listing ID)*
- **Response `204 No Content`**
- **Error Codes**: `401 Unauthorized`, `403 Forbidden` (not owner), `404 Not Found`.

---

### 4.4 Farm Inputs & Services (`/api/products`)

#### `GET /api/products`
- **Access**: Public
- **Query Parameters**:
  - `kind` *(optional string: `'input'` | `'service'`)*: Filter between physical inputs and agricultural services.
  - `search` *(optional string)*: Keyword search against title and description.
  - `county` *(optional string)*: Filter by county.
  - `category` *(optional string)*: Filter by product category.
- **Response `200 OK`**:
  ```json
  {
    "listings": [
      {
        "id": 1,
        "ownerId": 3,
        "kind": "input",
        "title": "Hybrid maize seed",
        "category": "Seeds",
        "price": 450,
        "unit": "kg",
        "quantity": 75,
        "county": "Nakuru",
        "description": "Drought-tolerant maize seed suited to mid-altitude regions.",
        "createdAt": "2026-08-24 17:30:00",
        "updatedAt": "2026-08-24 17:30:00",
        "sellerName": "Rift Farm Supplies",
        "sellerPhone": "0708 312 908",
        "sellerRole": "supplier"
      }
    ]
  }
  ```

#### `POST /api/products`
- **Access**: Authenticated (`role === 'supplier'` only)
- **Request Body (JSON)**:
  - `kind` *(string, required: `'input'` | `'service'`)*
  - `title` *(string, min 2 chars, required)*
  - `category` *(string, min 2 chars, required)*
  - `price` *(number, >= 0, required)*
  - `unit` *(string, min 1 char, required)*
  - `quantity` *(integer, >= 0, required stock count)*
  - `county` *(string, min 2 chars, required)*
  - `description` *(string, min 12 chars, required)*
- **Response `201 Created`**: Returns newly created product listing object.
- **Error Codes**: `401 Unauthorized`, `403 Forbidden` (non-suppliers), `422 Unprocessable Entity`.

#### `PUT /api/products/:id`
- **Access**: Authenticated (Listing owner only)
- **Path Parameter**: `id` *(integer, product ID)*
- **Request Body (JSON)**: Same schema as product creation.
- **Response `200 OK`**: Returns updated product listing object.
- **Error Codes**: `401 Unauthorized`, `403 Forbidden` (not owner), `404 Not Found`, `422 Unprocessable Entity`.

#### `DELETE /api/products/:id`
- **Access**: Authenticated (Listing owner only)
- **Path Parameter**: `id` *(integer, product ID)*
- **Response `204 No Content`**
- **Error Codes**: `401 Unauthorized`, `403 Forbidden` (not owner), `404 Not Found`.

---

### 4.5 Orders & Checkout (`/api/orders`)

#### `POST /api/orders`
- **Access**: Authenticated (Any role)
- **Description**: Atomically places an order containing one or more line items from produce listings and/or product offerings, maps items to sellers, and decrements stock.
- **Request Body (JSON)**:
  ```json
  {
    "items": [
      { "id": 1, "type": "produce", "quantity": 10 },
      { "id": 2, "type": "product", "quantity": 2 }
    ]
  }
  ```
- **Validation Rules**:
  - `items`: Array with 1 to 25 items.
  - `quantity`: Integer >= 1.
  - Cannot purchase self-owned items (`owner_id !== req.user.id`).
  - Available stock must be >= requested quantity.
- **Response `201 Created`**:
  ```json
  {
    "order": {
      "id": 1,
      "total": 3250,
      "status": "pending",
      "createdAt": "2026-08-24 17:35:00"
    }
  }
  ```
- **Error Codes**: `401 Unauthorized`, `409 Conflict` (insufficient stock), `422 Unprocessable Entity` (buying self-owned item or invalid quantity).

#### `GET /api/orders`
- **Access**: Authenticated (Any role)
- **Description**: Returns all orders where the authenticated user is either the buyer or a line-item seller.
- **Response `200 OK`**:
  ```json
  {
    "orders": [
      {
        "id": 1,
        "buyerId": 2,
        "buyerName": "Peter Otieno",
        "buyerPhone": "0722 610 445",
        "total": 3250,
        "status": "pending",
        "createdAt": "2026-08-24 17:35:00",
        "items": [
          {
            "id": 1,
            "title": "Fresh tomatoes",
            "unit": "kg",
            "price": 85,
            "quantity": 10,
            "sellerId": 1,
            "sellerName": "Grace Wanjiku"
          }
        ]
      }
    ]
  }
  ```

#### `PATCH /api/orders/:id/status`
- **Access**: Authenticated (Authorized Buyer or Seller)
- **Path Parameter**: `id` *(integer, order ID)*
- **Request Body (JSON)**:
  ```json
  { "status": "confirmed" }
  ```
- **Permitted Transitions**:
  - `pending` &rarr; `confirmed` (Seller only)
  - `confirmed` &rarr; `fulfilled` (Seller only)
  - `pending` &rarr; `cancelled` (Buyer only, before confirmation)
- **Response `200 OK`**:
  ```json
  { "status": "confirmed" }
  ```
- **Error Codes**: `401 Unauthorized`, `403 Forbidden` (not authorized), `404 Not Found`, `422 Unprocessable Entity`.

---

### 4.6 Direct Messaging (`/api/messages`)

#### `GET /api/messages`
- **Access**: Authenticated (Any role)
- **Description**: Retrieves all direct messages sent or received by the authenticated user, ordered newest first.
- **Response `200 OK`**:
  ```json
  {
    "messages": [
      {
        "id": 1,
        "senderId": 2,
        "senderName": "Peter Otieno",
        "recipientId": 1,
        "recipientName": "Grace Wanjiku",
        "subject": "Bulk purchase inquiry",
        "body": "Hello Grace, do you have additional bags of dry maize available for delivery next week?",
        "createdAt": "2026-08-24 18:00:00"
      }
    ]
  }
  ```

#### `POST /api/messages`
- **Access**: Authenticated (Any role)
- **Description**: Sends a direct message to another registered user.
- **Request Body (JSON)**:
  - `recipientId` *(integer, required, cannot be self)*
  - `subject` *(string, min 3 chars, required)*
  - `body` *(string, min 10 chars, required)*
- **Response `201 Created`**:
  ```json
  {
    "message": {
      "id": 1,
      "subject": "Bulk purchase inquiry",
      "body": "Hello Grace, do you have additional bags of dry maize available for delivery next week?",
      "createdAt": "2026-08-24 18:00:00"
    }
  }
  ```
- **Error Codes**: `401 Unauthorized`, `404 Not Found` (recipient not found), `422 Unprocessable Entity` (messaging self or validation failure).

---

## 5. Detailed Specifications: Proposed Endpoints (To Add / Edit)

*(Planned for implementation to fulfill Campus Hub requirements — actual backend code not yet modified)*

### 5.1 [EDIT] `GET /api/farmers/:id` (Enhanced with Farm Location)
- **Target Need**: Need 2 (Access farm locations for farm visits)
- **Method / Path**: `GET /api/farmers/:id`
- **Access**: Public
- **Proposed Extended Response `200 OK`**:
  ```json
  {
    "farmer": {
      "id": 1,
      "fullName": "Grace Wanjiku",
      "phone": "0712 555 818",
      "county": "Nakuru",
      "subCounty": "Naivasha",
      "farmLocation": "Subukia Valley, Plot 42",
      "focus": "Maize and horticulture",
      "createdAt": "2026-08-24 17:30:00"
    }
  }
  ```

### 5.2 [PROPOSED NEW] `GET /api/farmers/:id/farm-location`
- **Target Need**: Need 2 (Access farm locations for farm visits)
- **Method / Path**: `GET /api/farmers/:id/farm-location`
- **Access**: Public
- **Description**: Specific geolocation and logistical access information for visiting the member's farm.
- **Proposed Response `200 OK`**:
  ```json
  {
    "farmerId": 1,
    "farmerName": "Grace Wanjiku",
    "county": "Nakuru",
    "subCounty": "Naivasha",
    "farmLocation": "Subukia Valley, Plot 42, off Nakuru-Nyahururu Rd",
    "landmarks": "Near Subukia Secondary School",
    "visitContactPhone": "0712 555 818",
    "farmSizeAcres": 5
  }
  ```

### 5.3 [PROPOSED NEW] `GET /api/products/:id`
- **Target Need**: Need 3 (Product information for website listing) & Need 4 (Inventory details)
- **Method / Path**: `GET /api/products/:id`
- **Access**: Public
- **Description**: Returns detailed product information and stock availability for a single product.
- **Proposed Response `200 OK`**:
  ```json
  {
    "product": {
      "id": 1,
      "kind": "input",
      "title": "Hybrid maize seed",
      "category": "Seeds",
      "price": 450,
      "unit": "kg",
      "stock": 75,
      "county": "Nakuru",
      "description": "Drought-tolerant maize seed suited to mid-altitude regions.",
      "sellerName": "Rift Farm Supplies",
      "sellerPhone": "0708 312 908",
      "createdAt": "2026-08-24 17:30:00"
    }
  }
  ```

### 5.4 [PROPOSED NEW] `GET /api/produce/:id`
- **Target Need**: Need 3 (Product/harvest info for website listing) & Need 4 (Available quantity)
- **Method / Path**: `GET /api/produce/:id`
- **Access**: Public
- **Description**: Returns single harvest produce listing details.
- **Proposed Response `200 OK`**:
  ```json
  {
    "produce": {
      "id": 1,
      "title": "Fresh tomatoes",
      "category": "Vegetables",
      "price": 85,
      "unit": "kg",
      "quantity": 320,
      "county": "Nakuru",
      "description": "Firm, graded field tomatoes. Available for pickup or arranged delivery.",
      "availableFrom": "Available now",
      "sellerName": "Grace Wanjiku",
      "sellerPhone": "0712 555 818",
      "createdAt": "2026-08-24 17:30:00"
    }
  }
  ```

### 5.5 [PROPOSED NEW] `GET /api/products/:id/inventory`
- **Target Need**: Need 4 (Access inventory details and stock levels)
- **Method / Path**: `GET /api/products/:id/inventory`
- **Access**: Public
- **Description**: Fast real-time check of inventory count and availability status.
- **Proposed Response `200 OK`**:
  ```json
  {
    "id": 1,
    "title": "Hybrid maize seed",
    "stock": 75,
    "unit": "kg",
    "inStock": true,
    "lastUpdated": "2026-08-24 17:30:00"
  }
  ```

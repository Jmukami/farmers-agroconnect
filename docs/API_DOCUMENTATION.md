# AgroConnect REST API Reference

The AgroConnect backend provides a RESTful JSON API running by default on port `3001` (with base path `/api`).

## Base URL & General Conventions

```text
http://localhost:3001/api
```

- **Data Exchange**: All request payloads and response bodies use `application/json`.
- **Authentication Header**: Protected endpoints require standard Bearer token format:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- **Error Response Structure**:
  ```json
  {
    "message": "Human readable error description",
    "fields": {
      "fieldName": "Specific validation error message"
    }
  }
  ```

---

## 1. System Health & Authentication

### 1.1 Health Check
Check whether the Express server and database connection are active.

- **Method / Endpoint**: `GET /api/health`
- **Authentication**: None (Public)
- **Response (200 OK)**:
  ```json
  {
    "status": "ok"
  }
  ```

---

### 1.2 User Registration
Register a new user account as a `farmer`, `buyer`, or `supplier`.

- **Method / Endpoint**: `POST /api/auth/register`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "fullName": "Grace Wanjiku",
    "email": "grace@agroconnect.local",
    "phone": "0712 555 818",
    "county": "Nakuru",
    "role": "farmer",
    "focus": "Maize and horticulture",
    "password": "agroconnect_password"
  }
  ```
- **Validation Rules**:
  - `fullName`: Required, minimum 2 characters.
  - `email`: Required, valid email format, unique (case-insensitive).
  - `phone`: Required, minimum 9 digits.
  - `county`: Required, minimum 2 characters.
  - `role`: Required, must be one of `'farmer'`, `'buyer'`, `'supplier'`.
  - `password`: Required, minimum 8 characters.
  - `focus`: Optional string.
- **Success Response (201 Created)**:
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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Error Responses**:
  - `409 Conflict`: Email already exists.
  - `422 Unprocessable Entity`: Validation failure on submitted fields.

---

### 1.3 User Login
Authenticate with an email address and password to retrieve a JWT token.

- **Method / Endpoint**: `POST /api/auth/login`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "grace@agroconnect.local",
    "password": "agroconnect"
  }
  ```
- **Success Response (200 OK)**:
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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Incorrect email or password.

---

### 1.4 Get Current Session User
Retrieve profile details for the currently authenticated session.

- **Method / Endpoint**: `GET /api/auth/me`
- **Authentication**: Bearer Token Required
- **Success Response (200 OK)**:
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
- **Error Responses**:
  - `401 Unauthorized`: Token missing, expired, or user not found.

---

## 2. Farmer Discovery (Downstream Integration Endpoints)

Sanitized endpoints designed for external consumers (e.g., Team 7 agricultural club integration) without leaking private credentials.

### 2.1 List All Farmers
- **Method / Endpoint**: `GET /api/farmers`
- **Authentication**: None (Public)
- **Success Response (200 OK)**:
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

---

### 2.2 Get Single Farmer by ID
- **Method / Endpoint**: `GET /api/farmers/:id`
- **Authentication**: None (Public)
- **Success Response (200 OK)**:
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
- **Error Responses**:
  - `404 Not Found`: Farmer not found or specified ID is not a farmer.

---

## 3. Produce Marketplace (`/api/produce`)

### 3.1 List Produce Listings
- **Method / Endpoint**: `GET /api/produce`
- **Authentication**: None (Public)
- **Query Parameters**:
  - `search` *(optional)*: Search term matched against title and description.
  - `category` *(optional)*: Exact category filter (e.g., `Vegetables`, `Cereals`).
  - `county` *(optional)*: Exact county filter (e.g., `Nakuru`, `Kisumu`).
- **Success Response (200 OK)**:
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

---

### 3.2 Create Produce Listing
- **Method / Endpoint**: `POST /api/produce`
- **Authentication**: Bearer Token Required (Must have `role: 'farmer'`)
- **Request Body**:
  ```json
  {
    "title": "Fresh tomatoes",
    "category": "Vegetables",
    "price": 85,
    "unit": "kg",
    "quantity": 320,
    "county": "Nakuru",
    "description": "Firm, graded field tomatoes. Available for pickup or arranged delivery.",
    "availableFrom": "Available now"
  }
  ```
- **Success Response (201 Created)**: Returns the newly created listing object.
- **Error Responses**:
  - `403 Forbidden`: Authenticated user is not a farmer.
  - `422 Unprocessable Entity`: Validation errors.

---

### 3.3 Update Produce Listing
- **Method / Endpoint**: `PUT /api/produce/:id`
- **Authentication**: Bearer Token Required (Owner only)
- **Request Body**: All fields from creation schema.
- **Success Response (200 OK)**: Returns updated listing object.
- **Error Responses**:
  - `403 Forbidden`: User does not own this listing.
  - `404 Not Found`: Listing does not exist.

---

### 3.4 Delete Produce Listing
- **Method / Endpoint**: `DELETE /api/produce/:id`
- **Authentication**: Bearer Token Required (Owner only)
- **Success Response (204 No Content)**
- **Error Responses**:
  - `403 Forbidden`: User does not own this listing.
  - `404 Not Found`: Listing does not exist.

---

## 4. Farm Inputs & Services (`/api/products`)

### 4.1 List Products
- **Method / Endpoint**: `GET /api/products`
- **Authentication**: None (Public)
- **Query Parameters**:
  - `kind` *(optional)*: Filter by `'input'` or `'service'`.
  - `search` *(optional)*: Text search in title and description.
  - `category` *(optional)*: Category filter.
  - `county` *(optional)*: County filter.
- **Success Response (200 OK)**:
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

---

### 4.2 Create Product Offering
- **Method / Endpoint**: `POST /api/products`
- **Authentication**: Bearer Token Required (Must have `role: 'supplier'`)
- **Request Body**:
  ```json
  {
    "kind": "input",
    "title": "Drip irrigation kit",
    "category": "Irrigation",
    "price": 4500,
    "unit": "set",
    "quantity": 9,
    "county": "Nakuru",
    "description": "Starter kit for a quarter-acre vegetable plot."
  }
  ```
- **Success Response (201 Created)**: Returns the newly created product.

---

### 4.3 Update Product Offering
- **Method / Endpoint**: `PUT /api/products/:id`
- **Authentication**: Bearer Token Required (Owner only)

---

### 4.4 Delete Product Offering
- **Method / Endpoint**: `DELETE /api/products/:id`
- **Authentication**: Bearer Token Required (Owner only)

---

## 5. Orders & Checkout (`/api/orders`)

### 5.1 Place Order
Atomically creates an order, maps order items to their respective sellers, and decrements stock/quantities.

- **Method / Endpoint**: `POST /api/orders`
- **Authentication**: Bearer Token Required
- **Request Body**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "type": "produce",
        "quantity": 10
      },
      {
        "id": 2,
        "type": "product",
        "quantity": 2
      }
    ]
  }
  ```
- **Validation Rules**:
  - `items`: Array with 1 to 25 items.
  - `quantity`: Integer >= 1.
  - Cannot purchase self-owned items.
  - Inventory must be >= requested quantity.
- **Success Response (201 Created)**:
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
- **Error Responses**:
  - `409 Conflict`: Insufficient stock for one or more items.
  - `422 Unprocessable Entity`: Attempting to buy own listing or empty items list.

---

### 5.2 List User Orders
Retrieves all orders where the authenticated user is the buyer OR a seller of items in the order.

- **Method / Endpoint**: `GET /api/orders`
- **Authentication**: Bearer Token Required
- **Success Response (200 OK)**:
  ```json
  {
    "orders": [
      {
        "id": 1,
        "buyerId": 2,
        "total": 3250,
        "status": "pending",
        "createdAt": "2026-08-24 17:35:00",
        "buyerName": "Peter Otieno",
        "buyerPhone": "0722 610 445",
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

---

### 5.3 Update Order Status
Change the status of an order.

- **Method / Endpoint**: `PATCH /api/orders/:id/status`
- **Authentication**: Bearer Token Required
- **Request Body**:
  ```json
  {
    "status": "confirmed"
  }
  ```
- **Permitted Transitions**:
  - **Buyer**: Can change `pending` &rarr; `cancelled`.
  - **Seller**: Can change `pending` &rarr; `confirmed` &rarr; `fulfilled`.
- **Success Response (200 OK)**:
  ```json
  {
    "status": "confirmed"
  }
  ```
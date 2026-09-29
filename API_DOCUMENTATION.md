# 🔌 RealOnes BI - API Documentation

This document provides a comprehensive breakdown of every Application Programming Interface (API) route used in the RealOnes BI platform. 

The architecture utilizes a **Proxy Pattern**: The Next.js frontend calls its own internal proxy routes, which securely attach the user's JWT and forward the request to the high-performance Fastify backend.

---

## 1. Authentication APIs

### `POST /api/v1/auth/login` (Backend)
* **Purpose**: Authenticates a user and generates a JSON Web Token (JWT).
* **Location**: `realones-bi-backend/src/routes/auth.ts`
* **Request Body**: 
  ```json
  {
    "email": "admin@realones.com",
    "password": "password123"
  }
  ```
* **Response**: Returns the user's ID, role, region scope, and a secure `token` (JWT).
* **Frontend Integration**: Handled automatically by NextAuth.js via `src/app/api/auth/[...nextauth]/route.ts`.

---

## 2. Dashboard APIs

All Dashboard APIs require authentication. They enforce Role-Based Access Control (RBAC) by reading the user's region from the JWT and automatically appending `WHERE region IN (...)` to the SQL queries.

### `GET /api/v1/dashboard/summary`
* **Purpose**: Fetches the high-level Key Performance Indicators (KPIs) for the Executive Dashboard.
* **Location**: `realones-bi-backend/src/routes/dashboard.ts`
* **Next.js Proxy**: `/api/dashboard/summary`
* **SQL Mechanism**: Executes a raw PostgreSQL query across `orders` and `order_items`. Uses `::FLOAT` and `::INT` type casting to ensure JavaScript can serialize the raw data.
* **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "totalOrders": 7398,
      "revenue": 898000.50,
      "grossProfit": 359200.20,
      "profitMargin": 40
    }
  }
  ```

### `GET /api/v1/dashboard/revenue-trend`
* **Purpose**: Feeds the 24-Month Revenue Trend Line Chart on the dashboard.
* **Location**: `realones-bi-backend/src/routes/dashboard.ts`
* **Next.js Proxy**: `/api/dashboard/revenue-trend`
* **SQL Mechanism**: Uses a Common Table Expression (CTE) to fetch the 24 most recent months of revenue (`ORDER BY month DESC LIMIT 24`), then sorts them chronologically (`ORDER BY month ASC`).
* **Response**: Array of `{ month: "2026-05", revenue: 49677.4 }`.

### `GET /api/v1/dashboard/region-comparison`
* **Purpose**: Feeds the Revenue by Region Bar Chart on the dashboard.
* **Location**: `realones-bi-backend/src/routes/dashboard.ts`
* **Next.js Proxy**: `/api/dashboard/region-comparison`
* **SQL Mechanism**: Groups revenue by `regions.name` and orders descending.
* **Response**: Array of `{ region: "West", revenue: 240000.0 }`.

### `GET /api/v1/dashboard/category-comparison`
* **Purpose**: Fetches revenue segmented by product categories.
* **Location**: `realones-bi-backend/src/routes/dashboard.ts`
* **Next.js Proxy**: `/api/dashboard/category-comparison`
* **Response**: Array of `{ category: "Technology", revenue: 150000.0 }`.

---

## 3. AI Orchestration APIs

### `POST /api/v1/query/full-run`
* **Purpose**: The core engine of the "Ask RealOnes" page. It orchestrates the entire AI pipeline: translating English to SQL, executing the SQL, and translating the results back to an English insight.
* **Location**: `realones-bi-backend/src/routes/query.ts`
* **Next.js Proxy**: `/api/query/full-run`
* **Request Body**:
  ```json
  {
    "question": "What were the top 3 most profitable products last year?"
  }
  ```
* **Pipeline Flow**:
  1. **Plan**: Calls Gemini AI (`src/lib/ai/gemini.ts`) to generate a PostgreSQL query based on the `schema.prisma`.
  2. **Validate**: Passes the SQL through `SqlValidatorService` to block destructive commands (`DROP`, `DELETE`).
  3. **Execute**: Runs the SQL securely against the Kaggle dataset via `prisma.$queryRawUnsafe`.
  4. **Analyze**: Passes the raw SQL output *back* to Gemini AI to generate a human-readable `realInsight`.
* **Response**:
  ```json
  {
    "success": true,
    "generatedSQL": "SELECT p.name, SUM(...) FROM products p ...",
    "queryResult": {
      "columns": ["productName", "profit"],
      "rows": [
        { "productName": "Canon ImageCLASS", "profit": 25000.0 }
      ],
      "rowCount": 1
    },
    "realInsight": "The Canon ImageCLASS was your most profitable product, generating $25,000 in profit.",
    "realCheckCard": {
      "sqlValidationStatus": "PASSED"
    }
  }
  ```

---

## 4. Why Use the Proxy Pattern?
Notice how the Next.js frontend makes requests to `/api/dashboard/summary` instead of calling `http://localhost:4000/api/v1/dashboard/summary` directly. 

**Why?**
1. **Security**: The Next.js API routes run on the server. They extract the secure JWT from the HTTP-only NextAuth cookie and attach it as a Bearer token before sending the request to Fastify. This means the JWT is *never* exposed to the user's browser via JavaScript.
2. **CORS Prevention**: By proxying through the frontend's domain (`localhost:3000`), the browser never throws Cross-Origin Resource Sharing (CORS) errors.

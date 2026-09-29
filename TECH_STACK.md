# 💻 RealOnes BI - Technical Stack

This document details the exact technologies used to build the RealOnes BI platform, explaining **what** each tool is used for and **why** it was chosen over other alternatives.

---

## 1. Frontend Architecture
The frontend is responsible for the user interface, session handling, and data visualization.

### Next.js (React Framework)
* **What it does**: Powers the entire frontend web application using the modern App Router (`src/app`). It handles page routing, UI components, and API proxying.
* **Why it was chosen**: Next.js provides incredible flexibility by combining server-side rendering (SSR) for performance and client-side rendering for interactive dashboards. Its built-in API routing allows us to securely proxy requests to the backend without exposing backend ports directly to the browser.

### TailwindCSS
* **What it does**: Provides the utility classes used to structure the layout (though we migrated the core theming to a custom CSS architecture in `globals.css` for the Premium Light Theme).
* **Why it was chosen**: Rapid prototyping. It allows developers to build responsive grid layouts and spacing without writing hundreds of lines of custom CSS.

### Recharts
* **What it does**: Renders the SVG-based interactive charts on the Executive Dashboard (Revenue Trend, Revenue by Region).
* **Why it was chosen**: Recharts is built specifically for React. Instead of writing complex imperative chart logic (like Chart.js), Recharts allows us to declaratively pass our database JSON straight into `<LineChart>` and `<BarChart>` components.

### NextAuth.js
* **What it does**: Manages the user login lifecycle and browser session cookies.
* **Why it was chosen**: It is the industry standard for Next.js authentication. We configured it to use a "Credentials Provider", which takes the user's login, sends it to our Fastify backend, and securely stores the returned JWT inside a secure HTTP-only cookie.

---

## 2. Backend Architecture
The backend is completely decoupled from the frontend to act as a high-performance data and AI orchestration layer.

### Fastify (Node.js API Framework)
* **What it does**: Serves the REST API (`http://localhost:4000`), processes dashboard aggregations, and handles AI pipeline requests.
* **Why it was chosen**: Performance. Fastify is significantly faster and handles higher throughput than Express.js, making it the ideal choice for an analytics backend that needs to parse thousands of rows of database records.

### @fastify/jwt
* **What it does**: Verifies the JSON Web Tokens sent by the Next.js frontend.
* **Why it was chosen**: It integrates natively into Fastify’s lifecycle hooks. We use a `preValidation` hook to instantly block unauthenticated requests and extract the user's role/region before the route even begins executing.

### Google GenAI SDK (`@google/genai`)
* **What it does**: Connects the backend to the Gemini AI API (specifically `gemini-3.5-flash`).
* **Why it was chosen**: To power the "Ask RealOnes" feature. Gemini 3.5 Flash is highly capable of understanding relational database schemas and generating complex PostgreSQL queries rapidly, bridging the gap between natural language and SQL.

---

## 3. Database & ORM Layer
The data layer stores the Kaggle Superstore dataset and executes the complex queries.

### PostgreSQL (Relational Database)
* **What it does**: Stores all structured data across interconnected tables (`customers`, `orders`, `order_items`, `regions`, `products`).
* **Why it was chosen**: Relational integrity and SQL. Business intelligence relies heavily on `JOIN`s, `GROUP BY` aggregations, and filtering. NoSQL databases (like MongoDB) are entirely unsuited for this. PostgreSQL is the industry standard open-source relational database.

### Prisma ORM
* **What it does**: Manages the database schema (`schema.prisma`), handles migrations (`prisma db push`), and provides a type-safe database client.
* **Why it was chosen**: Developer velocity and safety. Prisma automatically generates TypeScript types for our database. Furthermore, its `$queryRawUnsafe` function allows us to drop down into raw PostgreSQL queries (and cast `::FLOAT` or `::INT`) when complex aggregations are required for the dashboard.

---

## 4. Build Tools & Utilities

### TypeScript
* **What it does**: Adds static typing to JavaScript across both the frontend and backend.
* **Why it was chosen**: To catch errors at compile-time rather than runtime. By strictly typing our AI responses and database queries, we prevent massive classes of UI crashing bugs.

### tsx
* **What it does**: Allows us to execute `.ts` scripts directly in the terminal (e.g., `npx tsx prisma/import-kaggle.ts`).
* **Why it was chosen**: Without `tsx`, we would have to manually compile our ETL scripts to JavaScript using `tsc` before running them. `tsx` does this seamlessly on the fly.

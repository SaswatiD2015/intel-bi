# 📑 Product Requirements Document (PRD)
**Product Name:** RealOnes BI  
**Version:** 1.0.0  
**Last Updated:** September 2026  

---

## 1. Overview & Vision
**RealOnes BI** is an AI-powered Business Intelligence platform designed to democratize data analytics. By integrating the Google Gemini Large Language Model (LLM) directly into the database architecture, RealOnes BI allows non-technical executives and managers to query complex relational data using plain English, bypassing the need for specialized data engineering or manual SQL writing.

**Vision:** To completely eliminate the bottleneck between business questions and data answers by providing instant, AI-generated analytical insights.

---

## 2. Target Audience
* **C-Suite Executives**: Require instant access to high-level KPIs (Revenue, Profit Margins, Total Orders) without running complex reports.
* **Regional Managers**: Need access to territory-specific data. They require strict Role-Based Access Control (RBAC) to ensure they only view data pertaining to their regions.
* **Business Analysts**: Require a fast, ad-hoc querying tool to instantly validate hypotheses without writing boilerplate SQL.

---

## 3. Core Features & Requirements

### 3.1 Executive Dashboard
* **KPI Metrics**: Display real-time, aggregated data for Revenue, Gross Profit, Profit Margin, and Total Orders.
* **Data Visualization**: Render interactive charts using Recharts:
  * 24-Month Revenue Trend (Line Chart).
  * Revenue by Region (Bar Chart).
* **Premium UI**: Implement a pristine "Premium Light Theme" featuring glassmorphism cards and highly readable data tables.

### 3.2 "Ask RealOnes" Conversational Engine
* **Natural Language to SQL**: Users must be able to type questions in plain English (e.g., *"What were the top 3 regions by revenue last year?"*).
* **AI Orchestration**: The system must securely pass the database schema and the user's question to the Google Gemini AI to generate an optimized PostgreSQL query.
* **SQL Validation**: The backend must intercept and validate the AI-generated SQL to prevent destructive operations (e.g., rejecting any `DROP`, `UPDATE`, or `DELETE` commands).
* **Automated Insights**: After executing the SQL, the system must feed the raw data rows back to the AI to generate a human-readable English summary of the findings.

### 3.3 Security & Role-Based Access Control (RBAC)
* **Authentication**: Users must log in via a secure JWT-based authentication system.
* **Data Masking**: The system must enforce row-level security. If a user is a "Regional Manager" for the "West" region, the backend must automatically inject `WHERE region = 'West'` into all Dashboard and AI-generated SQL queries.

### 3.4 Data Ingestion 
* **Custom Datasets**: The system must support the ingestion of massive CSV datasets (e.g., the Kaggle Superstore Sales dataset) via a dedicated backend ETL script (`import-kaggle.ts`).
* **Relational Normalization**: The data must be normalized into robust PostgreSQL tables (`orders`, `order_items`, `customers`, `products`, `regions`).

---

## 4. Technical Stack
* **Frontend**: Next.js (App Router), React, Recharts, TailwindCSS.
* **Backend**: Fastify (Node.js framework optimized for high throughput).
* **Database**: PostgreSQL (Relational DB) managed via Prisma ORM.
* **AI Engine**: Google GenAI SDK (`gemini-3.5-flash` model).

---

## 5. User Flow
1. **Authentication**: User accesses `http://localhost:3000/login` and provides credentials.
2. **Dashboard**: User lands on the Executive Dashboard. The Fastify backend intercepts their JWT and returns only the data they are authorized to see.
3. **Querying**: User navigates to the "Ask RealOnes" tab and submits a question.
4. **Execution**: The backend requests SQL from Gemini, runs it against Postgres, and returns a JSON payload containing the exact data rows and an AI-generated insight.
5. **Consumption**: The user views the data in a clean, scrollable UI table.

---

## 6. Future Milestones (v2.0)
* **Export Capabilities**: Allow users to export AI-generated data tables to CSV or PDF reports.
* **Dynamic AI Charting**: Upgrade the "Ask RealOnes" engine to automatically generate UI charts (Pie, Bar, Line) alongside the data table based on the user's query context.
* **Scheduled Reporting**: Implement cron jobs to email regional managers their specific dashboard summaries every Monday morning.

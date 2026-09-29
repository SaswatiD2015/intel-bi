# RealOnes BI — Real Data, Real Metrics, Real Decisions

RealOnes BI is a next-generation Business Intelligence platform built for non-technical users. It addresses the "trust deficit" in AI-generated SQL by providing extreme transparency, guaranteed data quality, and deterministic governance for all generated metrics and insights.

## Core Features

1. **Reality Check Engine**: AST-level parsing to guarantee generated SQL is read-only, uses approved tables, follows approved join paths, and filters out PII unless explicitly authorized.
2. **Deterministic Data Vibe**: Before you make a decision, the platform verifies data freshness, anomaly absence, and schema integrity to assign a "Data Vibe" status (Good, Needs Attention, High Risk).
3. **The Real Score**: A combined score of the SQL validity, data quality, and metric usage to rate the confidence of the AI's output.
4. **Decision Receipts**: Document business decisions made based on data, capturing expected outcomes and impact for later evaluation.
5. **RealTalk History**: Save high-quality queries and approved metrics directly to a catalog.

## Tech Stack
- Next.js 15 (App Router)
- React, Tailwind CSS, shadcn/ui, Recharts
- Prisma ORM & SQLite (for demo purposes)
- NextAuth.js
- `node-sql-parser` for AST validation

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Push the database schema:**
   ```bash
   npx prisma db push
   ```

3. **Seed the database (creates 5,000+ demo orders and synthetic metrics):**
   ```bash
   npx tsx prisma/seed.ts
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Demo Credentials
- **Analyst (Full Access):** `analyst@realonesbi.demo` / `Demo123!`
- **Business User (South Region Only):** `business@realonesbi.demo` / `Demo123!`

## Architecture

- `src/lib/sql/validator.ts`: AST-based validation for read-only safety, join constraints, and row-level security.
- `src/lib/semantic/index.ts`: Semantic matching for metrics, dimensions, and glossary retrieval.
- `src/lib/quality/index.ts`: Deterministic engine for checking data freshness, missing values, and logical anomalies.
- `src/lib/governance/real-score.ts`: Computes the Real Score (High, Medium, Low) based on pipeline heuristics.
- `src/lib/ai/pipeline.ts`: The central 25-step orchestration pipeline combining the semantic, validation, execution, and insight layers.

# RealOnes BI - Complete Project Start Guide

This workspace contains two major components of the RealOnes BI platform:

1. **`realones-bi`** (The initial Next.js Full-Stack App with SQLite)
2. **`realones-bi-backend`** (The production-ready Fastify + PostgreSQL Backend)

Depending on which one you want to run, follow the steps below.

---

## Option 1: Starting the Production Fastify Backend (Recommended)
*Located in the `realones-bi-backend` folder.*

This is the fully separated backend running on Node.js, Fastify, and PostgreSQL. It enforces strict AST SQL parsing and Role-Based Access Control.

### Step 1: Start the Database (Docker required)
Open a terminal in the backend directory and spin up the PostgreSQL database in the background:
```bash
cd realones-bi-backend
docker-compose up -d
```

### Step 2: Push Schema & Seed Data
Create all the tables and insert the 5,000 realistic dummy orders and customers.
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### Step 3: Start the Backend Server
Start the Fastify API server.
```bash
npm run dev
```

* The API will be available at: `http://localhost:4000`
* The Swagger Documentation will be at: `http://localhost:4000/docs`

### Step 4: Stopping the Backend
When you are done working, you can shut everything down by pressing `Ctrl + C` in the terminal to kill the server, and then stopping the database:
```bash
docker-compose down
```

---

## Option 2: Starting the Next.js Frontend App
*Located in the `realones-bi` folder.*

This is the initial full-stack React application with built-in API routes.

### Step 1: Navigate to the Directory
```bash
cd realones-bi
```

### Step 2: Start the Next.js Development Server
```bash
npm run dev
```

* The Web App will be available at: `http://localhost:3000`
* You can sign in using `business@realonesbi.demo` and `Demo123!`

### Step 3: Stopping the Frontend
When you are done, simply press `Ctrl + C` in your terminal to stop the Next.js server.

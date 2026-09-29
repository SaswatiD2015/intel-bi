# 📊 RealOnes BI (intel-bi)

An AI-powered Business Intelligence platform that allows non-technical executives and managers to query complex relational database records using plain English.

By integrating the Google Gemini Large Language Model (LLM) into a high-performance Fastify backend, RealOnes BI converts natural language into validated PostgreSQL queries, executes them against a real dataset, and generates conversational insights alongside interactive Next.js Recharts dashboards.

---

## 📋 Prerequisites
Before you begin, ensure you have the following installed on your local machine:
1. **Node.js** (v18.0.0 or higher)
2. **PostgreSQL** (Ensure the database server is running locally or you have a cloud connection string)
3. **Google Gemini API Key** (Get one for free at [Google AI Studio](https://aistudio.google.com/))

---

## 🚀 Complete Step-by-Step Installation Guide

### Step 1: Clone the Repository
Clone the project and open the root directory in your terminal.
```bash
git clone https://github.com/lokeshgit1/intel-bi.git
cd intel-bi
```

### Step 2: Configure Environment Variables
This project requires two separate `.env` files (one for the backend and one for the frontend).

**1. Backend Environment Variables:**
Navigate to the backend directory and create a `.env` file:
```bash
cd realones-bi-backend
```
Create a file named `.env` and add the following:
```env
# The connection string to your PostgreSQL database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/realones?schema=public"

# The JWT Secret for Fastify Session Auth (Make up a random string)
JWT_SECRET="super-secret-jwt-key-2024"

# Your Google Gemini API Key
GEMINI_API_KEY="AIzaSyYourGeminiKeyGoesHere"
```

**2. Frontend Environment Variables:**
Navigate back to the frontend directory and create a `.env` file:
```bash
cd ../realones-bi
```
Create a file named `.env` and add the following:
```env
# The secret NextAuth uses to encrypt browser cookies
NEXTAUTH_SECRET="another-super-secret-key-2024"

# The URL of your Next.js application
NEXTAUTH_URL="http://localhost:3000"
```

---

### Step 3: Install Dependencies
You need to install the NPM packages for **both** the frontend and the backend. Open two terminal windows or run these sequentially:

**Backend:**
```bash
cd realones-bi-backend
npm install
```

**Frontend:**
```bash
cd realones-bi
npm install
```

---

### Step 4: Initialize the Database Schema
Navigate to the backend directory. You need to push the Prisma relational schema to your empty PostgreSQL database.
```bash
cd realones-bi-backend
npx prisma db push
```

---

### Step 5: Data Ingestion (Kaggle Dataset)
To populate the Executive Dashboard, you need to import the Superstore Sales dataset.

1. Download the "Superstore Sales Dataset" from Kaggle (or use a compatible CSV).
2. Open `realones-bi-backend/prisma/import-kaggle.ts`.
3. Locate line 7: `const csvFilePath = 'C:\\path\\to\\your\\train.csv';` and update it to the absolute path of your downloaded CSV file.
4. Run the ETL script to parse the CSV, normalize the dates, and insert the rows into PostgreSQL:
```bash
npx tsx prisma/import-kaggle.ts
```

---

### Step 6: Start the Development Servers
You must start both the Fastify backend and the Next.js frontend simultaneously in two separate terminal windows.

**Terminal 1 (Backend):**
```bash
cd realones-bi-backend
npm run dev
# Server listening on http://localhost:4000
```

**Terminal 2 (Frontend):**
```bash
cd realones-bi
npm run dev
# Server listening on http://localhost:3000
```

---

### Step 7: Login and Use the Platform
1. Open your web browser and navigate to `http://localhost:3000`.
2. The data ingestion script automatically creates an Admin account. Login with:
   * **Email**: `admin@realones.com`
   * **Password**: `password123`
3. View your data on the **Executive Dashboard**.
4. Navigate to **Ask RealOnes** and type a business question to test the AI SQL engine!

---

## 📚 Technical Documentation
To understand the engineering decisions behind this platform, check out the included documentation files in the root directory:
* [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive into the AI orchestration pipeline and Proxy API pattern.
* [PRD.md](./PRD.md) - The Product Requirements Document outlining target audiences, RBAC, and core features.
* [TECH_STACK.md](./TECH_STACK.md) - Detailed breakdown of Fastify, Next.js, Prisma, and Gemini, including *why* each was chosen.
* [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - The exact JSON payload structures and routing maps for the backend REST API.
* [DATA_IMPORT_GUIDE.md](./realones-bi-backend/DATA_IMPORT_GUIDE.md) - Comprehensive steps for modifying the ETL script for new datasets.

# 📊 RealOnes BI - Data Import Guide

This guide explains how to upload or connect a brand-new CSV dataset to the RealOnes BI platform, so that the AI (Gemini) and the Next.js Executive Dashboard can query it.

## 📌 Prerequisites
Your new CSV dataset needs to be parsed and inserted into the PostgreSQL database. Because RealOnes BI is a structured relational platform, the CSV data must be mapped to your Prisma schema (`prisma/schema.prisma`), which currently includes:
- `customers`
- `regions`
- `products` (and `product_categories`)
- `orders`
- `order_items`

If your new CSV has completely different columns (e.g., Healthcare Data instead of Retail Data), you will first need to update `prisma/schema.prisma` and run `npx prisma db push`.

---

## 🚀 Step 1: Locate Your CSV File
1. Download your CSV dataset (e.g., from Kaggle).
2. Note the absolute path to the file (e.g., `C:\Users\YourName\Downloads\new_dataset.csv`).

---

## 🛠️ Step 2: Create or Update an Import Script
We use TypeScript scripts to safely read the CSV and insert it into the database using Prisma. 

You can either modify the existing `prisma/import-kaggle.ts` or create a new script:
1. Open `prisma/import-kaggle.ts`.
2. Change the `csvFilePath` variable at the top of the file to point to your new CSV:
   ```typescript
   const csvFilePath = 'C:\\Users\\YourName\\Downloads\\new_dataset.csv';
   ```
3. Update the `csv.parse()` logic inside the script so that it correctly maps the column names from your new CSV to the Prisma database models. 
   *(For example, if your new CSV has a column named `Client_ID` instead of `Customer ID`, you must update the script to read `row['Client_ID']`.)*

---

## 🏃 Step 3: Execute the Import
Once your script is ready to map the CSV rows into the database, run it using `tsx` (TypeScript Execute) from the backend folder:

```bash
cd realones-bi-backend
npx tsx prisma/import-kaggle.ts
```

*Note: If you want to wipe the old data before importing the new data, you can uncomment the deletion commands (e.g., `prisma.orderItem.deleteMany()`) at the top of the import script.*

---

## 🔄 Step 4: Restart the Backend
The AI architecture and the Executive Dashboard rely on the Fastify backend to execute SQL and serve data.

1. Stop your running backend server (`Ctrl + C`).
2. Start it again:
   ```bash
   npm run dev
   ```

---

## 📈 Step 5: Verify the Data
1. Open your browser and go to the Next.js frontend (`http://localhost:3000/dashboard`).
2. Do a **Hard Refresh (Ctrl + Shift + R)**.
3. Your KPI cards and Recharts should instantly populate with the new data.
4. Go to the **Ask RealOnes** page and type a query! The Gemini AI will now write and execute SQL against your brand-new dataset!

### Troubleshooting
* **Charts show $0 or NaN**: Check `src/routes/dashboard.ts`. If your new dataset spans different years, ensure the `LIMIT` and `ORDER BY` clauses in the SQL queries are fetching the correct timeframe.
* **AI throws 500 Errors**: Ensure your `GEMINI_API_KEY` in the `.env` file is active and not experiencing high-traffic Google API outages.

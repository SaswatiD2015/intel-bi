import { PrismaClient, OrderStatus } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

const prisma = new PrismaClient();
const csvFilePath = 'C:\\Users\\chlok\\Downloads\\archive\\train.csv';

async function main() {
  console.log('🚀 Starting Kaggle Superstore Import Process...');

  if (!fs.existsSync(csvFilePath)) {
    console.error('❌ ERROR: superstore.csv not found!');
    console.log('Please download the CSV from Kaggle and place it in the realones-bi-backend folder as "superstore.csv".');
    console.log('Link: https://www.kaggle.com/datasets/rohitsahoo/sales-forecasting');
    process.exit(1);
  }

  // Caches for relations to avoid redundant DB queries
  const regionMap = new Map();
  const customerMap = new Map();
  const categoryMap = new Map();
  const productMap = new Map();
  const orderMap = new Map();

  let count = 0;

  console.log('⏳ Reading CSV and importing into PostgreSQL...');
  
  const stream = fs.createReadStream(csvFilePath).pipe(csv());
  
  for await (const row of stream) {
    // 1. Region
    let regionId = regionMap.get(row['Region']);
    if (!regionId) {
      const region = await prisma.region.upsert({
        where: { name: row['Region'] },
        update: {},
        create: { name: row['Region'] }
      });
      regionId = region.id;
      regionMap.set(row['Region'], regionId);
    }

    // 2. Customer
    let customerId = customerMap.get(row['Customer ID']);
    if (!customerId) {
      let customer = await prisma.customer.findFirst({
        where: { email: `${row['Customer ID'].toLowerCase()}@demo.com` }
      });
      
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            email: `${row['Customer ID'].toLowerCase()}@demo.com`,
            name: row['Customer Name'],
            segment: row['Segment']
          }
        });
      }
      customerId = customer.id;
      customerMap.set(row['Customer ID'], customerId);
    }

    // 3. Category
    let categoryId = categoryMap.get(row['Category']);
    if (!categoryId) {
      const cat = await prisma.productCategory.upsert({
        where: { name: row['Category'] },
        update: {},
        create: { name: row['Category'] }
      });
      categoryId = cat.id;
      categoryMap.set(row['Category'], categoryId);
    }

    // 4. Product
    let productId = productMap.get(row['Product ID']);
    if (!productId) {
      // Create product. The CSV gives us Sales and Quantity, so Unit Cost = (Sales / Quantity) approximately.
      const unitCost = (parseFloat(row['Sales']) / parseInt(row['Quantity'])) || 0;
      
      const prod = await prisma.product.create({
        data: {
          name: row['Product Name'] || 'Unknown Product',
          categoryId: categoryId,
          unitCost: unitCost
        }
      });
      productId = prod.id;
      productMap.set(row['Product ID'], productId);
    }

    // 5. Order
    let orderId = orderMap.get(row['Order ID']);
    if (!orderId) {
      // Parse DD/MM/YYYY or MM/DD/YYYY to valid Date
      const dateStr = row['Order Date'];
      let orderDate = new Date();
      if (dateStr) {
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        // Fallback robust date parsing
        orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (isNaN(orderDate.getTime())) orderDate = new Date(dateStr); 
      }

      const order = await prisma.order.create({
        data: {
          customerId: customerId,
          regionId: regionId,
          orderDate: orderDate,
          status: OrderStatus.COMPLETED
        }
      });
      orderId = order.id;
      orderMap.set(row['Order ID'], orderId);
    }

    // 6. Order Item
    const unitPrice = (parseFloat(row['Sales']) / parseInt(row['Quantity'])) || 0;
    const discount = parseFloat(row['Discount']) || 0;

    await prisma.orderItem.create({
      data: {
        orderId: orderId,
        productId: productId,
        quantity: parseInt(row['Quantity']) || 1,
        unitPrice: unitPrice,
        discount: discount
      }
    });

    count++;
    if (count % 500 === 0) {
      console.log(`✅ Imported ${count} rows...`);
    }
  }

  console.log(`🎉 Success! Completely imported ${count} rows of Superstore Sales data!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

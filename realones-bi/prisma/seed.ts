// ============================================================================
// RealOnes BI - Database Seed Script
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🚀 Seeding RealOnes BI database...');

  // Clear existing data (SQLite compatible)
  await prisma.auditLog.deleteMany();
  await prisma.userFeedback.deleteMany();
  await prisma.decisionReview.deleteMany();
  await prisma.savedQuestion.deleteMany();
  await prisma.queryRun.deleteMany();
  await prisma.dataQualityRun.deleteMany();
  await prisma.modelUsageMetric.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.return.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customerChurnScore.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.salesTarget.deleteMany();
  await prisma.approvedQueryExample.deleteMany();
  await prisma.approvedJoinPath.deleteMany();
  await prisma.schemaRelationship.deleteMany();
  await prisma.schemaColumn.deleteMany();
  await prisma.schemaTable.deleteMany();
  await prisma.metricDimension.deleteMany();
  await prisma.metricSynonym.deleteMany();
  await prisma.metricDefinition.deleteMany();
  await prisma.businessGlossary.deleteMany();
  await prisma.userRegionAccess.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.region.deleteMany();

  console.log('📦 Creating roles...');
  const analystRole = await prisma.role.create({ data: { name: 'analyst', description: 'Full access analyst' } });
  const businessRole = await prisma.role.create({ data: { name: 'business_user', description: 'Regional business user' } });

  console.log('🌍 Creating regions...');
  const regions = await Promise.all([
    prisma.region.create({ data: { name: 'North', code: 'NORTH' } }),
    prisma.region.create({ data: { name: 'South', code: 'SOUTH' } }),
    prisma.region.create({ data: { name: 'East', code: 'EAST' } }),
    prisma.region.create({ data: { name: 'West', code: 'WEST' } }),
  ]);

  console.log('👤 Creating users...');
  const analystUser = await prisma.user.create({
    data: {
      email: 'analyst@realonesbi.demo',
      passwordHash: hashPassword('Demo123!'),
      name: 'Alex Analyst',
    },
  });
  const businessUser = await prisma.user.create({
    data: {
      email: 'business@realonesbi.demo',
      passwordHash: hashPassword('Demo123!'),
      name: 'Blake Business',
    },
  });

  // Assign roles
  await prisma.userRole.create({ data: { userId: analystUser.id, roleId: analystRole.id } });
  await prisma.userRole.create({ data: { userId: businessUser.id, roleId: businessRole.id } });

  // Assign region access
  for (const region of regions) {
    await prisma.userRegionAccess.create({ data: { userId: analystUser.id, regionId: region.id } });
  }
  const southRegion = regions.find(r => r.name === 'South')!;
  await prisma.userRegionAccess.create({ data: { userId: businessUser.id, regionId: southRegion.id } });

  console.log('📁 Creating product categories...');
  const categoryNames = [
    'Electronics', 'Clothing', 'Home & Kitchen', 'Sports & Outdoors',
    'Books', 'Health & Beauty', 'Toys & Games', 'Food & Beverages',
    'Automotive', 'Office Supplies', 'Garden & Patio', 'INVALID_CAT'
  ];
  const categories = await Promise.all(
    categoryNames.map(name =>
      prisma.productCategory.create({
        data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
      })
    )
  );

  console.log('📦 Creating products...');
  const productData = [
    { name: 'Wireless Headphones', cat: 0, price: 79.99, cost: 35.00 },
    { name: 'Smart Watch', cat: 0, price: 199.99, cost: 89.00 },
    { name: 'Bluetooth Speaker', cat: 0, price: 49.99, cost: 22.00 },
    { name: 'USB-C Hub', cat: 0, price: 39.99, cost: 15.00 },
    { name: 'Laptop Stand', cat: 0, price: 59.99, cost: 25.00 },
    { name: 'Cotton T-Shirt', cat: 1, price: 24.99, cost: 8.00 },
    { name: 'Denim Jeans', cat: 1, price: 49.99, cost: 18.00 },
    { name: 'Running Shoes', cat: 1, price: 89.99, cost: 35.00 },
    { name: 'Winter Jacket', cat: 1, price: 129.99, cost: 55.00 },
    { name: 'Coffee Maker', cat: 2, price: 69.99, cost: 28.00 },
    { name: 'Air Purifier', cat: 2, price: 149.99, cost: 65.00 },
    { name: 'Bed Sheets Set', cat: 2, price: 59.99, cost: 20.00 },
    { name: 'Yoga Mat', cat: 3, price: 29.99, cost: 10.00 },
    { name: 'Dumbbells Set', cat: 3, price: 79.99, cost: 30.00 },
    { name: 'Tent 4-Person', cat: 3, price: 149.99, cost: 60.00 },
    { name: 'Programming Book', cat: 4, price: 39.99, cost: 12.00 },
    { name: 'Business Strategy Book', cat: 4, price: 29.99, cost: 10.00 },
    { name: 'Vitamin D Supplement', cat: 5, price: 19.99, cost: 5.00 },
    { name: 'Skincare Set', cat: 5, price: 44.99, cost: 15.00 },
    { name: 'Board Game', cat: 6, price: 34.99, cost: 14.00 },
    { name: 'LEGO Set', cat: 6, price: 59.99, cost: 25.00 },
    { name: 'Organic Coffee Beans', cat: 7, price: 18.99, cost: 7.00 },
    { name: 'Protein Bars Pack', cat: 7, price: 24.99, cost: 9.00 },
    { name: 'Car Phone Mount', cat: 8, price: 15.99, cost: 4.00 },
    { name: 'Dash Cam', cat: 8, price: 89.99, cost: 35.00 },
    { name: 'Ergonomic Keyboard', cat: 9, price: 69.99, cost: 28.00 },
    { name: 'Standing Desk Pad', cat: 9, price: 34.99, cost: 12.00 },
    { name: 'Garden Hose Set', cat: 10, price: 39.99, cost: 15.00 },
    { name: 'Solar Lights', cat: 10, price: 29.99, cost: 10.00 },
    { name: 'Mystery Product', cat: 11, price: 9.99, cost: 3.00 },
  ];

  const products = await Promise.all(
    productData.map((p, i) =>
      prisma.product.create({
        data: {
          productId: `PROD-${String(i + 1).padStart(4, '0')}`,
          name: p.name,
          categoryId: categories[p.cat].id,
          unitPrice: p.price,
          costPrice: p.cost,
        },
      })
    )
  );

  console.log('👥 Creating 1200 customers...');
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Lisa', 'Matthew', 'Nancy', 'Anthony', 'Betty', 'Mark', 'Margaret', 'Steven', 'Sandra'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const segments = ['Enterprise', 'SMB', 'Startup', 'Individual', null]; // null for missing segments

  const customers = [];
  for (let i = 0; i < 1200; i++) {
    const fn = randomElement(firstNames);
    const ln = randomElement(lastNames);
    const region = randomElement(regions);
    const segment = randomElement(segments);

    const customer = await prisma.customer.create({
      data: {
        customerId: `CUST-${String(i + 1).padStart(5, '0')}`,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
        phone: Math.random() > 0.1 ? `+1-${randomInt(200, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}` : null,
        address: Math.random() > 0.05 ? `${randomInt(100, 9999)} ${randomElement(['Main', 'Oak', 'Elm', 'Park', 'Cedar'])} St` : null,
        city: randomElement(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Dallas', 'Miami', 'Atlanta', 'Boston', 'Denver']),
        regionId: region.id,
        segment,
      },
    });
    customers.push(customer);
  }

  console.log('🛒 Creating orders (24 months of data)...');
  const statuses: ('completed' | 'pending' | 'cancelled' | 'returned')[] = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'pending', 'cancelled', 'returned'];
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);

  let orderCount = 0;
  const allOrders = [];

  for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
    const monthDate = new Date(twoYearsAgo.getFullYear(), twoYearsAgo.getMonth() + monthOffset, 1);
    const nextMonth = new Date(twoYearsAgo.getFullYear(), twoYearsAgo.getMonth() + monthOffset + 1, 1);

    // Vary orders per month (200-400)
    const ordersThisMonth = randomInt(200, 400);

    for (let j = 0; j < ordersThisMonth; j++) {
      const customer = randomElement(customers);
      const status = randomElement(statuses);
      const orderDate = randomDate(monthDate, nextMonth);
      const discount = Math.random() > 0.8 ? randomDecimal(5, 50) : 0;

      // Data quality issue: some orders have null data_loaded_at
      const dataLoadedAt = Math.random() > 0.05
        ? new Date(orderDate.getTime() + randomInt(1, 48) * 3600000)
        : null;

      // Intentional data quality issue: some stale records
      const actualDataLoadedAt = Math.random() > 0.98 ? new Date(2023, 0, 1) : dataLoadedAt;

      const order = await prisma.order.create({
        data: {
          orderId: `ORD-${String(orderCount + 1).padStart(6, '0')}`,
          customerId: customer.id,
          regionId: customer.regionId,
          status,
          orderDate,
          discount,
          dataLoadedAt: actualDataLoadedAt,
        },
      });

      // Create 1-5 order items
      const itemCount = randomInt(1, 5);
      for (let k = 0; k < itemCount; k++) {
        const product = randomElement(products);
        const quantity = randomInt(1, 10);
        // Data quality issue: a few unusually large order values
        const unitPrice = Math.random() > 0.995
          ? Number(product.unitPrice) * 100 // Outlier!
          : Number(product.unitPrice);

        // Data quality issue: a few negative values
        const actualUnitPrice = Math.random() > 0.998 ? -unitPrice : unitPrice;

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity,
            unitPrice: actualUnitPrice,
          },
        });
      }

      // Create returns for returned orders
      if (status === 'returned' || (status === 'completed' && Math.random() > 0.9)) {
        await prisma.return.create({
          data: {
            orderId: order.id,
            returnDate: new Date(orderDate.getTime() + randomInt(1, 30) * 86400000),
            reason: randomElement(['Defective', 'Wrong size', 'Not as described', 'Changed mind', null]),
            refundAmount: randomDecimal(10, 200),
            quantityReturned: randomInt(1, 3),
          },
        });
      }

      allOrders.push(order);
      orderCount++;
    }
  }

  console.log(`   Created ${orderCount} orders`);

  console.log('🎯 Creating sales targets...');
  for (const region of regions) {
    for (let y = now.getFullYear() - 1; y <= now.getFullYear(); y++) {
      for (let m = 1; m <= 12; m++) {
        await prisma.salesTarget.create({
          data: {
            regionId: region.id,
            year: y,
            month: m,
            targetAmount: randomDecimal(50000, 200000),
          },
        });
      }
    }
  }

  console.log('📊 Creating churn scores...');
  for (const customer of customers) {
    const churnScore = randomDecimal(0, 1, 4);
    const riskLevel = churnScore > 0.7 ? 'high' : churnScore > 0.4 ? 'medium' : 'low';

    await prisma.customerChurnScore.create({
      data: {
        customerId: customer.id,
        churnScore,
        riskLevel,
        computedAt: new Date(),
        factors: JSON.stringify({
          recency: randomInt(1, 365),
          frequency: randomInt(1, 50),
          monetary: randomDecimal(50, 5000),
        }),
      },
    });
  }

  console.log('📖 Creating business glossary...');
  const glossaryEntries = [
    { term: 'Revenue', definition: 'Total income from sales of products and services.' },
    { term: 'Gross Profit', definition: 'Revenue minus cost of goods sold.' },
    { term: 'Net Revenue', definition: 'Revenue after discounts, returns, and refunds.' },
    { term: 'Active Customer', definition: 'A customer with at least one completed order in the selected period.' },
    { term: 'Churn', definition: 'A customer who has not placed an order in a defined period. Churn risk is predictive, not a confirmed event.' },
    { term: 'Return Rate', definition: 'Returned quantity divided by sold quantity.' },
    { term: 'Average Order Value', definition: 'Total revenue divided by number of completed orders.' },
    { term: 'Completed Order', definition: 'An order with status = completed. Excludes cancelled, pending, and returned orders.' },
    { term: 'Data Freshness', definition: 'How recently the data was loaded into the system. Measured by data_loaded_at timestamp.' },
    { term: 'Region', definition: 'Geographic business area: North, South, East, or West.' },
    { term: 'Profit Margin', definition: 'Gross profit divided by revenue, expressed as a percentage.' },
    { term: 'KPI', definition: 'Key Performance Indicator — a measurable value that demonstrates business effectiveness.' },
  ];

  for (const entry of glossaryEntries) {
    await prisma.businessGlossary.create({
      data: { ...entry, category: 'Business', owner: 'Data Team', status: 'approved' },
    });
  }

  console.log('📐 Creating metric definitions...');
  const metricDefs = [
    {
      name: 'Completed-Order Revenue',
      slug: 'completed-order-revenue',
      definition: 'Sum of quantity multiplied by unit price for completed orders only.',
      formula: "SUM(order_items.quantity * order_items.unit_price) WHERE orders.status = 'completed'",
      sourceTables: JSON.stringify(['orders', 'order_items']),
      sourceColumns: JSON.stringify(['order_items.quantity', 'order_items.unit_price', 'orders.status']),
      filters: JSON.stringify({ status: 'completed' }),
      grain: 'order-level',
      owner: 'Finance Team',
      synonyms: ['sales', 'revenue', 'completed sales', 'order revenue'],
      dimensions: [
        { dimension: 'month', columnRef: 'orders.order_date' },
        { dimension: 'region', columnRef: 'regions.name' },
        { dimension: 'product_category', columnRef: 'product_categories.name' },
      ],
    },
    {
      name: 'Gross Revenue',
      slug: 'gross-revenue',
      definition: 'Revenue before discounts, returns, refunds, and adjustments.',
      formula: 'SUM(order_items.quantity * order_items.unit_price) -- all orders',
      sourceTables: JSON.stringify(['orders', 'order_items']),
      sourceColumns: JSON.stringify(['order_items.quantity', 'order_items.unit_price']),
      grain: 'order-level',
      owner: 'Finance Team',
      synonyms: ['gross sales', 'total sales', 'gross income'],
      dimensions: [
        { dimension: 'month', columnRef: 'orders.order_date' },
        { dimension: 'region', columnRef: 'regions.name' },
      ],
    },
    {
      name: 'Net Revenue',
      slug: 'net-revenue',
      definition: 'Revenue after discounts, returns, and refunds.',
      formula: 'SUM(order_items.quantity * order_items.unit_price) - SUM(orders.discount) - SUM(returns.refund_amount)',
      sourceTables: JSON.stringify(['orders', 'order_items', 'returns']),
      sourceColumns: JSON.stringify(['order_items.quantity', 'order_items.unit_price', 'orders.discount', 'returns.refund_amount']),
      grain: 'order-level',
      owner: 'Finance Team',
      synonyms: ['net sales', 'adjusted revenue'],
      dimensions: [
        { dimension: 'month', columnRef: 'orders.order_date' },
        { dimension: 'region', columnRef: 'regions.name' },
      ],
    },
    {
      name: 'Gross Profit',
      slug: 'gross-profit',
      definition: 'Completed-order revenue minus cost of goods sold.',
      formula: "SUM(order_items.quantity * order_items.unit_price) - SUM(order_items.quantity * products.cost_price) WHERE orders.status = 'completed'",
      sourceTables: JSON.stringify(['orders', 'order_items', 'products']),
      sourceColumns: JSON.stringify(['order_items.quantity', 'order_items.unit_price', 'products.cost_price']),
      filters: JSON.stringify({ status: 'completed' }),
      grain: 'order-level',
      owner: 'Finance Team',
      synonyms: ['profit', 'margin'],
      dimensions: [
        { dimension: 'month', columnRef: 'orders.order_date' },
        { dimension: 'region', columnRef: 'regions.name' },
      ],
    },
    {
      name: 'Profit Margin',
      slug: 'profit-margin',
      definition: 'Gross profit divided by completed-order revenue.',
      formula: '(SUM(revenue) - SUM(cost)) / SUM(revenue) * 100',
      sourceTables: JSON.stringify(['orders', 'order_items', 'products']),
      sourceColumns: JSON.stringify(['order_items.quantity', 'order_items.unit_price', 'products.cost_price']),
      grain: 'aggregate',
      owner: 'Finance Team',
      synonyms: ['margin percentage', 'profit pct'],
      dimensions: [],
    },
    {
      name: 'Active Customer',
      slug: 'active-customer',
      definition: 'A customer with at least one completed order in the selected period.',
      formula: "COUNT(DISTINCT orders.customer_id) WHERE orders.status = 'completed'",
      sourceTables: JSON.stringify(['orders', 'customers']),
      sourceColumns: JSON.stringify(['orders.customer_id', 'orders.status']),
      grain: 'customer-level',
      owner: 'Marketing Team',
      synonyms: ['active customers', 'customer count'],
      dimensions: [
        { dimension: 'region', columnRef: 'regions.name' },
        { dimension: 'month', columnRef: 'orders.order_date' },
      ],
    },
    {
      name: 'Average Order Value',
      slug: 'average-order-value',
      definition: 'Completed-order revenue divided by number of completed orders.',
      formula: "SUM(revenue) / COUNT(DISTINCT orders.id) WHERE orders.status = 'completed'",
      sourceTables: JSON.stringify(['orders', 'order_items']),
      sourceColumns: JSON.stringify(['order_items.quantity', 'order_items.unit_price']),
      grain: 'aggregate',
      owner: 'Sales Team',
      synonyms: ['AOV', 'avg order', 'order average'],
      dimensions: [
        { dimension: 'product_category', columnRef: 'product_categories.name' },
        { dimension: 'region', columnRef: 'regions.name' },
      ],
    },
    {
      name: 'Return Rate',
      slug: 'return-rate',
      definition: 'Returned quantity divided by sold quantity.',
      formula: 'SUM(returns.quantity_returned) / SUM(order_items.quantity) * 100',
      sourceTables: JSON.stringify(['orders', 'order_items', 'returns']),
      sourceColumns: JSON.stringify(['returns.quantity_returned', 'order_items.quantity']),
      grain: 'aggregate',
      owner: 'Operations Team',
      synonyms: ['return percentage', 'refund rate'],
      dimensions: [
        { dimension: 'product_category', columnRef: 'product_categories.name' },
        { dimension: 'month', columnRef: 'orders.order_date' },
      ],
    },
    {
      name: 'Churn Risk',
      slug: 'churn-risk',
      definition: 'A predictive score indicating the likelihood of churn. Churn risk is not a confirmed churn event.',
      formula: 'customer_churn_scores.churn_score (0-1 scale)',
      sourceTables: JSON.stringify(['customers', 'customer_churn_scores']),
      sourceColumns: JSON.stringify(['customer_churn_scores.churn_score', 'customer_churn_scores.risk_level']),
      grain: 'customer-level',
      owner: 'Data Science Team',
      synonyms: ['churn', 'churn score', 'attrition risk'],
      dimensions: [
        { dimension: 'region', columnRef: 'regions.name' },
        { dimension: 'risk_level', columnRef: 'customer_churn_scores.risk_level' },
      ],
    },
    {
      name: 'Order Count',
      slug: 'order-count',
      definition: 'Number of completed orders in the selected period.',
      formula: "COUNT(DISTINCT orders.id) WHERE orders.status = 'completed'",
      sourceTables: JSON.stringify(['orders']),
      sourceColumns: JSON.stringify(['orders.id', 'orders.status']),
      grain: 'aggregate',
      owner: 'Sales Team',
      synonyms: ['number of orders', 'total orders', 'orders'],
      dimensions: [
        { dimension: 'month', columnRef: 'orders.order_date' },
        { dimension: 'region', columnRef: 'regions.name' },
      ],
    },
  ];

  for (const def of metricDefs) {
    const { synonyms, dimensions, ...metricData } = def;
    const metric = await prisma.metricDefinition.create({ data: metricData });

    for (const syn of synonyms) {
      await prisma.metricSynonym.create({ data: { metricId: metric.id, synonym: syn } });
    }
    for (const dim of dimensions) {
      await prisma.metricDimension.create({ data: { metricId: metric.id, ...dim } });
    }
  }

  console.log('🗄️ Creating schema metadata...');
  const tableSchemas = [
    { tableName: 'orders', description: 'Customer orders', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'order_id', dataType: 'varchar', description: 'Business order ID' },
      { columnName: 'customer_id', dataType: 'uuid', description: 'FK to customers' },
      { columnName: 'region_id', dataType: 'uuid', description: 'FK to regions' },
      { columnName: 'status', dataType: 'varchar', description: 'completed, pending, cancelled, returned' },
      { columnName: 'order_date', dataType: 'timestamp', description: 'Date of order' },
      { columnName: 'discount', dataType: 'decimal', description: 'Discount amount' },
      { columnName: 'data_loaded_at', dataType: 'timestamp', description: 'ETL load timestamp' },
    ]},
    { tableName: 'order_items', description: 'Line items per order', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'order_id', dataType: 'uuid', description: 'FK to orders' },
      { columnName: 'product_id', dataType: 'uuid', description: 'FK to products' },
      { columnName: 'quantity', dataType: 'integer', description: 'Quantity ordered' },
      { columnName: 'unit_price', dataType: 'decimal', description: 'Price per unit' },
    ]},
    { tableName: 'customers', description: 'Customer master data', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'customer_id', dataType: 'varchar', description: 'Business customer ID' },
      { columnName: 'first_name', dataType: 'varchar', description: 'First name', isPII: true },
      { columnName: 'last_name', dataType: 'varchar', description: 'Last name', isPII: true },
      { columnName: 'email', dataType: 'varchar', description: 'Email address', isPII: true },
      { columnName: 'phone', dataType: 'varchar', description: 'Phone number', isPII: true },
      { columnName: 'address', dataType: 'varchar', description: 'Street address', isPII: true },
      { columnName: 'region_id', dataType: 'uuid', description: 'FK to regions' },
      { columnName: 'segment', dataType: 'varchar', description: 'Customer segment' },
    ]},
    { tableName: 'products', description: 'Product catalog', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'product_id', dataType: 'varchar', description: 'Business product ID' },
      { columnName: 'name', dataType: 'varchar', description: 'Product name' },
      { columnName: 'category_id', dataType: 'uuid', description: 'FK to product_categories' },
      { columnName: 'unit_price', dataType: 'decimal', description: 'Price per unit' },
      { columnName: 'cost_price', dataType: 'decimal', description: 'Cost per unit' },
    ]},
    { tableName: 'product_categories', description: 'Product categories', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'name', dataType: 'varchar', description: 'Category name' },
      { columnName: 'slug', dataType: 'varchar', description: 'URL-safe slug' },
    ]},
    { tableName: 'regions', description: 'Business regions', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'name', dataType: 'varchar', description: 'Region name' },
      { columnName: 'code', dataType: 'varchar', description: 'Region code' },
    ]},
    { tableName: 'returns', description: 'Product returns', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'order_id', dataType: 'uuid', description: 'FK to orders' },
      { columnName: 'return_date', dataType: 'timestamp', description: 'Return date' },
      { columnName: 'reason', dataType: 'varchar', description: 'Return reason' },
      { columnName: 'refund_amount', dataType: 'decimal', description: 'Refund amount' },
      { columnName: 'quantity_returned', dataType: 'integer', description: 'Quantity returned' },
    ]},
    { tableName: 'sales_targets', description: 'Monthly sales targets', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'region_id', dataType: 'uuid', description: 'FK to regions' },
      { columnName: 'year', dataType: 'integer', description: 'Target year' },
      { columnName: 'month', dataType: 'integer', description: 'Target month' },
      { columnName: 'target_amount', dataType: 'decimal', description: 'Target amount' },
    ]},
    { tableName: 'customer_churn_scores', description: 'Customer churn predictions', columns: [
      { columnName: 'id', dataType: 'uuid', description: 'Primary key' },
      { columnName: 'customer_id', dataType: 'uuid', description: 'FK to customers' },
      { columnName: 'churn_score', dataType: 'decimal', description: 'Churn probability 0-1' },
      { columnName: 'risk_level', dataType: 'varchar', description: 'high, medium, low' },
      { columnName: 'computed_at', dataType: 'timestamp', description: 'Score computation date' },
    ]},
  ];

  for (const table of tableSchemas) {
    const schemaTable = await prisma.schemaTable.create({
      data: { tableName: table.tableName, description: table.description },
    });
    for (const col of table.columns) {
      await prisma.schemaColumn.create({
        data: {
          tableId: schemaTable.id,
          columnName: col.columnName,
          dataType: col.dataType,
          description: col.description,
          isPII: (col as Record<string, unknown>).isPII === true,
        },
      });
    }
  }

  console.log('🔗 Creating approved join paths...');
  const joinPaths = [
    {
      name: 'orders-order_items',
      tables: JSON.stringify(['orders', 'order_items']),
      joinClause: 'JOIN order_items ON orders.id = order_items.order_id',
      description: 'Orders to order items',
    },
    {
      name: 'orders-customers',
      tables: JSON.stringify(['orders', 'customers']),
      joinClause: 'JOIN customers ON orders.customer_id = customers.id',
      description: 'Orders to customers',
    },
    {
      name: 'orders-regions',
      tables: JSON.stringify(['orders', 'regions']),
      joinClause: 'JOIN regions ON orders.region_id = regions.id',
      description: 'Orders to regions',
    },
    {
      name: 'order_items-products',
      tables: JSON.stringify(['order_items', 'products']),
      joinClause: 'JOIN products ON order_items.product_id = products.id',
      description: 'Order items to products',
    },
    {
      name: 'products-categories',
      tables: JSON.stringify(['products', 'product_categories']),
      joinClause: 'JOIN product_categories ON products.category_id = product_categories.id',
      description: 'Products to categories',
    },
    {
      name: 'orders-returns',
      tables: JSON.stringify(['orders', 'returns']),
      joinClause: 'LEFT JOIN returns ON orders.id = returns.order_id',
      description: 'Orders to returns',
    },
    {
      name: 'customers-churn-scores',
      tables: JSON.stringify(['customers', 'customer_churn_scores']),
      joinClause: 'JOIN customer_churn_scores ON customers.id = customer_churn_scores.customer_id',
      description: 'Customers to churn scores',
    },
    {
      name: 'customers-regions',
      tables: JSON.stringify(['customers', 'regions']),
      joinClause: 'JOIN regions ON customers.region_id = regions.id',
      description: 'Customers to regions',
    },
  ];

  for (const jp of joinPaths) {
    await prisma.approvedJoinPath.create({ data: jp });
  }

  console.log('📝 Creating approved query examples...');
  const queryExamples = [
    {
      question: 'What was completed-order revenue by month in 2025?',
      metricUsed: 'Completed-Order Revenue',
      sql: `SELECT DATE_TRUNC('month', o.order_date) as month, SUM(oi.quantity * oi.unit_price) as revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' AND o.order_date >= '2025-01-01' AND o.order_date < '2026-01-01' GROUP BY DATE_TRUNC('month', o.order_date) ORDER BY month`,
      explanation: 'Monthly revenue for completed orders in 2025',
      tags: JSON.stringify(['revenue', 'monthly', 'trend']),
    },
    {
      question: 'Compare gross profit across regions for the last quarter',
      metricUsed: 'Gross Profit',
      sql: `SELECT r.name as region, SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cost_price) as gross_profit FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN regions r ON o.region_id = r.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed' AND o.order_date >= DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '3 months') GROUP BY r.name ORDER BY gross_profit DESC`,
      explanation: 'Gross profit by region for last quarter',
      tags: JSON.stringify(['profit', 'region', 'comparison']),
    },
    {
      question: 'Which product categories had the highest return rate?',
      metricUsed: 'Return Rate',
      sql: `SELECT pc.name as category, ROUND(CAST(SUM(ret.quantity_returned) AS DECIMAL) / NULLIF(SUM(oi.quantity), 0) * 100, 2) as return_rate FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id JOIN product_categories pc ON p.category_id = pc.id LEFT JOIN returns ret ON o.id = ret.order_id WHERE o.status = 'completed' GROUP BY pc.name ORDER BY return_rate DESC`,
      explanation: 'Return rate by product category',
      tags: JSON.stringify(['returns', 'category']),
    },
    {
      question: 'What is the average order value by category?',
      metricUsed: 'Average Order Value',
      sql: `SELECT pc.name as category, ROUND(AVG(oi.quantity * oi.unit_price), 2) as avg_order_value FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id JOIN product_categories pc ON p.category_id = pc.id WHERE o.status = 'completed' GROUP BY pc.name ORDER BY avg_order_value DESC`,
      explanation: 'Average order value by category',
      tags: JSON.stringify(['aov', 'category']),
    },
  ];

  for (const qe of queryExamples) {
    await prisma.approvedQueryExample.create({ data: qe });
  }

  console.log('⚙️ Creating app settings...');
  await prisma.appSetting.create({ data: { key: 'data_version', value: '1', description: 'Current data version' } });
  await prisma.appSetting.create({ data: { key: 'ai_provider', value: 'mock', description: 'AI provider' } });

  console.log('✅ Database seeded successfully!');
  console.log(`   - ${customers.length} customers`);
  console.log(`   - ${orderCount} orders`);
  console.log(`   - ${products.length} products in ${categories.length} categories`);
  console.log(`   - ${regions.length} regions`);
  console.log(`   - ${metricDefs.length} metric definitions`);
  console.log(`   - ${glossaryEntries.length} glossary entries`);
  console.log(`   - ${joinPaths.length} approved join paths`);
  console.log(`   - ${queryExamples.length} approved query examples`);
  console.log('');
  console.log('Demo credentials:');
  console.log('  Analyst:       analyst@realonesbi.demo / Demo123!');
  console.log('  Business User: business@realonesbi.demo / Demo123!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

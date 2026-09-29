const { Parser } = require('node-sql-parser');
const parser = new Parser();
const sql = `
      SELECT r.name as region, SUM(oi.quantity * oi.unit_price) as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN regions r ON o.region_id = r.id
      WHERE o.status = 'COMPLETED'
      GROUP BY r.name
      ORDER BY revenue DESC
`;
const list = parser.tableList(sql, { database: 'postgresql' });
console.log(list);

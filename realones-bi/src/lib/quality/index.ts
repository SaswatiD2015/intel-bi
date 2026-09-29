// ============================================================================
// RealOnes BI - Data Quality Engine
// ============================================================================

import prisma from '@/lib/db';
import type { DataQualityCheck, DataQualitySummary, DataVibeStatus } from '@/lib/types';

// Run data quality checks relevant to a query result
export async function runDataQualityChecks(
  tablesUsed: string[],
  timeRange?: string
): Promise<DataQualitySummary> {
  const checks: DataQualityCheck[] = [];

  for (const table of tablesUsed) {
    switch (table.toLowerCase()) {
      case 'orders':
        checks.push(...await checkOrdersQuality());
        break;
      case 'order_items':
        checks.push(...await checkOrderItemsQuality());
        break;
      case 'customers':
        checks.push(...await checkCustomersQuality());
        break;
      case 'products':
        checks.push(...await checkProductsQuality());
        break;
      case 'returns':
        checks.push(...await checkReturnsQuality());
        break;
    }
  }

  // Data freshness check
  checks.push(await checkDataFreshness());

  // Determine overall status
  const overallStatus = determineOverallStatus(checks);
  const message = getStatusMessage(overallStatus);

  // Store quality run results
  for (const check of checks) {
    await prisma.dataQualityRun.create({
      data: {
        tableName: check.tableName,
        checkType: check.checkType,
        checkName: check.checkName,
        status: check.status,
        details: check.details,
        value: check.value ? check.value : undefined,
        threshold: check.threshold ? check.threshold : undefined,
      },
    }).catch(() => { /* Best effort logging */ });
  }

  return { overallStatus, checks, message };
}

async function checkOrdersQuality(): Promise<DataQualityCheck[]> {
  const checks: DataQualityCheck[] = [];

  try {
    // Null rate in critical fields
    const totalOrders = await prisma.order.count();
    const nullDates = await prisma.order.count({ where: { orderDate: undefined } });
    const nullRate = totalOrders > 0 ? nullDates / totalOrders : 0;

    checks.push({
      checkName: 'Order Date Null Rate',
      checkType: 'null_rate',
      tableName: 'orders',
      status: nullRate > 0.05 ? 'high_risk' : nullRate > 0.01 ? 'needs_attention' : 'good',
      details: `${(nullRate * 100).toFixed(1)}% of orders have null order dates`,
      value: nullRate,
      threshold: 0.05,
    });

    // Invalid status values
    const validStatuses = ['completed', 'pending', 'cancelled', 'returned'];
    const invalidStatusCount = await prisma.order.count({
      where: { status: { notIn: validStatuses } },
    });

    checks.push({
      checkName: 'Invalid Order Status',
      checkType: 'invalid_values',
      tableName: 'orders',
      status: invalidStatusCount > 0 ? 'needs_attention' : 'good',
      details: `${invalidStatusCount} orders have invalid status values`,
      value: invalidStatusCount,
      threshold: 0,
    });

    // Duplicate detection (by order_id)
    const duplicates: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM (
        SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1
      ) dups
    `;
    const dupCount = Number(duplicates[0]?.cnt || 0);

    checks.push({
      checkName: 'Duplicate Order IDs',
      checkType: 'duplicates',
      tableName: 'orders',
      status: dupCount > 0 ? 'high_risk' : 'good',
      details: `${dupCount} duplicate order IDs detected`,
      value: dupCount,
      threshold: 0,
    });

    // Outlier detection for recent orders
    const outlierResult: { outlier_count: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as outlier_count FROM order_items 
      WHERE unit_price * quantity > (
        SELECT AVG(unit_price * quantity) + 3 * STDDEV(unit_price * quantity) 
        FROM order_items
      )
    `;
    const outlierCount = Number(outlierResult[0]?.outlier_count || 0);

    checks.push({
      checkName: 'Order Value Outliers',
      checkType: 'outliers',
      tableName: 'orders',
      status: outlierCount > 10 ? 'needs_attention' : 'good',
      details: `${outlierCount} order items with values > 3 standard deviations from mean`,
      value: outlierCount,
      threshold: 10,
    });

    // Negative values
    const negativeValues: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM order_items WHERE unit_price < 0 OR quantity < 0
    `;
    const negCount = Number(negativeValues[0]?.cnt || 0);

    checks.push({
      checkName: 'Negative Order Values',
      checkType: 'invalid_values',
      tableName: 'order_items',
      status: negCount > 0 ? 'high_risk' : 'good',
      details: `${negCount} order items with negative price or quantity`,
      value: negCount,
      threshold: 0,
    });

  } catch (error) {
    checks.push({
      checkName: 'Orders Quality Check Error',
      checkType: 'error',
      tableName: 'orders',
      status: 'needs_attention',
      details: `Error running orders quality checks: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }

  return checks;
}

async function checkOrderItemsQuality(): Promise<DataQualityCheck[]> {
  const checks: DataQualityCheck[] = [];

  try {
    // Check for orphaned order items
    const orphanedItems: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM order_items oi 
      LEFT JOIN orders o ON oi.order_id = o.id 
      WHERE o.id IS NULL
    `;
    const orphanCount = Number(orphanedItems[0]?.cnt || 0);

    checks.push({
      checkName: 'Orphaned Order Items',
      checkType: 'referential_integrity',
      tableName: 'order_items',
      status: orphanCount > 0 ? 'high_risk' : 'good',
      details: `${orphanCount} order items with no matching order`,
      value: orphanCount,
      threshold: 0,
    });
  } catch (error) {
    checks.push({
      checkName: 'Order Items Quality Check Error',
      checkType: 'error',
      tableName: 'order_items',
      status: 'needs_attention',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }

  return checks;
}

async function checkCustomersQuality(): Promise<DataQualityCheck[]> {
  const checks: DataQualityCheck[] = [];

  try {
    const totalCustomers = await prisma.customer.count();
    const nullSegment = await prisma.customer.count({ where: { segment: null } });
    const nullRate = totalCustomers > 0 ? nullSegment / totalCustomers : 0;

    checks.push({
      checkName: 'Customer Segment Null Rate',
      checkType: 'null_rate',
      tableName: 'customers',
      status: nullRate > 0.1 ? 'needs_attention' : 'good',
      details: `${(nullRate * 100).toFixed(1)}% of customers have null segment`,
      value: nullRate,
      threshold: 0.1,
    });
  } catch (error) {
    checks.push({
      checkName: 'Customer Quality Check Error',
      checkType: 'error',
      tableName: 'customers',
      status: 'needs_attention',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }

  return checks;
}

async function checkProductsQuality(): Promise<DataQualityCheck[]> {
  const checks: DataQualityCheck[] = [];

  try {
    const nullCategory: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM products WHERE category_id IS NULL
    `;
    const nullCount = Number(nullCategory[0]?.cnt || 0);

    checks.push({
      checkName: 'Products Missing Category',
      checkType: 'null_rate',
      tableName: 'products',
      status: nullCount > 0 ? 'needs_attention' : 'good',
      details: `${nullCount} products with missing category`,
      value: nullCount,
      threshold: 0,
    });
  } catch (error) {
    checks.push({
      checkName: 'Products Quality Check Error',
      checkType: 'error',
      tableName: 'products',
      status: 'needs_attention',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }

  return checks;
}

async function checkReturnsQuality(): Promise<DataQualityCheck[]> {
  const checks: DataQualityCheck[] = [];

  try {
    // Check for returns with no matching order
    const orphanReturns: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM returns r 
      LEFT JOIN orders o ON r.order_id = o.id 
      WHERE o.id IS NULL
    `;
    const orphanCount = Number(orphanReturns[0]?.cnt || 0);

    checks.push({
      checkName: 'Orphaned Returns',
      checkType: 'referential_integrity',
      tableName: 'returns',
      status: orphanCount > 0 ? 'high_risk' : 'good',
      details: `${orphanCount} returns with no matching order`,
      value: orphanCount,
      threshold: 0,
    });

    // Check for negative refund amounts
    const negRefunds: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM returns WHERE refund_amount < 0
    `;
    const negCount = Number(negRefunds[0]?.cnt || 0);

    checks.push({
      checkName: 'Negative Refund Amounts',
      checkType: 'invalid_values',
      tableName: 'returns',
      status: negCount > 0 ? 'needs_attention' : 'good',
      details: `${negCount} returns with negative refund amounts`,
      value: negCount,
      threshold: 0,
    });
  } catch (error) {
    checks.push({
      checkName: 'Returns Quality Check Error',
      checkType: 'error',
      tableName: 'returns',
      status: 'needs_attention',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }

  return checks;
}

async function checkDataFreshness(): Promise<DataQualityCheck> {
  try {
    const latest: { max_loaded: Date | null }[] = await prisma.$queryRaw`
      SELECT MAX(data_loaded_at) as max_loaded FROM orders WHERE data_loaded_at IS NOT NULL
    `;
    const latestDate = latest[0]?.max_loaded;

    if (!latestDate) {
      return {
        checkName: 'Data Freshness',
        checkType: 'freshness',
        tableName: 'orders',
        status: 'needs_attention',
        details: 'No data_loaded_at timestamps found',
      };
    }

    const hoursAgo = (Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60);

    return {
      checkName: 'Data Freshness',
      checkType: 'freshness',
      tableName: 'orders',
      status: hoursAgo > 48 ? 'high_risk' : hoursAgo > 24 ? 'needs_attention' : 'good',
      details: `Latest data loaded ${hoursAgo.toFixed(0)} hours ago (${new Date(latestDate).toISOString()})`,
      value: hoursAgo,
      threshold: 24,
    };
  } catch {
    return {
      checkName: 'Data Freshness',
      checkType: 'freshness',
      tableName: 'orders',
      status: 'needs_attention',
      details: 'Could not determine data freshness',
    };
  }
}

function determineOverallStatus(checks: DataQualityCheck[]): DataVibeStatus {
  if (checks.some(c => c.status === 'high_risk')) return 'high_risk';
  if (checks.some(c => c.status === 'needs_attention')) return 'needs_attention';
  return 'good';
}

function getStatusMessage(status: DataVibeStatus): string {
  switch (status) {
    case 'good':
      return 'Data Vibe Status: Good — no material data-quality issue was detected for this analysis.';
    case 'needs_attention':
      return 'Data Vibe Status: Needs Attention — some data-quality issues may affect this comparison. Review the details before acting.';
    case 'high_risk':
      return 'Data Vibe Status: High Risk — significant data-quality issues were detected. This result should not be used as a standalone basis for a business decision.';
  }
}

export function getDataFreshnessTimestamp(checks: DataQualityCheck[]): string {
  const freshness = checks.find(c => c.checkType === 'freshness');
  return freshness?.details || 'Unknown';
}

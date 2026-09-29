// ============================================================================
// RealOnes BI - Audit Logger
// ============================================================================

import prisma from '@/lib/db';

export type AuditCategory = 'auth' | 'query' | 'feedback' | 'decision' | 'governance' | 'error';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  category: AuditCategory;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<string> {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        category: entry.category,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress,
      },
    });
    return log.id;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return '';
  }
}

export async function getAuditLogs(
  filters?: {
    userId?: string;
    category?: AuditCategory;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  offset: number = 0
) {
  const where: Record<string, unknown> = {};

  if (filters?.userId) where.userId = filters.userId;
  if (filters?.category) where.category = filters.category;
  if (filters?.action) where.action = filters.action;
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
    if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

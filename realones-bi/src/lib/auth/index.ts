// ============================================================================
// RealOnes BI - Authentication Configuration
// ============================================================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple hash comparison for demo (in production, use bcrypt)
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // For demo, we store passwords as simple hashes
  // In production, use bcrypt.compare
  const { createHash } = await import('crypto');
  const hashed = createHash('sha256').update(plain).digest('hex');
  return hashed === hash;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              userRoles: { include: { role: true } },
              regionAccess: { include: { region: true } },
            },
          });

          if (!user) return null;

          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.userRoles.map(ur => ur.role.name),
            regions: user.regionAccess.map(ra => ({
              id: ra.region.id,
              name: ra.region.name,
              code: ra.region.code,
            })),
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as Record<string, unknown>).roles;
        token.regions = (user as Record<string, unknown>).regions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const userRecord = session.user as unknown as Record<string, unknown>;
        userRecord.roles = token.roles;
        userRecord.regions = token.regions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});

// ============================================================================
// RealOnes BI - Authentication Configuration
// ============================================================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';

// Simple hash comparison removed, using Fastify backend

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

        try {
          const res = await fetch('http://localhost:4000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            return null;
          }

          // Return user and the fastify token
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            roles: data.user.roles,
            backendToken: data.token,
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
        token.backendToken = (user as Record<string, unknown>).backendToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const userRecord = session.user as unknown as Record<string, unknown>;
        userRecord.roles = token.roles;
        userRecord.backendToken = token.backendToken;
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

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.events',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    CredentialsProvider({
      name: 'PIN',
      credentials: {
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (credentials?.pin === '132103') {
          return { id: 'team-pin', name: 'Team Member', email: 'team@bistro.local' };
        }
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || 'thought-bistro-lead-machine-secure-key',
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        if (account.provider === 'google') {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token; 
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      (session as any).provider = token.provider;
      if (token.provider === 'google') {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};

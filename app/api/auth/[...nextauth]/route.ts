import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

// Ensure NEXTAUTH_URL is set even if .env.local is missing it
if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'development') {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            // .trim() handles potential corruption in .env.local formatting
            clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
            clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
        }),
        CredentialsProvider({
            name: "Admin Bypass",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (credentials?.username === "admin" && credentials?.password === "admin") {
                    return {
                        id: "admin",
                        name: "System Administrator",
                        email: "admin@okaxis.internal",
                        image: null,
                    };
                }
                return null;
            }
        }),
    ],
    // Explicit secret required for App Router stability in dev
    secret: (process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_dev").trim(),
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                (session.user as any).id = token.sub;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

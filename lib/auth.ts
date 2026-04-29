import { NextAuthOptions } from "next-auth";
import ZitadelProvider from "next-auth/providers/zitadel";

export const authOptions: NextAuthOptions = {
    providers: [
        ZitadelProvider({
            issuer: process.env.ZITADEL_ISSUER as string,
            clientId: process.env.ZITADEL_CLIENT_ID as string,
            clientSecret: process.env.ZITADEL_CLIENT_SECRET as string,
            authorization: { params: { scope: "openid email profile offline_access" } },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (account && user) {
                token.accessToken = account.access_token;
                token.idToken = account.id_token;
                token.user = user;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.user = token.user;
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};

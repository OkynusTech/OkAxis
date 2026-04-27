export { default as middleware } from "next-auth/middleware";

export const config = {
    matcher: [
        '/',
        '/dashboard/:path*',
        '/engagement/:path*',
        '/templates/:path*',
        '/settings/:path*',
        '/reports/:path*',
        '/analytics/:path*',
        '/clients/:path*',
        '/applications/:path*',
        '/engineers/:path*',
        '/artifacts/:path*',
        '/components/:path*',
        '/retests/:path*',
        '/seed/:path*',
    ],
};

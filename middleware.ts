
import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            // If there is a token, the user is authenticated
            return !!token;
        },
    },
    pages: {
        signIn: '/login',
    },
})

export const config = {
    matcher: [
        "/",
        "/dashboard/:path*",
        "/engagement/:path*",
        "/templates/:path*",
        "/settings/:path*",
        "/reports/:path*",
        "/analytics/:path*",
        "/clients/:path*",
        "/applications/:path*",
        "/engineers/:path*",
        "/artifacts/:path*",
        "/components/:path*",
        "/retests/:path*",
    ]
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session — required to keep cookies up to date
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && request.cookies.get('debug_auth')?.value === 'true') {
            return supabaseResponse;
        }
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

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

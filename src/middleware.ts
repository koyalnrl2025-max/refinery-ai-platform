import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // For API routes: also accept a Bearer token from the Authorization header
  // (used by CLI tools, test scripts, and curl — not just browser sessions)
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization') ?? '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (bearerToken) {
      // Validate the token — let the route handler verify via its own client
      // Just forward the request; the route will call supabase.auth.getUser() itself
      return NextResponse.next({ request });
    }
  }

  const { data: { user } } = await supabase.auth.getUser();

  const publicPaths = ['/login', '/auth/callback', '/api/auth'];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  if (!user && !isPublic) {
    // Return 401 for API routes; redirect browser routes to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

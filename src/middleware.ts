import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect API routes (except auth endpoints)
  if (
    pathname.startsWith('/api/projects') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/collab')
  ) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/projects/:path*', '/api/upload/:path*', '/api/collab/:path*'],
};

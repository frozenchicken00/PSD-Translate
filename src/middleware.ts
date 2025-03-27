import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { edgeAuth } from './auth.edge'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Authentication check using edge-compatible auth
  const auth = await edgeAuth()
  
  // Example of how to use auth information in middleware
  // You can protect routes or redirect based on auth state
  
  // Example: if path starts with /protected and user is not authenticated, redirect to login
  if (request.nextUrl.pathname.startsWith('/protected') && !auth) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  
  return NextResponse.next()
}

// Optional: Configure which paths should trigger this middleware
export const config = {
  matcher: [
    // Add paths that should trigger middleware
    '/protected/:path*',
    '/api/protected/:path*',
  ],
}
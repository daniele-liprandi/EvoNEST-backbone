import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If user is authenticated, allow the request
    if (req.nextauth.token) {
      return NextResponse.next();
    }
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Implement any custom authorization logic here
        // For now, just check if we have a token
        return !!token;
      },
    },
  }
);

// Specify which routes should be protected
export const config = {
  matcher: [
    // Protect all routes except auth-related ones, the root page, public directory, SVG files, and notifications API
    '/((?!auth|api/auth|api/notifications|_next/static|_next/image|favicon.ico|.*\\.svg|$|public/).*)',
  ],
};
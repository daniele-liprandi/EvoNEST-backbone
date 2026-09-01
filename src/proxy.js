import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Authentication only: every matched route requires a signed-in user.
// Authorization (roles, capabilities) is enforced per route handler via
// userCan(), since middleware can't reach the DB-backed permission config.
export default withAuth(
  function proxy(req) {
    if (req.nextauth.token) {
      return NextResponse.next();
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Specify which routes should be protected
export const config = {
  matcher: [
    // Protect all routes except auth-related ones, the root page, the design
    // gallery, public directory, SVG files, and notifications API
    '/((?!auth|design|api/auth|api/health|api/notifications|api/nlfilter|api/schema|api/geocoding|api/checknames|api/samples/ext|api/traits/ext|api/experiments/ext|_next/static|_next/image|favicon.ico|.*\.svg|$|public/).*)',
  ],
};
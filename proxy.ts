// =============================================================================
// proxy.ts — Next.js Middleware (runs on the Edge before every request)
// =============================================================================
// This file acts as the route-protection middleware.
//
// How it works:
//   1. Next.js executes this file on every request that matches `config.matcher`.
//   2. NextAuth(authConfig).auth is the middleware function that:
//      a. Reads the session cookie from the incoming request.
//      b. Calls authConfig.callbacks.authorized() with the session + URL.
//      c. Allows or redirects the request based on the return value.
//
// Why authConfig and not the full auth.ts?
//   Middleware runs on the Edge runtime which does not support Node.js APIs.
//   authConfig is Edge-safe (no bcrypt, no postgres). auth.ts is NOT Edge-safe.
// =============================================================================

import NextAuth from "next-auth";
import { authConfig } from "./auth.config"; // Edge-safe config only

// Export the NextAuth middleware as the default export.
// Next.js automatically uses the default export from middleware.ts / proxy.ts as middleware.
export default NextAuth(authConfig).auth;

export const config = {
  // matcher tells Next.js which routes to run this middleware on.
  // This pattern matches every route EXCEPT:
  //   - /api/*           (API routes handle their own auth)
  //   - /_next/static/*  (static assets)
  //   - /_next/image/*   (image optimisation)
  //   - *.png files      (public images)
  // https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
  matcher: ["/((?!api|_next/static|_next/image|.*\.png$).*)"],
};

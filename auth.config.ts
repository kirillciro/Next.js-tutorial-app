// =============================================================================
// auth.config.ts — Shared NextAuth configuration (safe for Edge runtime)
// =============================================================================
// This file is intentionally kept Edge-compatible (no Node.js-only imports).
// It is used in TWO places:
//   1. proxy.ts (middleware) — to protect routes on every incoming request
//   2. auth.ts              — spread into the full NextAuth config
//
// Separating it from auth.ts avoids importing bcrypt/postgres in the middleware
// bundle, which would break Edge runtime compatibility.
// =============================================================================

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    // Tell NextAuth to use our custom /login page instead of its built-in one.
    signIn: "/login",
  },
  callbacks: {
    // authorized() runs on every request matched by the middleware matcher.
    // It decides whether the request is allowed to proceed.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user; // true if a valid session exists
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        // Dashboard routes require authentication.
        // If logged in → allow. If not → middleware redirects to /login.
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // If a logged-in user visits a public page (e.g. /login),
        // redirect them straight to the dashboard.
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // All other public pages are accessible without authentication.
      return true;
    },
  },
  // Providers are defined here as an empty array because this config is also
  // used in the middleware (Edge). The real Credentials provider lives in auth.ts.
  providers: [],
} satisfies NextAuthConfig;

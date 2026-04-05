// =============================================================================
// auth.ts — Core authentication logic (server-side only)
// =============================================================================
// This file is the heart of NextAuth for this app.
// It configures:
//   1. The Credentials provider (email + password login)
//   2. The authorize() callback — called every time a user tries to sign in
//   3. Exports { auth, signIn, signOut } used throughout the app
//
// Flow:
//   login-form.tsx -> authenticate() action -> signIn("credentials") here
//   -> authorize() validates input, queries DB, compares password
//   -> returns User on success, null on failure
// =============================================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config"; // Route protection rules + custom login page
import { z } from "zod";
import type { User } from "@/app/lib/definitions";
import bcrypt from "bcrypt";
import postgres from "postgres";

// Resolve DB connection string with a fallback chain to cover all Neon env var names.
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No Postgres connection string found for auth.");
}

const sql = postgres(connectionString, { ssl: "require" });

// Fetch a single user by email from the database.
// Returns undefined if no matching row is found.
async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0];
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

// Export auth helpers used across the app:
//   auth     — reads the current session (Server Components, middleware)
//   signIn   — programmatically triggers sign-in (used in actions.ts)
//   signOut  — programmatically signs the user out
export const { auth, signIn, signOut } = NextAuth({
  // Spread shared config: custom pages, authorized() callback, empty providers list
  ...authConfig,
  providers: [
    // Credentials provider: handles email + password login.
    // NextAuth calls authorize() with the raw form data when signIn("credentials") is called.
    Credentials({
      async authorize(credentials) {
        // Step 1: Validate the shape and types of the submitted credentials using Zod.
        // safeParse returns { success, data } or { success: false, error }.
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        // If email/password format is invalid, reject immediately (no DB call).
        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        // Step 2: Look up the user in the database by email.
        const user = await getUser(email);

        // If no user found with that email, reject.
        if (!user) {
          return null;
        }

        // Step 3: Compare the submitted plain-text password against the stored bcrypt hash.
        // bcrypt.compare() is timing-safe and returns true only on a full match.
        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (passwordsMatch) {
          // Return the user object — NextAuth uses this to build the JWT/session.
          return user;
        }

        // Password did not match — reject login.
        return null;
      },
    }),
  ],
});

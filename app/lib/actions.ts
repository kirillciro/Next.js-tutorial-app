"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
// signIn / AuthError come from our own auth.ts which re-exports them from NextAuth.
// signIn("credentials", formData) triggers the authorize() callback in auth.ts.
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const sql = postgres(process.env.DATABASE_POSTGRES_URL!, { ssl: "require" });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string().min(1, { message: "Please select a customer." }),
  amount: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === "string") {
        return Number(value);
      }

      return value;
    },
    z
      .number({
        required_error: "Please enter an amount.",
        invalid_type_error: "Please enter a valid amount.",
      })
      .gt(0, { message: "Amount must be greater than 0." }),
  ),
  status: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      return value;
    },
    z.enum(["pending", "paid"], {
      required_error: "Please choose Pending or Paid.",
      invalid_type_error: "Please choose Pending or Paid.",
    }),
  ),
  date: z.string(),
});

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  values?: {
    customerId?: string;
    amount?: string;
    status?: string;
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  const formValues = {
    customerId: String(formData.get("customerId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    status: String(formData.get("status") ?? ""),
  };

  const validatedFields = CreateInvoice.safeParse({
    customerId: formValues.customerId,
    amount: formValues.amount,
    status: formValues.status,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      values: formValues,
      message: "Please correct the errors below and resubmit the form.",
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];
  //test console log to verify form data is being received correctly
  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create a new invoice.");
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");

  console.log("Received form data:", {
    customerId,
    amount,
    status,
    amountInCents,
    date,
  });
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update the invoice.");
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to delete the invoice.");
  }
  revalidatePath("/dashboard/invoices");
}

// =============================================================================
// authenticate — Server Action called by the login form
// =============================================================================
// Flow:
//   1. login-form.tsx submits the form → useActionState calls this action.
//   2. This action calls signIn("credentials", formData).
//      NextAuth forwards the credentials to authorize() in auth.ts.
//   3. If authorize() returns a User → NextAuth creates a signed session cookie
//      and redirects the browser. The redirect is thrown as an error internally
//      by NextAuth, so we re-throw it (the last `throw error` below).
//   4. If authorize() returns null → NextAuth throws an AuthError.
//      We catch it here and return a human-readable string back to the form.
// =============================================================================
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    // Pass the raw FormData to NextAuth. It will call authorize() with
    // the email and password fields from the form.
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      // AuthError.type tells us why the sign-in failed.
      switch (error.type) {
        case "CredentialsSignin":
          // authorize() returned null — wrong email or password.
          return "Invalid credentials.";
        default:
          // Any other NextAuth error (e.g. provider misconfiguration).
          return "Something went wrong.";
      }
    }
    // NextAuth throws a redirect "error" on successful login to send the
    // browser to the dashboard. We must re-throw it so the redirect works.
    throw error;
  }
}

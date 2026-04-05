import AcmeLogo from "@/app/ui/acme-logo";
import { lusitana } from "./ui/fonts";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { createComment } from "@/app/lib/comments";
import LoginForm from "@/app/ui/login-form";
import { Suspense } from "react";

// Step 1: Comments DB logic is centralized in app/lib/comments.ts.

export default async function Page() {
  // Step 2: Server Action runs on form submit to insert a new comment.
  async function create(formData: FormData) {
    "use server";
    // Step 3: Read and validate input from the form.
    const rawComment = formData.get("comment");
    const comment = typeof rawComment === "string" ? rawComment.trim() : "";

    if (!comment) {
      return;
    }

    try {
      // Step 4: Insert the new comment via the shared DB helper.
      await createComment(comment);

      // Step 5: Revalidate home page so new comment appears immediately.
      revalidatePath("/");
    } catch (err) {
      console.error("DB Error:", err);
    }
  }

  // Step 6: Fetch comments from DB (newest first) for server-side rendering.

  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="flex h-20 shrink-0 items-end rounded-lg bg-blue-500 p-4 md:h-52">
        <AcmeLogo />
      </div>

      <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
        {/* LEFT SIDE */}
        <div className="flex flex-col justify-start gap-6 rounded-lg bg-gray-50 px-6 py-10 md:w-2/5 md:px-20">
          <p
            className={`${lusitana.className} text-xl text-gray-800 md:text-3xl`}
          >
            <strong>Welcome to Acme.</strong>
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        {/* RIGHT SIDE */}
        <div className="grid gap-6 md:w-3/5">
          <aside className="flex flex-col justify-between rounded-xl bg-gray-50 p-6 shadow-sm">
            <div className="flex flex-1 items-center justify-center">
              <Image
                src="/hero-desktop.png"
                alt="dashboard preview on desktop"
                width={1000}
                height={760}
                className="hidden h-auto w-full max-w-xl md:block"
              />
              <Image
                src="/hero-mobile.png"
                alt="dashboard preview on mobile"
                width={560}
                height={620}
                className="block h-auto w-full max-w-xs md:hidden"
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

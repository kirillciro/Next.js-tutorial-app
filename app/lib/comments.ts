import { neon } from "@neondatabase/serverless";

type CommentRow = {
  id: number;
  comment: string;
  created_at: string;
};

const sql = neon(process.env.DATABASE_URL!);

let ensureCommentsTablePromise: Promise<unknown> | null = null;

function ensureCommentsTable() {
  if (!ensureCommentsTablePromise) {
    ensureCommentsTablePromise = sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        comment TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  }

  return ensureCommentsTablePromise;
}

export async function fetchComments(): Promise<CommentRow[]> {
  await ensureCommentsTable();

  const rows = (await sql`
    SELECT id, comment, created_at
    FROM comments
    ORDER BY created_at DESC
  `) as CommentRow[];

  return rows;
}

export async function createComment(comment: string): Promise<void> {
  await ensureCommentsTable();
  await sql`INSERT INTO comments (comment) VALUES (${comment})`;
}

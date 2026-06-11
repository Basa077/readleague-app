import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AI_ASSISTANT_ENABLED, ASSISTANT_MODEL, buildSystemPrompt } from "@/lib/ai";

type Msg = { role: "user" | "assistant"; content: string };

// Streams a reply from Lia, the reading companion. The browser POSTs the
// question (+ optional excerpt the reader has selected and a short history); we
// ground Claude on the book and stream the answer back as plain text.
export async function POST(req: Request): Promise<Response> {
  if (!AI_ASSISTANT_ENABLED) {
    return new Response("The AI assistant isn't configured yet.", { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to use the assistant.", { status: 401 });

  let body: { bookId?: number; question?: string; excerpt?: string; page?: number; history?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const question = (body.question || "").toString().trim().slice(0, 2000);
  if (!question) return new Response("Ask a question first.", { status: 400 });

  const [book] = await db
    .select({ title: schema.books.title, author: schema.books.author, genre: schema.books.genre, description: schema.books.description })
    .from(schema.books)
    .where(eq(schema.books.id, Number(body.bookId)))
    .limit(1);
  if (!book) return new Response("Book not found", { status: 404 });

  const excerpt = (body.excerpt || "").toString().trim().slice(0, 1500);
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

  const userText = excerpt
    ? `Here is the passage I'm looking at:\n"""\n${excerpt}\n"""\n\nMy question: ${question}`
    : question;

  const messages = [
    ...history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
    { role: "user" as const, content: userText },
  ];

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const ai = client.messages.stream({
          model: ASSISTANT_MODEL,
          max_tokens: 2048,
          thinking: { type: "adaptive" },
          system: buildSystemPrompt(book, body.page),
          messages,
        });
        for await (const event of ai) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "the assistant hit an error";
        controller.enqueue(encoder.encode(`\n\n⚠️ Sorry — ${msg}. Please try again.`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

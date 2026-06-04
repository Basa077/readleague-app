import { db, schema } from "@/db";

async function main() {
  const books = await db.select({ id: schema.books.id }).from(schema.books);
  const users = await db.select({ id: schema.users.id }).from(schema.users);
  console.log(`books: ${books.length} | users: ${users.length}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

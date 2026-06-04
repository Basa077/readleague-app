// Set (reset) a user's password. Also handy for provisioning a coordinator:
//   npm run set-password -- coord@readleague.app "NewStrongPassw0rd"
//   npm run set-password -- someone@example.com "pw" coordinator   (3rd arg = role)
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const [email, password, role] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: set-password <email> <password> [reader|coordinator]');
  process.exit(1);
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  const set: { passwordHash: string; role?: "reader" | "coordinator" } = { passwordHash };
  if (role === "reader" || role === "coordinator") set.role = role;

  const res = await db
    .update(schema.users)
    .set(set)
    .where(eq(schema.users.email, email.toLowerCase().trim()))
    .returning({ id: schema.users.id, email: schema.users.email, role: schema.users.role });

  console.log(res.length ? `✓ updated ${res[0].email} (role: ${res[0].role})` : `no user with email ${email}`);
  process.exit(res.length ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });

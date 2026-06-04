import { googleConfigured } from "@/lib/google";
import { LoginForm } from "./LoginForm";

// Evaluate the Google gate at request time so the button appears as soon as the
// credentials are present (no rebuild needed in dev).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm googleEnabled={googleConfigured()} />;
}

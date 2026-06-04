import { googleConfigured } from "@/lib/google";
import { SignupForm } from "./SignupForm";

// Evaluate the Google gate at request time so the button appears as soon as the
// credentials are present (no rebuild needed in dev).
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return <SignupForm googleEnabled={googleConfigured()} />;
}

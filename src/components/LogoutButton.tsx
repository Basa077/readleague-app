"use client";

import { logoutAction } from "@/app/actions/auth";

export function LogoutButton({ className = "rl-btn" }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button type="submit" className={className}>Log out</button>
    </form>
  );
}

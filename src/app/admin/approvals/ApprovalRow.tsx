"use client";

import { useActionState } from "react";
import { approveBookAction, rejectBookAction, type ActionState } from "@/app/actions/admin";

const init: ActionState = {};

type Props = {
  book: { id: number; title: string; author: string; genre: string; pages: number; format: string };
  uploader: { displayName: string; handle: string } | null;
};

export function ApprovalRow({ book, uploader }: Props) {
  const [, approveForm, approving] = useActionState(approveBookAction, init);
  const [, rejectForm, rejecting] = useActionState(rejectBookAction, init);

  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-medium">{book.title}</div>
        <div className="text-xs" style={{ color: "var(--ink-3)" }}>
          {book.author} · {book.genre} · {book.pages}p · {book.format}
        </div>
        {uploader && (
          <div className="text-[10px] mt-1" style={{ color: "var(--ink-3)" }}>
            uploaded by {uploader.displayName} (@{uploader.handle})
          </div>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <form action={rejectForm}>
          <input type="hidden" name="bookId" value={book.id} />
          <button disabled={rejecting} className="rl-btn text-xs">{rejecting ? "…" : "Reject"}</button>
        </form>
        <form action={approveForm}>
          <input type="hidden" name="bookId" value={book.id} />
          <button disabled={approving} className="rl-btn rl-btn-primary text-xs">{approving ? "…" : "Approve"}</button>
        </form>
      </div>
    </div>
  );
}

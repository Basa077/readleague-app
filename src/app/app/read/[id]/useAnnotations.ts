"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAnnotationsAction,
  createAnnotationAction,
  updateAnnotationAction,
  deleteAnnotationAction,
  type AnnotationDTO,
  type PatchAnnotationInput,
} from "@/app/actions/annotations";
import type { HighlightColorKey } from "@/lib/annotations";

export type Anno = AnnotationDTO;
export type NRect = { x: number; y: number; w: number; h: number };

// Strict client-side input (the server action accepts a looser, coerced shape).
export type AddInput = {
  kind?: "highlight" | "note";
  color?: HighlightColorKey;
  page?: number;
  cfiRange?: string;
  rects?: string;
  selectedText?: string;
  note?: string;
  shared?: boolean;
};

export function parseRects(json: string | null): NRect[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as NRect[]) : [];
  } catch {
    return [];
  }
}

export function useAnnotations(bookId: number) {
  const [items, setItems] = useState<Anno[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let on = true;
    listAnnotationsAction(bookId)
      .then((rows) => { if (on) { setItems(rows); setLoaded(true); } })
      .catch(() => { if (on) setLoaded(true); });
    return () => { on = false; };
  }, [bookId]);

  const add = useCallback(
    async (input: AddInput): Promise<Anno | null> => {
      const res = await createAnnotationAction({ bookId, ...input });
      if (!res.ok || !res.id) return null;
      const optimistic: Anno = {
        id: res.id,
        mine: true,
        authorName: "You",
        kind: input.kind ?? "highlight",
        color: input.color ?? "yellow",
        page: input.page ?? null,
        cfiRange: input.cfiRange ?? null,
        rects: input.rects ?? null,
        selectedText: input.selectedText ?? null,
        note: input.note ?? null,
        shared: input.shared ?? false,
        createdAt: new Date().toISOString(),
      };
      setItems((cur) => [...cur, optimistic]);
      return optimistic;
    },
    [bookId]
  );

  const update = useCallback(async (id: number, patch: PatchAnnotationInput) => {
    setItems((cur) => cur.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await updateAnnotationAction(id, patch).catch(() => {});
  }, []);

  const remove = useCallback(async (id: number) => {
    setItems((cur) => cur.filter((a) => a.id !== id));
    await deleteAnnotationAction(id).catch(() => {});
  }, []);

  return { items, loaded, add, update, remove };
}

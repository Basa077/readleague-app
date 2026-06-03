"use client";

import { useEffect, useRef, useState } from "react";
import { ReactReader } from "react-reader";
import type { Contents, Rendition } from "epubjs";

export function EpubReader({
  url,
  initialCfi,
  onCfi,
  onTotalPages,
}: {
  url: string;
  initialCfi?: string;
  onCfi: (cfi: string, page: number) => void;
  onTotalPages: (total: number) => void;
}) {
  const [location, setLocation] = useState<string | number | null>(initialCfi ?? null);
  const renditionRef = useRef<Rendition | null>(null);
  const [estPage, setEstPage] = useState(1);
  const [estTotal, setEstTotal] = useState(0);

  useEffect(() => {
    return () => {
      renditionRef.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full relative">
      <ReactReader
        url={url}
        location={location}
        locationChanged={(loc: string) => {
          setLocation(loc);
          // Map to a page-like number using rendition.locations if available
          let page = estPage;
          let total = estTotal;
          const r = renditionRef.current;
          if (r && r.book) {
            try {
              const locs = r.book.locations as unknown as {
                length: () => number;
                locationFromCfi: (cfi: string) => number;
              };
              if (typeof locs.length === "function") {
                total = locs.length();
                page = locs.locationFromCfi(loc) + 1;
                setEstPage(page);
                setEstTotal(total);
                if (total > 0) onTotalPages(total);
              }
            } catch { /* ignore */ }
          }
          onCfi(loc, page);
        }}
        getRendition={(rendition: Rendition) => {
          renditionRef.current = rendition;
          rendition.themes.fontSize("110%");
          // Build locations once for page mapping
          rendition.book.ready.then(() => {
            const locs = rendition.book.locations as unknown as {
              generate: (chars: number) => Promise<unknown>;
              length: () => number;
            };
            return locs.generate(1024);
          }).then(() => {
            const total = (rendition.book.locations as unknown as { length: () => number }).length();
            setEstTotal(total);
            onTotalPages(total);
          }).catch(() => {});

          rendition.hooks.content.register((contents: Contents) => {
            contents.document.documentElement.style.color = "var(--ink)";
          });
        }}
        epubInitOptions={{ openAs: "epub" }}
      />
    </div>
  );
}

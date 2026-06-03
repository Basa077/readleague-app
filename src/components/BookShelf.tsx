import Link from "next/link";
import { BookCover } from "./BookCover";

type ShelfBook = {
  id: number;
  title: string;
  author: string;
  genre: string;
  locked?: boolean;
  reward?: boolean;
  href?: string;
};

export function BookShelf({
  title,
  subtitle,
  books,
  size = 124,
}: {
  title?: string;
  subtitle?: string;
  books: ShelfBook[];
  size?: number;
}) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-2">
      {title && (
        <div className="flex items-baseline justify-between px-4 sm:px-6">
          <div>
            <h3 className="rl-serif text-lg leading-tight">{title}</h3>
            {subtitle && <div className="text-xs" style={{ color: "var(--ink-3)" }}>{subtitle}</div>}
          </div>
          <span className="text-xs rl-mono" style={{ color: "var(--ink-3)" }}>{books.length}</span>
        </div>
      )}
      <div className="overflow-x-auto rl-scroll" style={{ scrollSnapType: "x mandatory" }}>
        <div className="flex gap-3 px-4 sm:px-6 pb-2" style={{ width: "max-content" }}>
          {books.map((b) => (
            <Link
              key={b.id}
              href={b.href ?? `/app/books/${b.id}`}
              className="flex-shrink-0"
              style={{ scrollSnapAlign: "start", width: size }}
            >
              <BookCover
                title={b.title}
                author={b.author}
                genre={b.genre}
                size={size}
                locked={b.locked}
                reward={b.reward}
              />
              <div className="mt-2 text-[12px] line-clamp-2 leading-snug" style={{ width: size }}>{b.title}</div>
              <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>{b.author}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

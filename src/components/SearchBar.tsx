// Plain GET form — submitting navigates to /app/search?q=… (no client JS needed).
export function SearchBar({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/app/search" className="flex gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Search by title or author…"
        className="rl-input flex-1"
        aria-label="Search books"
      />
      <button type="submit" className="rl-btn rl-btn-primary px-4">Search</button>
    </form>
  );
}

/** Primul element focusabil al paginii: sare peste bară, direct la `#continut`. */
export function SkipLink() {
  return (
    <a
      href="#continut"
      className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium shadow-md ring-(length:--hairline) ring-border outline-none focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus-visible:ring-3 focus-visible:ring-focus-ring"
    >
      Sari la conținut
    </a>
  );
}

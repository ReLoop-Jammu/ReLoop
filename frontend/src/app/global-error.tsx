"use client";

// Shown only when the root layout itself fails. It replaces the whole document,
// so it carries its own styles (the site's stylesheet is not loaded here).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f6ede2",
          color: "#0e1a27",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.75rem" }}>ReLoop is having a problem</h1>
          <p style={{ lineHeight: 1.6, margin: "0 0 1.5rem", color: "#3b4e66" }}>
            Please try again. If it keeps happening, come back in a few minutes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#26436c",
              color: "#fff",
              border: 0,
              borderRadius: "0.75rem",
              padding: "0.75rem 1.25rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

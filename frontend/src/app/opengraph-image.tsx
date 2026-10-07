import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social-share preview for every page without its own image. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #1e6b9e 0%, #0c2e45 100%)",
        color: "white",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}
      >
        <svg width="64" height="64" viewBox="0 0 120 120">
          <path d="M42 91.18 A36 36 0 0 1 78 28.82" fill="none" stroke="#ffffff" strokeWidth="12" />
          <path
            d="M81.67 31.25 A36 36 0 0 1 80.65 89.49"
            fill="none"
            stroke="#E9B26E"
            strokeWidth="12"
          />
          <path d="M88.33 99.36 L67.23 98.88 L73.99 78.89 Z" fill="#E9B26E" />
          <circle cx="42" cy="91.18" r="11.5" fill="#ffffff" />
        </svg>
        <span>
          ReLoop<span style={{ color: "#e8b83a" }}>.</span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          Collect. Grade.
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: "#efc553",
          }}
        >
          Resell what still works.
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>
          Tested and graded A–D at our Jammu hub
        </div>
      </div>
    </div>,
    size,
  );
}

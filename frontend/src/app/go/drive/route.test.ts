import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/go/drive", () => {
  it("redirects to the locations page with the campaign, and is never cached", async () => {
    const response = await GET(new Request("https://re-loop-ochre.vercel.app/go/drive"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://re-loop-ochre.vercel.app/locations?utm_source=qr&utm_medium=print&utm_campaign=awareness-drive-2026",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

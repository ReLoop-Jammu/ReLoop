// @vitest-environment node
import { describe, expect, it } from "vitest";
import { imageKind, stripMetadata } from "./exif";

const text = (s: string) => [...s].map((c) => c.charCodeAt(0));
const has = (b: Uint8Array, s: string) => Buffer.from(b).includes(Buffer.from(s, "latin1"));

describe("photo metadata", () => {
  it("removes EXIF, XMP and comments from a JPEG, keeping the image data", () => {
    const app1 = [0xff, 0xe1, 0x00, 0x0c, ...text("Exif\0\0GPS!")];
    const com = [0xff, 0xfe, 0x00, 0x07, ...text("hello")];
    const dqt = [0xff, 0xdb, 0x00, 0x04, 0x01, 0x02];
    const sos = [0xff, 0xda, 0x00, 0x03, 0x01, 0xaa, 0xbb, 0xff, 0xd9];
    const jpeg = new Uint8Array([0xff, 0xd8, ...app1, ...com, ...dqt, ...sos]);
    const out = stripMetadata(jpeg)!;
    expect(out.kind).toBe("jpeg");
    expect(has(out.bytes, "GPS!")).toBe(false);
    expect(has(out.bytes, "hello")).toBe(false);
    expect([...out.bytes]).toEqual([0xff, 0xd8, ...dqt, ...sos]);
  });

  it("removes EXIF and text chunks from a PNG", () => {
    const chunk = (type: string, data: number[]) => [
      0,
      0,
      0,
      data.length,
      ...text(type),
      ...data,
      0,
      0,
      0,
      0,
    ];
    const png = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...chunk("IHDR", Array(13).fill(1)),
      ...chunk("eXIf", text("SECRET")),
      ...chunk("tEXt", text("Author\0Me")),
      ...chunk("IDAT", [1, 2, 3]),
      ...chunk("IEND", []),
    ]);
    const out = stripMetadata(png)!;
    expect(out.kind).toBe("png");
    expect(has(out.bytes, "SECRET")).toBe(false);
    expect(has(out.bytes, "Author")).toBe(false);
    expect(has(out.bytes, "IDAT")).toBe(true);
    expect(has(out.bytes, "IEND")).toBe(true);
  });

  it("removes EXIF and XMP from a WebP and fixes its size", () => {
    const chunk = (type: string, data: number[]) => [
      ...text(type),
      data.length,
      0,
      0,
      0,
      ...data,
      ...(data.length % 2 ? [0] : []),
    ];
    const body = [
      ...text("WEBP"),
      ...chunk("VP8X", [0x0c, 0, 0, 0, 1, 0, 0, 1, 0, 0]),
      ...chunk("EXIF", text("GPSDATA")),
      ...chunk("VP8 ", [9, 9, 9, 9]),
    ];
    const webp = new Uint8Array([...text("RIFF"), body.length, 0, 0, 0, ...body]);
    const out = stripMetadata(webp)!;
    expect(out.kind).toBe("webp");
    expect(has(out.bytes, "GPSDATA")).toBe(false);
    expect(has(out.bytes, "VP8 ")).toBe(true);
    const size = out.bytes[4] | (out.bytes[5] << 8);
    expect(size).toBe(out.bytes.length - 8);
    expect(out.bytes[20] & 0x0c).toBe(0); // the VP8X flags no longer promise EXIF or XMP
  });

  it("refuses anything that is not a well-formed photo", () => {
    expect(imageKind(new Uint8Array(text("GIF89a...")))).toBeNull();
    expect(stripMetadata(new Uint8Array(text("<svg onload=alert(1)>")))).toBeNull();
    expect(stripMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0xff]))).toBeNull();
    expect(
      stripMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])),
    ).toBeNull();
  });
});

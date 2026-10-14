// Characters the standard PDF fonts (WinAnsi) can print, beyond Latin-1.
const CP1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

const printable = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || CP1252.has(ch);
};

/**
 * Text the receipt's font can print. The rupee sign becomes "Rs.". Anything
 * else it can't print (Hindi, emoji) is left out, and `lossy` says so, so the
 * receipt can point to the account page, which shows the name in full.
 * (Embedding a Devanagari font isn't enough: the PDF library doesn't shape
 * Indic scripts, so names would print garbled.)
 */
export function pdfText(text: string): { text: string; lossy: boolean } {
  let lossy = false;
  let out = "";
  for (const ch of text.replace(/₹\s?/g, "Rs. ").normalize("NFC")) {
    if (printable(ch)) out += ch;
    else {
      lossy = true;
      out += " ";
    }
  }
  out = out.replace(/\s+/g, " ").trim();
  return { text: out || "(see your account)", lossy };
}

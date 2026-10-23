/**
 * The English / हिन्दी switch. Translated pages render both languages and CSS
 * shows one, chosen by `data-lang` on <html>. The choice is kept in the
 * visitor's browser, so pages stay static and nothing is sent to a server.
 */
export type Lang = "en" | "hi";

export const LANG_STORAGE_KEY = "reloop-lang";

/** Event fired on window when the language changes, so every switch on the page updates. */
export const LANG_EVENT = "reloop-lang-change";

/**
 * Runs in <head> before the page paints, so a Hindi visitor never sees English
 * flash first. Kept tiny and dependency-free; storage can throw in private mode.
 */
export const LANG_BOOT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)})==="hi")document.documentElement.dataset.lang="hi"}catch(e){}`;

export function currentLang(): Lang {
  if (typeof document === "undefined") return "en";
  return document.documentElement.dataset.lang === "hi" ? "hi" : "en";
}

export function setLang(lang: Lang) {
  const root = document.documentElement;
  if (lang === "hi") root.dataset.lang = "hi";
  else delete root.dataset.lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage blocked: the switch still works until the page is closed.
  }
  window.dispatchEvent(new Event(LANG_EVENT));
}

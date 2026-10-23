import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LANG_BOOT_SCRIPT, LANG_STORAGE_KEY } from "@/lib/lang";
import { LanguageSwitch } from "./LanguageSwitch";
import { T } from "./T";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.lang;
  localStorage.clear();
});

describe("LanguageSwitch", () => {
  it("switches to Hindi, remembers it and switches back", () => {
    render(<LanguageSwitch />);
    const hindi = screen.getByRole("button", { name: "हिन्दी" });
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(hindi);
    expect(document.documentElement.dataset.lang).toBe("hi");
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("hi");
    expect(hindi).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(document.documentElement.dataset.lang).toBeUndefined();
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("en");
  });

  it("restores a saved Hindi choice before the page renders", () => {
    localStorage.setItem(LANG_STORAGE_KEY, "hi");
    new Function(LANG_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.lang).toBe("hi");
  });

  it("marks Hindi text with its language", () => {
    render(<T en="Sign up" hi="साइन अप करें" />);
    expect(screen.getByText("साइन अप करें")).toHaveAttribute("lang", "hi");
    expect(screen.getByText("Sign up")).toHaveAttribute("data-l", "en");
  });
});

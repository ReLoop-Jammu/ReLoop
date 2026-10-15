import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReserveItem } from "./ReserveItem";

afterEach(() => vi.unstubAllGlobals());

function stubRequests(ok = true) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(ok ? { ok: true } : { error: "x" }), { status: ok ? 200 : 503 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const props = {
  itemId: "RL-JMU-0006",
  title: "Dell Latitude 5420",
  pricePaise: 1600000,
  shipsIndia: true,
};

describe("reserving or asking about an item", () => {
  it("saves a reservation for staff, linked to the item, then hands off", async () => {
    const fetchMock = stubRequests();
    render(<ReserveItem {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Reserve this item" }));
    fireEvent.change(screen.getByLabelText(/^Your\ name/), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText(/^Phone\ \/\ WhatsApp/), {
      target: { value: "98765 43210" },
    });
    fireEvent.change(screen.getByLabelText(/^How\ do\ you\ want\ it\?/), {
      target: { value: "Delivery in Jammu city (₹50)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare my reservation" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/requests");
    expect(JSON.parse(init.body as string)).toMatchObject({
      kind: "reservation",
      itemId: "RL-JMU-0006",
      fields: { name: "Asha", phone: "98765 43210", fulfilment: "Delivery in Jammu city (₹50)" },
    });
    expect(await screen.findByText("Almost done: send this to ReLoop")).toBeInTheDocument();
    expect(screen.queryByText(/couldn't keep a copy/)).not.toBeInTheDocument();
  });

  it("saves a question as an enquiry, and still hands off if saving fails", async () => {
    const fetchMock = stubRequests(false);
    render(<ReserveItem {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Ask a question" }));
    fireEvent.change(screen.getByLabelText(/^Your\ name/), { target: { value: "Ravi" } });
    fireEvent.change(screen.getByLabelText(/^Phone\ \/\ WhatsApp/), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByLabelText(/^Your\ question/), {
      target: { value: "Battery health?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare my question" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toMatchObject({
      kind: "enquiry",
      itemId: "RL-JMU-0006",
      fields: { question: "Battery health?" },
    });
    expect(await screen.findByText(/couldn't keep a copy/)).toBeInTheDocument();
  });

  it("samples can't be reserved or asked about", () => {
    render(<ReserveItem {...props} sample />);
    expect(screen.queryByRole("button", { name: "Reserve this item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask a question" })).not.toBeInTheDocument();
  });
});

describe("WhatsApp on an item page", () => {
  afterEach(cleanup);

  it("offers a chat that names the item's tag and title", () => {
    cleanup();
    render(<ReserveItem {...props} />);
    const link = screen.getByRole("link", { name: /Chat on WhatsApp/ });
    expect(new URL(link.getAttribute("href")!).searchParams.get("text")).toBe(
      "Hi ReLoop, I'm interested in RL-JMU-0006 Dell Latitude 5420",
    );
  });

  it("is hidden on sample items", () => {
    render(<ReserveItem {...props} sample />);
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
  });
});

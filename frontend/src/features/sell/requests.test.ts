import { describe, expect, it } from "vitest";
import { cleanRequest, ticketRef } from "./requests";

describe("public requests", () => {
  it("accepts an institution pickup with a contact and phone", () => {
    expect(
      cleanRequest({
        kind: "institution_pickup",
        fields: {
          institution: " IIM Jammu ",
          contact: "Ravi",
          phone: "98765 43210",
          items: "20 desktops",
        },
      }),
    ).toEqual({
      kind: "institution_pickup",
      fields: {
        institution: "IIM Jammu",
        contact: "Ravi",
        phone: "98765 43210",
        items: "20 desktops",
      },
      itemId: null,
    });
  });

  it("needs an item for reservations and enquiries", () => {
    const fields = { name: "Asha", phone: "9876543210" };
    expect(cleanRequest({ kind: "reservation", fields })).toEqual({
      error: "Which item is this about?",
    });
    expect(cleanRequest({ kind: "enquiry", fields, itemId: "RL-JMU-0006" })).toMatchObject({
      kind: "enquiry",
      itemId: "RL-JMU-0006",
    });
    expect(cleanRequest({ kind: "reservation", fields, itemId: "../etc" })).toEqual({
      error: "Which item is this about?",
    });
  });

  it("refuses unknown kinds, missing names and short phones, and drops odd fields", () => {
    expect(cleanRequest({ kind: "shop_partner", fields: {} })).toEqual({
      error: "Unknown request.",
    });
    expect(
      cleanRequest({ kind: "enquiry", fields: { phone: "9876543210" }, itemId: "RL-JMU-0006" }),
    ).toEqual({
      error: "Please add your name.",
    });
    expect(
      cleanRequest({ kind: "enquiry", fields: { name: "A", phone: "12" }, itemId: "RL-JMU-0006" }),
    ).toEqual({
      error: "Enter a phone number with at least 10 digits.",
    });
    const r = cleanRequest({
      kind: "enquiry",
      itemId: "RL-JMU-0006",
      fields: { name: "A", phone: "9876543210", "Bad Key": "x", nested: { a: 1 } },
    });
    expect("fields" in r && Object.keys(r.fields)).toEqual(["name", "phone"]);
  });
});

describe("ticket references", () => {
  it("are RQ- and the first six characters of the request's id, in capitals", () => {
    expect(ticketRef("3f9a2c41-1b2d-4e5f-8a9b-0c1d2e3f4a5b")).toBe("RQ-3F9A2C");
  });
});

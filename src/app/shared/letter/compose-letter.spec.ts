import { composeLetter } from "./compose-letter";

describe("composeLetter", () => {
  const WRITTEN = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello,\nI have a question." };

  it("opens the message with the circled topic and a blank line", () => {
    expect(composeLetter({ ...WRITTEN, topic: "a role" })).toEqual({
      ...WRITTEN,
      message: "Re: a role\n\nHello,\nI have a question.",
    });
  });

  it("sends the message as written when no topic was circled", () => {
    expect(composeLetter({ ...WRITTEN, topic: "" })).toEqual(WRITTEN);
  });

  it("hands the mail service nothing but the name, the address and the message", () => {
    expect(Object.keys(composeLetter({ ...WRITTEN, topic: "a project" })).sort()).toEqual(["email", "message", "name"]);
  });
});

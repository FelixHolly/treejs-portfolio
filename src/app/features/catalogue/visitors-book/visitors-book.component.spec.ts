import { ComponentFixture, TestBed } from "@angular/core/testing";
import { VISITOR_ENTRIES } from "../../../core/content/visitors-book.content";
import { VisitorsBookComponent } from "./visitors-book.component";

describe("VisitorsBookComponent", () => {
  let fixture: ComponentFixture<VisitorsBookComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(VisitorsBookComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  const names = () => Array.from(element.querySelectorAll(".board p")).map((line) => line.textContent!.trim());

  it("letters every company on the board once, one to a line, in the book's order", () => {
    const companies = VISITOR_ENTRIES.map((entry) => entry.company);

    expect(names()).toEqual([...new Set(companies)]);
    expect(new Set(names()).size).toBe(names().length);
    for (const company of companies) expect(names()).toContain(company);
  });

  it("hides the board from assistive technology, because every quote already names its company", () => {
    const board = element.querySelector(".board")!;
    const captions = Array.from(element.querySelectorAll("figcaption")).map((caption) => caption.textContent!);

    expect(board.getAttribute("aria-hidden")).toBe("true");
    expect(board.querySelector("a, button, [tabindex]")).toBeNull();
    VISITOR_ENTRIES.forEach((entry, index) => expect(captions[index]).toContain(entry.company));
  });

  it("hangs the board under the room's label and above the first quote", () => {
    const board = element.querySelector(".board")!;
    const label = element.querySelector("app-room-label")!;
    const quote = element.querySelector("figure")!;

    expect(label.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(board.compareDocumentPosition(quote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(board.getBoundingClientRect().bottom).toBeLessThanOrEqual(quote.getBoundingClientRect().top);
  });

  it("letters the names in spaced gold capitals, centred, and no wider than its column", () => {
    const face = getComputedStyle(element.querySelector(".board-face")!);
    const board = element.querySelector(".board")!.getBoundingClientRect();
    const section = element.querySelector("section")!.getBoundingClientRect();

    expect(face.textTransform).toBe("uppercase");
    expect(face.color).toBe("rgb(217, 184, 92)");
    expect(parseFloat(face.letterSpacing)).toBeGreaterThan(2);
    expect(board.width).toBeLessThanOrEqual(section.width);
    expect(Math.abs(board.left + board.right - (section.left + section.right))).toBeLessThan(2);
  });

  it("still shows every quote with its author's role", () => {
    expect(element.querySelectorAll("blockquote").length).toBe(VISITOR_ENTRIES.length);
    for (const entry of VISITOR_ENTRIES) expect(element.textContent).toContain(entry.role);
  });
});

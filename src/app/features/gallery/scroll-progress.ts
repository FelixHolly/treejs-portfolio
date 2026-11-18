/** Where a stop's label sits in the document, in pixels from the top. */
export interface LabelSpan {
  top: number;
  bottom: number;
}

/** The camera has arrived once a label's top has risen to this fraction of the viewport height. */
const ARRIVE = 0.6;
/** It leaves once the label's bottom has risen above this fraction. */
const LEAVE = 0.4;

function hold(span: LabelSpan, viewportHeight: number): [start: number, end: number] {
  return [span.top - ARRIVE * viewportHeight, span.bottom - LEAVE * viewportHeight];
}

function smooth(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

// Maps the scroll position to a position on the route, in stops. The camera holds at a stop while its
// label is in the middle band of the screen and glides to the next across the gap between labels.
export function progressFromScroll(scrollY: number, spans: readonly LabelSpan[], viewportHeight: number): number {
  for (let index = 0; index < spans.length; index++) {
    const [start, end] = hold(spans[index], viewportHeight);

    if (scrollY < start) {
      if (index === 0) return 0;
      const previousEnd = hold(spans[index - 1], viewportHeight)[1];
      return index - 1 + smooth((scrollY - previousEnd) / (start - previousEnd));
    }
    if (scrollY <= end) return index;
  }
  return Math.max(spans.length - 1, 0);
}

/** The scroll position that centres a label, or pins its top under the header when it is taller than the screen. */
export function scrollTargetFor(span: LabelSpan, viewportHeight: number, headerClearance: number): number {
  const spare = (viewportHeight - (span.bottom - span.top)) / 2;
  return Math.max(span.top - Math.max(spare, headerClearance), 0);
}

/** Labels sit beside the scene from this width up; below it they lie over it. */
const SIDE_BY_SIDE_FROM = 900;
const MAX_LABEL_SHARE = 0.6;

/** The share of the page width a side label covers, gutter included; 0 when labels lie over the scene. */
export function labelShareOf(labelLeft: number | undefined, pageWidth: number, gutter: number): number {
  if (labelLeft === undefined || pageWidth < SIDE_BY_SIDE_FROM) return 0;
  return Math.min(Math.max((pageWidth - labelLeft + gutter) / pageWidth, 0), MAX_LABEL_SHARE);
}

/** The stop a key press walks to: the neighbour when standing at a stop, otherwise the one being approached or left. */
export function neighbourStop(progress: number, active: number, direction: -1 | 1): number {
  const settled = Math.abs(progress - active) < 0.02;
  if (settled) return active + direction;
  return direction > 0 ? Math.ceil(progress) : Math.floor(progress);
}

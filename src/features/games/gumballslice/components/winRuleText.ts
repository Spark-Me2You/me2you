/**
 * Win rule wording, built from config so the screens stay in sync with the rule.
 */

import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";

/** Finishing without striking out already means fewer broccoli than the strike limit. */
const strikesAreTheLimit = C.MAX_BROCCOLI_HITS >= C.BROCCOLI_STRIKES - 1;

export const WIN_RULE_TEXT =
  C.MAX_BROCCOLI_HITS === 0
    ? `slice ${C.MIN_SLICES} candies without slicing any broccoli`
    : strikesAreTheLimit
      ? `slice ${C.MIN_SLICES} candies`
      : `slice ${C.MIN_SLICES} candies and no more than ${C.MAX_BROCCOLI_HITS} broccoli`;

export const STRIKE_RULE_TEXT = `${C.BROCCOLI_STRIKES} broccoli and you're out!`;

export const tooMuchBroccoli = (broccoliHits: number): boolean =>
  broccoliHits > C.MAX_BROCCOLI_HITS;

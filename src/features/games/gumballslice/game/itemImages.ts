/**
 * Item Images
 * The photo/illustration assets used for items, plus each candy's sugar-burst
 * colour (from the theme palette). Add or swap candies here.
 */

import broccoliImg from "@/assets/Broccoli_PNG_Picture.png";
import pinkSpiralImg from "@/assets/candy_02_pink_spiral.png";
import creamGreenBallImg from "@/assets/candy_03_cream_green_ball.png";
import greenWhiteSwirlImg from "@/assets/candy_07_green_white_swirl.png";
import pinkCreamSpiralImg from "@/assets/candy_10_pink_cream_spiral.png";
import orangeBallImg from "@/assets/candy_11_orange_ball.png";
import { colors } from "@/shared/theme/colors";

export interface CandyImage {
  url: string;
  particleColor: string;
}

export const CANDY_IMAGES: readonly CandyImage[] = [
  { url: pinkSpiralImg, particleColor: colors.magenta },
  { url: creamGreenBallImg, particleColor: colors.leafGreen },
  { url: greenWhiteSwirlImg, particleColor: colors.leafGreen },
  { url: pinkCreamSpiralImg, particleColor: colors.btnPink },
  { url: orangeBallImg, particleColor: colors.btnOrange },
];

export const BROCCOLI_IMAGE = broccoliImg;

/** The single candy shown on the start screen legend. */
export const ICON_CANDY_IMAGE = pinkSpiralImg;

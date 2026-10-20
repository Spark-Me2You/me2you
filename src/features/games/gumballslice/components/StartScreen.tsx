/**
 * Start Screen
 * Title, how-to-play demo, item legend and a Ready button. The hand that taps
 * Ready becomes the locked player for the round.
 */

import React from "react";
import { PinnedRegistrationQR } from "@/features/kiosk";
import { ExitButton } from "@/shared/components";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import { ItemIcon } from "./ItemIcon";
import { SliceDemo } from "./SliceDemo";
import styles from "./StartScreen.module.css";

interface Props {
  onReady: () => void;
  onBack: () => void;
}

export const StartScreen: React.FC<Props> = ({ onReady, onBack }) => (
  <div className={styles.container}>
    <ExitButton onClick={onBack} label="back" />

    <h1 className={styles.title}>Gumball Slice</h1>

    <SliceDemo />

    <div className={styles.legend}>
      <div className={styles.legendGroup}>
        <ItemIcon kind="gumball" className={styles.icon} />
        <ItemIcon kind="golden" className={styles.icon} />
        <span className={styles.good}>slice candy!</span>
      </div>
      <div className={styles.legendGroup}>
        <ItemIcon kind="broccoli" className={styles.icon} />
        <span className={styles.bad}>avoid broccoli</span>
      </div>
    </div>

    <p className={styles.subhint}>
      slice as many candies as you can in {C.ROUND_SECONDS} seconds!
    </p>

    <button className={styles.primary} onClick={onReady}>
      Ready
    </button>

    <PinnedRegistrationQR side="right" top={145} qrSize={150} />
  </div>
);

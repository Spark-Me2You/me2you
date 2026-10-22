/**
 * Start Screen
 * Title, item legend, how-to-play demo and a Ready button, with the real
 * Spark candy machine (the prize) in a framed tab pinned to the left edge,
 * mirroring the registration QR tab on the right. The hand that taps
 * Ready becomes the locked player.
 */

import React from "react";
import { PinnedRegistrationQR } from "@/features/kiosk";
import { ExitButton } from "@/shared/components";
import candyMachineImg from "../../../../assets/candymachine.png";
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

    <div className={styles.machinePanel}>
      <p className={styles.machineCaption}>win real candy!</p>
      <div className={styles.photoFrame}>
        <img src={candyMachineImg} alt="The Spark candy machine" className={styles.machineImg} />
      </div>
    </div>

    <h1 className={styles.title}>Gumball Slice</h1>

    <div className={styles.legend}>
      <div className={styles.legendGroup}>
        <ItemIcon kind="candy" className={styles.icon} />
        <span className={styles.good}>slice candy!</span>
      </div>
      <div className={styles.legendGroup}>
        <ItemIcon kind="broccoli" className={styles.icon} />
        <span className={styles.bad}>avoid broccoli</span>
      </div>
    </div>

    <SliceDemo />

    <p className={styles.subhint}>
      slice as many candies as you can in {C.ROUND_SECONDS} seconds!
    </p>

    <button className={styles.primary} onClick={onReady}>
      Ready
    </button>

    <PinnedRegistrationQR side="right" top={145} qrSize={150} />
  </div>
);

/**
 * Slice Demo
 * Looping animation of a slash cutting a gumball in two, showing how to play.
 */

import React from "react";
import styles from "./SliceDemo.module.css";

export const SliceDemo: React.FC = () => (
  <div className={styles.demo} aria-hidden="true">
    <div className={`${styles.candy} ${styles.left}`} />
    <div className={`${styles.candy} ${styles.right}`} />
    <div className={styles.slash} />
  </div>
);

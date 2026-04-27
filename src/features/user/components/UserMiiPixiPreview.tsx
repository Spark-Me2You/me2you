import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Assets, Sprite } from "pixi.js";
import type { Accessory } from "@/core/auth/AuthContext";
import type {
  AccessorySettings,
  AvatarLandmarkPoints,
} from "@/features/profile-editor/types/profileTypes";
import miiBody from "@/assets/mii_body.png";
import {
  HUB_ACCESSORY_TUNING,
  MII_BODY_SCALE,
  MII_FACE_SCALE,
  MII_HEAD_OFFSET_X,
  MII_HEAD_OFFSET_Y,
  getAccessoryPlacement,
  getBalloonCenterFromHandAnchor,
} from "@/shared/utils";
import styles from "./UserMiiPixiPreview.module.css";

const ACCESSORY_TEXTURES: Record<Accessory, string> = {
  sunglasses: "/accessories/sunglasses.svg",
  hat: "/accessories/hat.svg",
  balloon: "/accessories/balloon.svg",
};

const REQUIRED_LANDMARKS: Array<keyof AvatarLandmarkPoints> = [
  "centroid_point",
  "left_eye_point",
  "right_eye_point",
  "forehead_top_point",
];

export interface UserMiiPixiPreviewProps {
  bobbleheadUrl: string | null;
  accessorySettings: AccessorySettings;
  landmarks: AvatarLandmarkPoints | null;
  className?: string;
  width?: number;
  height?: number;
}

export const UserMiiPixiPreview: React.FC<UserMiiPixiPreviewProps> = ({
  bobbleheadUrl,
  accessorySettings,
  landmarks,
  className,
  width = 220,
  height = 220,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const bodyRef = useRef<Sprite | null>(null);
  const faceRef = useRef<Sprite | null>(null);
  const accessoryRef = useRef<Sprite | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const selectedAccessory = accessorySettings.selected_accessory;

  const hasAccessoryLandmarks = useMemo(() => {
    if (!landmarks) return false;
    return REQUIRED_LANDMARKS.every((name) => landmarks[name] !== null);
  }, [landmarks]);

  const shouldRenderAccessory =
    selectedAccessory !== null && hasAccessoryLandmarks && bobbleheadUrl !== null;

  const applyLayout = useCallback(() => {
    const body = bodyRef.current;
    const face = faceRef.current;
    if (!body || !face) return;

    const stageBottomY = height;
    const centerX = width / 2;

    body.anchor.set(0.5, 1);
    body.scale.set(MII_BODY_SCALE);
    body.x = centerX;
    body.y = stageBottomY;

    face.anchor.set(0.5, 0.5);
    face.scale.set(MII_FACE_SCALE);
    face.x = centerX + MII_HEAD_OFFSET_X;
    face.y = stageBottomY + MII_HEAD_OFFSET_Y;

    const accessory = accessoryRef.current;
    if (!accessory || !selectedAccessory || !shouldRenderAccessory) {
      return;
    }

    const accTexture = accessory.texture;
    if (!accTexture.width || !accTexture.height) {
      return;
    }

    const placement = getAccessoryPlacement({
      accessory: selectedAccessory,
      faceWidth: face.width,
      faceHeight: face.height,
      accessoryAspectRatio: accTexture.width / accTexture.height,
      relativeX: accessorySettings.relative_x,
      relativeY: accessorySettings.relative_y,
      scale: accessorySettings.scale,
    });

    accessory.anchor.set(0.5, 0.5);
    accessory.width = placement.width;
    accessory.height = placement.height;

    if (placement.anchor === "balloon-hand") {
      const handX =
        body.x + body.width * HUB_ACCESSORY_TUNING.balloon.handXFactor;
      const handY =
        body.y - body.height * HUB_ACCESSORY_TUNING.balloon.handYFactor;
      const balloonCenter = getBalloonCenterFromHandAnchor({
        handX,
        handY,
        balloonWidth: placement.width,
        balloonHeight: placement.height,
        rotationRadians: placement.baseRotation,
        userDeltaX: placement.offsetX,
        userDeltaY: placement.offsetY,
      });

      accessory.x = balloonCenter.x;
      accessory.y = balloonCenter.y;
      accessory.rotation = placement.baseRotation;
      return;
    }

    accessory.x = face.x + placement.offsetX;
    accessory.y = face.y + placement.offsetY;
    accessory.rotation = placement.baseRotation;
  }, [
    accessorySettings.relative_x,
    accessorySettings.relative_y,
    accessorySettings.scale,
    height,
    selectedAccessory,
    shouldRenderAccessory,
    width,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    let disposed = false;

    const init = async () => {
      await app.init({
        width,
        height,
        antialias: true,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: window.devicePixelRatio,
      });

      if (disposed) {
        app.destroy({ removeView: true });
        return;
      }

      app.canvas.style.pointerEvents = "none";
      container.replaceChildren();
      container.appendChild(app.canvas);
      appRef.current = app;
      setIsReady(true);
    };

    init().catch((error) => {
      console.error("[UserMiiPixiPreview] Failed to init pixi app:", error);
      setRenderError("preview unavailable");
    });

    return () => {
      disposed = true;
      setIsReady(false);
      bodyRef.current = null;
      faceRef.current = null;
      accessoryRef.current = null;
      if (appRef.current) {
        appRef.current.destroy({ removeView: true });
        appRef.current = null;
      }
    };
  }, [height, width]);

  useEffect(() => {
    if (!isReady || !appRef.current) return;

    let cancelled = false;

    const loadScene = async () => {
      const app = appRef.current;
      if (!app) return;

      try {
        const bodyTexture = await Assets.load(miiBody);
        if (cancelled || !appRef.current) return;

        app.stage.removeChildren();

        const bodySprite = new Sprite(bodyTexture);
        app.stage.addChild(bodySprite);
        bodyRef.current = bodySprite;

        let faceSprite: Sprite | null = null;
        if (bobbleheadUrl) {
          const faceTexture = await Assets.load(bobbleheadUrl);
          if (cancelled || !appRef.current) return;
          faceSprite = new Sprite(faceTexture);
          app.stage.addChild(faceSprite);
        }
        faceRef.current = faceSprite;

        let accessorySprite: Sprite | null = null;
        if (selectedAccessory && shouldRenderAccessory) {
          const accessoryTexture = await Assets.load(
            ACCESSORY_TEXTURES[selectedAccessory],
          );
          if (cancelled || !appRef.current) return;
          accessorySprite = new Sprite(accessoryTexture);
          app.stage.addChild(accessorySprite);
        }
        accessoryRef.current = accessorySprite;

        applyLayout();
        setRenderError(null);
      } catch (error) {
        console.error("[UserMiiPixiPreview] Failed to render scene:", error);
        setRenderError("preview unavailable");
      }
    };

    void loadScene();

    return () => {
      cancelled = true;
    };
  }, [
    applyLayout,
    bobbleheadUrl,
    isReady,
    selectedAccessory,
    shouldRenderAccessory,
  ]);

  useEffect(() => {
    applyLayout();
  }, [applyLayout]);

  return (
    <div className={`${styles.root} ${className ?? ""}`}>
      <div ref={containerRef} className={styles.canvasHost} />

      {!bobbleheadUrl && (
        <div className={styles.overlayText}>no face yet</div>
      )}

      {selectedAccessory && !hasAccessoryLandmarks && bobbleheadUrl && (
        <div className={styles.overlayHint}>
          accessory preview appears after landmarks are generated
        </div>
      )}

      {renderError && <div className={styles.overlayHint}>{renderError}</div>}
    </div>
  );
};

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const cameraState: { stream: MediaStream | null } = { stream: null };

vi.mock("@/core/cv/SharedCameraProvider", () => ({
  useSharedCamera: () => ({ stream: cameraState.stream, isLoading: false, error: null }),
}));

import { CameraPreview } from "./CameraPreview";

describe("CameraPreview", () => {
  beforeEach(() => {
    cameraState.stream = null;
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  it("renders nothing until the shared stream is available", () => {
    const { container } = render(<CameraPreview />);
    expect(container).toBeEmptyDOMElement();
  });

  it("attaches the shared stream to a muted, mirrored video", () => {
    const stream = {} as MediaStream;
    cameraState.stream = stream;
    render(<CameraPreview />);

    const video = screen.getByLabelText("live camera preview") as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
    expect(video.muted).toBe(true);
    expect(video.className).toContain("-scale-x-100");
    expect(screen.getByText("that's you!")).toBeInTheDocument();
  });

  it("detaches the stream on unmount", () => {
    cameraState.stream = {} as MediaStream;
    const { unmount } = render(<CameraPreview />);
    const video = screen.getByLabelText("live camera preview") as HTMLVideoElement;
    unmount();
    expect(video.srcObject).toBeNull();
  });
});

"use client";

import { forwardRef } from "react";
import { CameraStatus } from "../types";

interface CameraFeedProps {
  status: CameraStatus;
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  ({ status }, videoRef) => {
    const isActive = status === "active" || status === "requesting";

    return (
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-video ${isActive ? "active" : ""}`}
        />
        {!isActive && (
          <div className="camera-placeholder">
            <span>Camera Off</span>
          </div>
        )}
      </div>
    );
  }
);

CameraFeed.displayName = "CameraFeed";
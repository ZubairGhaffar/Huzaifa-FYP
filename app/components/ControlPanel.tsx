"use client";

import { CameraStatus, ConnectionStatus } from "../types";

interface ControlPanelProps {
  cameraStatus: CameraStatus;
  connectionStatus: ConnectionStatus;
  onStart: () => void;
  onStop: () => void;
}

export function ControlPanel({
  cameraStatus,
  connectionStatus,
  onStart,
  onStop,
}: ControlPanelProps) {
  const isRunning = cameraStatus === "active" || cameraStatus === "requesting";
  const isConnecting = connectionStatus === "connecting" || cameraStatus === "requesting";

  return (
    <div className="control-panel">
      <button
        onClick={onStart}
        disabled={isRunning || isConnecting}
        className="btn btn-primary"
      >
        {isConnecting ? "Starting..." : "Start Stream"}
      </button>

      <button
        onClick={onStop}
        disabled={!isRunning && !isConnecting}
        className="btn btn-danger"
      >
        Stop Stream
      </button>
    </div>
  );
}
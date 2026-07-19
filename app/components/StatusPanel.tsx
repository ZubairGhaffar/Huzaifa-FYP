"use client";

import { AppState } from "@/types";

interface StatusPanelProps {
  state: AppState;
}

export function StatusPanel({ state }: StatusPanelProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
      case "connected":
        return "status-green";
      case "connecting":
      case "requesting":
        return "status-yellow";
      case "error":
        return "status-red";
      default:
        return "status-gray";
    }
  };

  return (
    <div className="status-panel">
      <h3>Status</h3>

      <div className="status-row">
        <span className="status-label">Camera:</span>
        <span className={`status-badge ${getStatusColor(state.cameraStatus)}`}>
          {state.cameraStatus}
        </span>
      </div>

      <div className="status-row">
        <span className="status-label">WebSocket:</span>
        <span className={`status-badge ${getStatusColor(state.connectionStatus)}`}>
          {state.connectionStatus}
        </span>
      </div>

      <div className="status-row">
        <span className="status-label">FPS:</span>
        <span className="status-value">{state.fps}</span>
      </div>

      <div className="status-row">
        <span className="status-label">Data Sent:</span>
        <span className="status-value">{formatBytes(state.bytesSent)}</span>
      </div>

      {state.lastError && (
        <div className="status-error">
          <span className="status-label">Error:</span>
          <span className="error-message">{state.lastError}</span>
        </div>
      )}
    </div>
  );
}
"use client";

import { CameraFeed, ControlPanel, StatusPanel } from "@/components";
import { useDashboardFrameSender } from "../_components/DashboardProvider";

export default function StreamPage() {
  const { videoRef, canvasRef, state, start, stop } = useDashboardFrameSender();

  return (
    <section className="dashboard-grid dashboard-grid-stream">
      <div className="dashboard-panel dashboard-video-panel">
        <div className="panel-heading">
          <h2>Live stream</h2>
          <p>Start the camera once, then keep using the same session across the dashboard.</p>
        </div>

        <CameraFeed ref={videoRef} status={state.cameraStatus} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      <aside className="dashboard-sidebar">
        <ControlPanel
          cameraStatus={state.cameraStatus}
          connectionStatus={state.connectionStatus}
          onStart={start}
          onStop={stop}
        />
        <StatusPanel state={state} />
      </aside>
    </section>
  );
}
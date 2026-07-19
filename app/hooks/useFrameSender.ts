"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { AppState, CameraConfig, WebSocketConfig } from "../types";
import { useCamera } from "./useCamera";
import { useWebSocket } from "./useWebSocket";
import { DEFAULT_CAMERA_CONFIG, DEFAULT_WS_CONFIG } from "../lib/config";

interface UseFrameSenderReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  state: AppState;
  start: () => Promise<void>;
  stop: () => void;
}

export function useFrameSender(
  cameraConfig: CameraConfig = DEFAULT_CAMERA_CONFIG,
  wsConfig: WebSocketConfig = DEFAULT_WS_CONFIG
): UseFrameSenderReturn {
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bytesSentRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const wsReadyRef = useRef(false);

  const [metrics, setMetrics] = useState({
    fps: 0,
    bytesSent: 0,
  });

  const camera = useCamera(cameraConfig);
  const ws = useWebSocket(wsConfig);

  useEffect(() => {
    wsReadyRef.current = ws.isReady;
  }, [ws.isReady]);

  const startFrameLoop = useCallback(() => {
    if (frameTimerRef.current) return;

    lastFpsTimeRef.current = performance.now();
    frameCountRef.current = 0;

    frameTimerRef.current = setInterval(() => {
      // KEY FIX: Only send if WebSocket is actually connected
      if (!wsReadyRef.current) {
        return;
      }

      const frameBytes = camera.captureFrame();
      if (!frameBytes) return;

      const sent = ws.send(frameBytes);
      if (sent) {
        bytesSentRef.current += frameBytes.length;
        frameCountRef.current++;
      }

      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setMetrics({
          fps: frameCountRef.current,
          bytesSent: bytesSentRef.current,
        });
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }
    }, wsConfig.frameInterval);
  }, [camera, ws, wsConfig.frameInterval]);

  const stopFrameLoop = useCallback(() => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    await camera.start();
    ws.connect();
    startFrameLoop();
  }, [camera, ws, startFrameLoop]);

  const stop = useCallback(() => {
    stopFrameLoop();
    camera.stop();
    ws.disconnect();
    
    bytesSentRef.current = 0;
    frameCountRef.current = 0;
    
    setMetrics({ fps: 0, bytesSent: 0 });
  }, [stopFrameLoop, camera, ws]);

  useEffect(() => {
    if (camera.status === "error") {
      stopFrameLoop();
    }
  }, [camera.status, stopFrameLoop]);

  useEffect(() => {
    return () => {
      stopFrameLoop();
    };
  }, [stopFrameLoop]);

  return {
    videoRef: camera.videoRef,
    canvasRef: camera.canvasRef,
    state: {
      cameraStatus: camera.status,
      connectionStatus: ws.status,
      fps: metrics.fps,
      bytesSent: metrics.bytesSent,
      lastError: camera.error || ws.error || null,
    },
    start,
    stop,
  };
}
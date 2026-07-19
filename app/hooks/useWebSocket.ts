"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ConnectionStatus, WebSocketConfig } from "@/types";
import { DEFAULT_WS_CONFIG } from "@/lib/config";

interface UseWebSocketReturn {
  status: ConnectionStatus;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  send: (data: Uint8Array) => boolean;
  isReady: boolean;
}

export function useWebSocket(config: WebSocketConfig = DEFAULT_WS_CONFIG): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const connectRef = useRef<() => void>(() => undefined);

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimer();
    reconnectCountRef.current = 0;

    if (wsRef.current) {
      const ws = wsRef.current;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    }

    setStatus("disconnected");
    setError(null);
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current) {
      const ws = wsRef.current;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      wsRef.current = null;
    }

    shouldReconnectRef.current = true;
    clearReconnectTimer();
    setError(null);
    setStatus("connecting");

    try {
      const ws = new WebSocket(config.url);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("[useWebSocket] Connected to", config.url);
        reconnectCountRef.current = 0;
        setStatus("connected");
        setError(null);
      };

      ws.onmessage = (event) => {
        console.log("[useWebSocket] Received:", event.data);
      };

      ws.onerror = (event) => {
        console.error("[useWebSocket] WebSocket error:", event);
      };

      ws.onclose = (event) => {
        console.log(`[useWebSocket] Closed (code: ${event.code}, clean: ${event.wasClean})`);
        wsRef.current = null;
        
        if (shouldReconnectRef.current && reconnectCountRef.current < config.maxReconnectAttempts) {
          reconnectCountRef.current++;
          console.log(
            `[useWebSocket] Will reconnect in ${config.reconnectInterval}ms... (attempt ${reconnectCountRef.current}/${config.maxReconnectAttempts})`
          );
          setStatus("connecting");
          
          reconnectTimerRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connectRef.current();
            }
          }, config.reconnectInterval);
        } else {
          setStatus("disconnected");
          if (!shouldReconnectRef.current) {
            setError(null);
          } else if (reconnectCountRef.current >= config.maxReconnectAttempts) {
            setError("Max reconnection attempts reached. Server may be down.");
          }
        }
      };

      wsRef.current = ws;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create WebSocket";
      setError(message);
      setStatus("error");
      console.error("[useWebSocket] Connection error:", err);
    }
  }, [config.url, config.reconnectInterval, config.maxReconnectAttempts, clearReconnectTimer]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const send = useCallback((data: Uint8Array): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const payload = new Uint8Array(data.byteLength);
      payload.set(data);
      ws.send(payload.buffer);
      return true;
    } catch (err) {
      console.error("[useWebSocket] Send error:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearReconnectTimer]);

  return {
    status,
    error,
    connect,
    disconnect,
    send,
    isReady: status === "connected",
  };
}
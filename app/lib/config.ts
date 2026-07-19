import { CameraConfig, WebSocketConfig } from "@/types";

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  width: 1280,
  height: 720,
  frameRate: 24,
  facingMode: "user",
};

const DEFAULT_WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "ws://localhost:8000/ws";

export const DEFAULT_WS_CONFIG: WebSocketConfig = {
  url: DEFAULT_WEBSOCKET_URL,
  reconnectInterval: 2000,
  maxReconnectAttempts: 10,
  frameInterval: 100,
};

export const JPEG_QUALITY = 0.8;

export const FACE_DETECTION_CONFIG = {
  minFaceSize: 40,
  embeddingDimensions: 456,
} as const;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const MEMBERS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_MEMBERS_TABLE ?? "members";
export const MEMBER_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_MEMBER_STORAGE_BUCKET ?? "member-faces";
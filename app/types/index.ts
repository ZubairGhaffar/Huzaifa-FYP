export interface CameraConfig {
  width: number;
  height: number;
  frameRate: number;
  facingMode: "user" | "environment";
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  frameInterval: number;
}

export interface FrameData {
  timestamp: number;
  imageData: Uint8Array;
  width: number;
  height: number;
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "paused"
  | "error";

export interface AppState {
  cameraStatus: CameraStatus;
  connectionStatus: ConnectionStatus;
  fps: number;
  bytesSent: number;
  lastError: string | null;
}

export interface Member {
  id: string;
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
  notes?: string;
  face_embedding: number[];
  face_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberInput {
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface FaceDetectionResult {
  detected: boolean;
  faceCount: number;
  faceBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  faceImageData?: ImageData;
}

export type MemberFormMode = "add" | "edit" | "view";

export interface MemberStoreState {
  members: Member[];
  isLoading: boolean;
  error: string | null;
}
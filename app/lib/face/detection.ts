// lib/face/detection.ts

import { FaceDetectionResult } from "../../types";
import { FACE_DETECTION_CONFIG } from "../config";

// Keep your existing detectFace function
export async function detectFace(
  videoElement: HTMLVideoElement
): Promise<FaceDetectionResult> {
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { detected: false, faceCount: 0 };
  }

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const faceRegions = findSkinRegions(imageData, canvas.width, canvas.height);

  if (faceRegions.length === 0) {
    return { detected: false, faceCount: 0 };
  }

  const largestFace = faceRegions.reduce((a, b) =>
    a.width * a.height > b.width * b.height ? a : b
  );

  if (
    largestFace.width < FACE_DETECTION_CONFIG.minFaceSize ||
    largestFace.height < FACE_DETECTION_CONFIG.minFaceSize
  ) {
    return { detected: false, faceCount: 0 };
  }

  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = largestFace.width;
  faceCanvas.height = largestFace.height;
  const faceCtx = faceCanvas.getContext("2d");
  if (!faceCtx) {
    return { detected: false, faceCount: 0 };
  }

  faceCtx.drawImage(
    canvas,
    largestFace.x,
    largestFace.y,
    largestFace.width,
    largestFace.height,
    0,
    0,
    largestFace.width,
    largestFace.height
  );

  const faceImageData = faceCtx.getImageData(
    0,
    0,
    largestFace.width,
    largestFace.height
  );

  return {
    detected: true,
    faceCount: faceRegions.length,
    faceBoundingBox: largestFace,
    faceImageData,
  };
}

// New function for detecting face from ImageData
export async function detectFaceFromImage(
  imageData: ImageData
): Promise<{
  detected: boolean;
  faceImageData?: ImageData;
  faceBoundingBox?: { x: number; y: number; width: number; height: number };
  faceCount?: number;
}> {
  try {
    const width = imageData.width;
    const height = imageData.height;
    
    // Use the same skin detection logic
    const faceRegions = findSkinRegions(imageData, width, height);

    if (faceRegions.length === 0) {
      return { detected: false, faceCount: 0 };
    }

    // Find the largest face region
    const largestFace = faceRegions.reduce((a, b) =>
      a.width * a.height > b.width * b.height ? a : b
    );

    // Check minimum face size
    if (
      largestFace.width < FACE_DETECTION_CONFIG.minFaceSize ||
      largestFace.height < FACE_DETECTION_CONFIG.minFaceSize
    ) {
      return { detected: false, faceCount: 0 };
    }

    // Crop the face from the image
    const faceImageData = cropFaceFromImageData(imageData, largestFace);

    return {
      detected: true,
      faceCount: faceRegions.length,
      faceBoundingBox: largestFace,
      faceImageData,
    };
  } catch (error) {
    console.error("Face detection error:", error);
    return { detected: false, faceCount: 0 };
  }
}

// Helper function to crop face from ImageData
function cropFaceFromImageData(
  imageData: ImageData,
  face: { x: number; y: number; width: number; height: number }
): ImageData {
  const { x, y, width, height } = face;
  
  // Create a canvas for the cropped face
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Create a temporary canvas with the full image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Failed to get temporary canvas context');
  }

  // Put the image data onto the temporary canvas
  tempCtx.putImageData(imageData, 0, 0);

  // Draw the cropped region onto the new canvas
  ctx.drawImage(
    tempCanvas,
    x, y, width, height,  // Source rectangle
    0, 0, width, height   // Destination rectangle
  );

  // Get the cropped image data
  return ctx.getImageData(0, 0, width, height);
}

// Export this function - it's already defined in your code
export function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, "image/jpeg", 0.9);
  });
}

// Export this function for loading images from files
export async function loadImageDataFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve(imageData);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  boundingBox: { x: number; y: number; width: number; height: number }
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 3;
  ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);

  const cornerLen = 20;
  ctx.beginPath();
  ctx.moveTo(boundingBox.x, boundingBox.y + cornerLen);
  ctx.lineTo(boundingBox.x, boundingBox.y);
  ctx.lineTo(boundingBox.x + cornerLen, boundingBox.y);
  ctx.moveTo(boundingBox.x + boundingBox.width - cornerLen, boundingBox.y);
  ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y);
  ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y + cornerLen);
  ctx.moveTo(
    boundingBox.x + boundingBox.width,
    boundingBox.y + boundingBox.height - cornerLen
  );
  ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height);
  ctx.lineTo(
    boundingBox.x + boundingBox.width - cornerLen,
    boundingBox.y + boundingBox.height
  );
  ctx.moveTo(boundingBox.x + cornerLen, boundingBox.y + boundingBox.height);
  ctx.lineTo(boundingBox.x, boundingBox.y + boundingBox.height);
  ctx.lineTo(boundingBox.x, boundingBox.y + boundingBox.height - cornerLen);
  ctx.stroke();
}

// All your existing helper functions
function findSkinRegions(
  imageData: ImageData,
  width: number,
  height: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const data = imageData.data;
  const skinMask = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const { h, s, v } = rgbToHsv(r, g, b);

    const isSkin =
      h >= 0 && h <= 50 && s >= 0.1 && s <= 0.7 && v >= 0.2 && v <= 1.0;

    const pixelIndex = i / 4;
    skinMask[pixelIndex] = isSkin ? 1 : 0;
  }

  return findConnectedComponents(skinMask, width, height);
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, v };
}

function findConnectedComponents(
  mask: Uint8Array,
  width: number,
  height: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const visited = new Uint8Array(width * height);
  const regions: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = y * width + x;
      if (mask[idx] && !visited[idx]) {
        const region = floodFill(mask, visited, x, y, width, height);
        if (region.width > 30 && region.height > 30) {
          regions.push(region);
        }
      }
    }
  }

  return regions;
}

function floodFill(
  mask: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  const stack: Array<[number, number]> = [[startX, startY]];
  let minX = startX,
    maxX = startX;
  let minY = startY,
    maxY = startY;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (!mask[idx] || visited[idx]) continue;

    visited[idx] = 1;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
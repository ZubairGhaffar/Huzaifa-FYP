import { FACE_DETECTION_CONFIG } from "../config";

export function generateFaceEmbedding(imageData: ImageData): number[] {
  const { width, height, data } = imageData;
  const embedding: number[] = [];

  const colorHist = computeColorHistogram(data);
  embedding.push(...colorHist);

  const gradHist = computeGradientHistogram(data, width, height);
  embedding.push(...gradHist);

  const spatialFeatures = computeSpatialFeatures(data, width, height);
  embedding.push(...spatialFeatures);

  const textureFeatures = computeTextureFeatures(data, width, height);
  embedding.push(...textureFeatures);

  const moments = computeStatisticalMoments(data);
  embedding.push(...moments);

  const edgeFeatures = computeEdgeFeatures(data, width, height);
  embedding.push(...edgeFeatures);

  const freqFeatures = computeFrequencyFeatures(data, width, height);
  embedding.push(...freqFeatures);

  const symmetryFeatures = computeSymmetryFeatures(data, width, height);
  embedding.push(...symmetryFeatures);

  const contrastFeatures = computeContrastFeatures(data, width, height);
  embedding.push(...contrastFeatures);

  const shapeFeatures = computeShapeFeatures(data, width, height);
  embedding.push(...shapeFeatures);

  const targetDim = FACE_DETECTION_CONFIG.embeddingDimensions;
  if (embedding.length < targetDim) {
    while (embedding.length < targetDim) {
      embedding.push(0);
    }
  } else if (embedding.length > targetDim) {
    embedding.length = targetDim;
  }

  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

function computeColorHistogram(data: Uint8ClampedArray): number[] {
  const rHist = new Array(16).fill(0);
  const gHist = new Array(16).fill(0);
  const bHist = new Array(16).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    rHist[Math.floor(data[i] / 16)]++;
    gHist[Math.floor(data[i + 1] / 16)]++;
    bHist[Math.floor(data[i + 2] / 16)]++;
  }

  const total = data.length / 4;
  return [...rHist, ...gHist, ...bHist].map((v) => v / total);
}

function computeGradientHistogram(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const bins = new Array(8).fill(0);
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const dx = gray[idx + 1] - gray[idx - 1];
      const dy = gray[idx + width] - gray[idx - width];
      const magnitude = Math.sqrt(dx * dx + dy * dy);

      if (magnitude > 10) {
        const angle = Math.atan2(dy, dx);
        const bin = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 8) % 8;
        bins[bin] += magnitude;
        count++;
      }
    }
  }

  if (count > 0) {
    return bins.map((v) => v / count);
  }
  return bins;
}

function computeSpatialFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const features: number[] = [];
  const regions = [
    { x: 0, y: 0, w: width / 2, h: height / 2 },
    { x: width / 2, y: 0, w: width / 2, h: height / 2 },
    { x: 0, y: height / 2, w: width / 2, h: height / 2 },
    { x: width / 2, y: height / 2, w: width / 2, h: height / 2 },
  ];

  for (const region of regions) {
    let rSum = 0,
      gSum = 0,
      bSum = 0,
      count = 0;
    for (let y = Math.floor(region.y); y < Math.floor(region.y + region.h); y++) {
      for (let x = Math.floor(region.x); x < Math.floor(region.x + region.w); x++) {
        const idx = (y * width + x) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        count++;
      }
    }
    if (count > 0) {
      features.push(rSum / count / 255, gSum / count / 255, bSum / count / 255);
    } else {
      features.push(0, 0, 0);
    }
  }

  while (features.length < 80) features.push(0);
  return features.slice(0, 80);
}

function computeTextureFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const lbp = new Array(64).fill(0);
  const gray = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.floor(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = gray[y * width + x];
      let pattern = 0;
      const neighbors = [
        gray[(y - 1) * width + (x - 1)],
        gray[(y - 1) * width + x],
        gray[(y - 1) * width + (x + 1)],
        gray[y * width + (x + 1)],
        gray[(y + 1) * width + (x + 1)],
        gray[(y + 1) * width + x],
        gray[(y + 1) * width + (x - 1)],
        gray[y * width + (x - 1)],
      ];

      for (let i = 0; i < 8; i++) {
        if (neighbors[i] >= center) {
          pattern |= 1 << i;
        }
      }

      lbp[pattern % 64]++;
    }
  }

  const total = lbp.reduce((a, b) => a + b, 0);
  if (total > 0) {
    return lbp.map((v) => v / total);
  }
  return lbp;
}

function computeStatisticalMoments(data: Uint8ClampedArray): number[] {
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  const variance = gray.reduce((sum, v) => sum + (v - mean) ** 2, 0) / gray.length;
  const std = Math.sqrt(variance);

  const skewness =
    gray.reduce((sum, v) => sum + ((v - mean) / std) ** 3, 0) / gray.length;
  const kurtosis =
    gray.reduce((sum, v) => sum + ((v - mean) / std) ** 4, 0) / gray.length;

  const rValues = [];
  const gValues = [];
  const bValues = [];
  for (let i = 0; i < data.length; i += 4) {
    rValues.push(data[i]);
    gValues.push(data[i + 1]);
    bValues.push(data[i + 2]);
  }

  const rMean = rValues.reduce((a, b) => a + b, 0) / rValues.length;
  const gMean = gValues.reduce((a, b) => a + b, 0) / gValues.length;
  const bMean = bValues.reduce((a, b) => a + b, 0) / bValues.length;

  let minGray = Infinity;
  let maxGray = -Infinity;
  for (const value of gray) {
    if (value < minGray) minGray = value;
    if (value > maxGray) maxGray = value;
  }

  const features = [
    mean / 255,
    std / 255,
    skewness,
    kurtosis / 10,
    rMean / 255,
    gMean / 255,
    bMean / 255,
    maxGray / 255,
    minGray / 255,
    (maxGray - minGray) / 255,
  ];

  while (features.length < 32) features.push(0);
  return features.slice(0, 32);
}

function computeEdgeFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const edges = new Array(64).fill(0);
  const regionsX = 8;
  const regionsY = 8;
  const regionW = width / regionsX;
  const regionH = height / regionsY;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const dx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const dy = Math.abs(gray[idx + width] - gray[idx - width]);
      const edgeStrength = dx + dy;

      const rx = Math.min(Math.floor(x / regionW), regionsX - 1);
      const ry = Math.min(Math.floor(y / regionH), regionsY - 1);
      edges[ry * regionsX + rx] += edgeStrength;
    }
  }

  const maxEdge = Math.max(...edges);
  if (maxEdge > 0) {
    return edges.map((v) => v / maxEdge);
  }
  return edges;
}

function computeFrequencyFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const blockSize = 8;
  const features: number[] = [];

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let sum = 0;
      let count = 0;
      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4;
          sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          count++;
        }
      }
      if (count > 0) {
        features.push(sum / count / 255);
      }
      if (features.length >= 64) break;
    }
    if (features.length >= 64) break;
  }

  while (features.length < 64) features.push(0);
  return features.slice(0, 64);
}

function computeSymmetryFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const features: number[] = [];
  const midX = Math.floor(width / 2);

  let vSym = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < midX; x++) {
      const leftIdx = (y * width + x) * 4;
      const rightIdx = (y * width + (width - 1 - x)) * 4;
      const diff =
        Math.abs(data[leftIdx] - data[rightIdx]) +
        Math.abs(data[leftIdx + 1] - data[rightIdx + 1]) +
        Math.abs(data[leftIdx + 2] - data[rightIdx + 2]);
      vSym += diff / 3 / 255;
      count++;
    }
  }
  features.push(count > 0 ? 1 - vSym / count : 0);

  const midY = Math.floor(height / 2);
  let hSym = 0;
  count = 0;
  for (let y = 0; y < midY; y++) {
    for (let x = 0; x < width; x++) {
      const topIdx = (y * width + x) * 4;
      const bottomIdx = ((height - 1 - y) * width + x) * 4;
      const diff =
        Math.abs(data[topIdx] - data[bottomIdx]) +
        Math.abs(data[topIdx + 1] - data[bottomIdx + 1]) +
        Math.abs(data[topIdx + 2] - data[bottomIdx + 2]);
      hSym += diff / 3 / 255;
      count++;
    }
  }
  features.push(count > 0 ? 1 - hSym / count : 0);

  const quadrants = [
    { x: 0, y: 0 },
    { x: midX, y: 0 },
    { x: 0, y: midY },
    { x: midX, y: midY },
  ];

  for (const q of quadrants) {
    let qSum = 0;
    let qCount = 0;
    for (let y = q.y; y < Math.min(q.y + midY, height); y++) {
      for (let x = q.x; x < Math.min(q.x + midX, width); x++) {
        const idx = (y * width + x) * 4;
        qSum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        qCount++;
      }
    }
    features.push(qCount > 0 ? qSum / qCount / 255 : 0);
  }

  while (features.length < 32) features.push(0);
  return features.slice(0, 32);
}

function computeContrastFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const features: number[] = [];
  const blockSize = 16;

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const values: number[] = [];
      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4;
          values.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
        }
      }

      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
        features.push(Math.sqrt(variance) / 255);
      }

      if (features.length >= 32) break;
    }
    if (features.length >= 32) break;
  }

  while (features.length < 32) features.push(0);
  return features.slice(0, 32);
}

function computeShapeFeatures(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const features: number[] = [];

  const threshold = 128;
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;
  let brightCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (brightness > threshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        brightCount++;
      }
    }
  }

  const brightWidth = maxX - minX + 1;
  const brightHeight = maxY - minY + 1;
  const aspectRatio = brightHeight > 0 ? brightWidth / brightHeight : 1;
  const areaRatio = width * height > 0 ? brightCount / (width * height) : 0;

  features.push(
    aspectRatio,
    areaRatio,
    brightWidth / width,
    brightHeight / height,
    minX / width,
    minY / height,
    maxX / width,
    maxY / height
  );

  let cx = 0,
    cy = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      cx += x * brightness;
      cy += y * brightness;
    }
  }
  features.push(cx / (width * height * 255), cy / (height * width * 255));

  while (features.length < 32) features.push(0);
  return features.slice(0, 32);
}
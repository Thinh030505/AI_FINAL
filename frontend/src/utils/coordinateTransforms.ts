import { SmartBBox } from '../types/smartCamera';

export interface DisplayTransform {
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  sourceWidth: number;
  sourceHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export interface DisplayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DisplayPoint {
  x: number;
  y: number;
}

/**
 * Computes exact letterbox / pillarbox scaling and offsets
 * for HTML5 <video> elements rendered with CSS `object-fit: contain`.
 */
export function getDisplayTransform(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number
): DisplayTransform {
  if (!sourceWidth || !sourceHeight || !containerWidth || !containerHeight) {
    return {
      renderWidth: containerWidth,
      renderHeight: containerHeight,
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      sourceWidth: Math.max(1, sourceWidth),
      sourceHeight: Math.max(1, sourceHeight),
      containerWidth,
      containerHeight,
    };
  }

  const containerRatio = containerWidth / containerHeight;
  const sourceRatio = sourceWidth / sourceHeight;

  let renderWidth = containerWidth;
  let renderHeight = containerHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (containerRatio > sourceRatio) {
    // Container is wider than video (pillarbox on left and right)
    renderWidth = containerHeight * sourceRatio;
    offsetX = (containerWidth - renderWidth) / 2.0;
  } else {
    // Container is taller than video (letterbox on top and bottom)
    renderHeight = containerWidth / sourceRatio;
    offsetY = (containerHeight - renderHeight) / 2.0;
  }

  return {
    renderWidth,
    renderHeight,
    offsetX,
    offsetY,
    scaleX: renderWidth / sourceWidth,
    scaleY: renderHeight / sourceHeight,
    sourceWidth,
    sourceHeight,
    containerWidth,
    containerHeight,
  };
}

/**
 * Converts a point (x, y) from Canonical Camera Coordinates (0 <= x <= sourceWidth)
 * to Display Viewport Coordinates (pixels within the container).
 */
export function cameraPointToDisplayPoint(
  x: number,
  y: number,
  transform: DisplayTransform,
  isMirrored: boolean
): DisplayPoint {
  const dispX = x * transform.scaleX + transform.offsetX;
  const dispY = y * transform.scaleY + transform.offsetY;

  return {
    x: isMirrored ? transform.containerWidth - dispX : dispX,
    y: dispY,
  };
}

/**
 * Converts a bounding box from Canonical Camera Coordinates to Display Rect,
 * accounting for scale, object-fit padding, and front-camera mirroring.
 */
export function cameraBBoxToDisplayBBox(
  bbox: SmartBBox,
  transform: DisplayTransform,
  isMirrored: boolean
): DisplayRect {
  const rawLeft = bbox.x1 * transform.scaleX + transform.offsetX;
  const rawRight = bbox.x2 * transform.scaleX + transform.offsetX;
  const top = bbox.y1 * transform.scaleY + transform.offsetY;
  const width = Math.max(12, (bbox.x2 - bbox.x1) * transform.scaleX);
  const height = Math.max(12, (bbox.y2 - bbox.y1) * transform.scaleY);

  let left = rawLeft;
  if (isMirrored) {
    left = transform.containerWidth - rawRight;
  }

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

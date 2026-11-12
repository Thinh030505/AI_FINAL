import { DetectionItem } from '../types';

export interface DisplayBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface SmallLabelLayoutItem {
  detectionIndex: number;
  detection: DetectionItem;
  displayBox: DisplayBox;
  x: number;
  y: number;
  width: number;
  height: number;
  hasConnector: boolean;
  connectorStart: { x: number; y: number };
  connectorEnd: { x: number; y: number };
}

export interface ExpandedCardLayoutItem {
  detectionIndex: number;
  detection: DetectionItem;
  displayBox: DisplayBox;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  side: 'left' | 'right' | 'top' | 'bottom';
  lineStart: { x: number; y: number };
  lineEnd: { x: number; y: number };
}

export interface CardLayoutItem {
  detectionIndex: number;
  detection: DetectionItem;
  displayBox: DisplayBox;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  side: 'left' | 'right' | 'top' | 'bottom';
  lineStart: { x: number; y: number };
  lineEnd: { x: number; y: number };
  isVisible: boolean;
}

export interface CardLayoutOptions {
  renderedWidth: number;
  renderedHeight: number;
  originalWidth: number;
  originalHeight: number;
  maxVisibleCards?: number;
  selectedIndex?: number | null;
  hoveredIndex?: number | null;
  showAllCards?: boolean;
}

/**
 * Calculates display bounding boxes in screen coordinate space
 */
export function calculateDisplayBoxes(
  detections: DetectionItem[],
  renderedWidth: number,
  renderedHeight: number,
  originalWidth: number,
  originalHeight: number
): DisplayBox[] {
  if (!detections || detections.length === 0 || !originalWidth || !originalHeight) {
    return [];
  }

  const scaleX = renderedWidth / originalWidth;
  const scaleY = renderedHeight / originalHeight;

  return detections.map((det) => {
    const x1 = Math.max(0, Math.min(renderedWidth, det.box.x1 * scaleX));
    const y1 = Math.max(0, Math.min(renderedHeight, det.box.y1 * scaleY));
    const x2 = Math.max(0, Math.min(renderedWidth, det.box.x2 * scaleX));
    const y2 = Math.max(0, Math.min(renderedHeight, det.box.y2 * scaleY));

    const width = Math.max(1, x2 - x1);
    const height = Math.max(1, y2 - y1);
    const centerX = x1 + width / 2;
    const centerY = y1 + height / 2;

    return {
      x1,
      y1,
      x2,
      y2,
      width,
      height,
      centerX,
      centerY,
    };
  });
}

/**
 * Computes non-overlapping, collision-mitigated layout for compact Small Object Labels
 * (height ~24px), placed near bounding boxes with short connector lines when displaced.
 */
export function computeSmallLabelLayout(
  detections: DetectionItem[],
  options: {
    renderedWidth: number;
    renderedHeight: number;
    originalWidth: number;
    originalHeight: number;
  }
): SmallLabelLayoutItem[] {
  const { renderedWidth, renderedHeight, originalWidth, originalHeight } = options;

  if (
    !detections ||
    detections.length === 0 ||
    !renderedWidth ||
    !renderedHeight ||
    !originalWidth ||
    !originalHeight
  ) {
    return [];
  }

  const LABEL_HEIGHT = 24;
  const MARGIN = 6;
  const displayBoxes = calculateDisplayBoxes(
    detections,
    renderedWidth,
    renderedHeight,
    originalWidth,
    originalHeight
  );

  // 1. Initial label placements
  const items: SmallLabelLayoutItem[] = detections.map((det, idx) => {
    const box = displayBoxes[idx];
    const text = det.vocabulary?.word || det.label;
    // Estimate width based on character length + padding + percentage badge
    const estWidth = Math.min(135, Math.max(68, Math.round(text.length * 6.5 + 46)));

    // Ideal placement: above bounding box top-left
    let initialX = box.x1;
    let initialY = box.y1 - LABEL_HEIGHT - 3;

    // If near top edge of image, place inside box or just below
    if (initialY < MARGIN) {
      if (box.height >= LABEL_HEIGHT + 8) {
        initialY = box.y1 + 4; // inside top edge of box
      } else {
        initialY = box.y2 + 3; // below box
      }
    }

    // Clamp horizontally inside container
    initialX = Math.max(MARGIN, Math.min(renderedWidth - estWidth - MARGIN, initialX));
    initialY = Math.max(MARGIN, Math.min(renderedHeight - LABEL_HEIGHT - MARGIN, initialY));

    const anchorPoint = {
      x: Math.max(box.x1, Math.min(box.x2, initialX + estWidth / 2)),
      y: initialY >= box.y1 && initialY <= box.y2 ? box.y1 : (initialY < box.y1 ? box.y1 : box.y2),
    };

    return {
      detectionIndex: idx,
      detection: det,
      displayBox: box,
      x: Math.round(initialX),
      y: Math.round(initialY),
      width: estWidth,
      height: LABEL_HEIGHT,
      hasConnector: false,
      connectorStart: { x: anchorPoint.x, y: anchorPoint.y },
      connectorEnd: { x: Math.round(initialX + estWidth / 2), y: Math.round(initialY + LABEL_HEIGHT / 2) },
    };
  });

  // 2. Multi-pass collision detection & vertical/horizontal mitigation
  const checkOverlap = (a: SmallLabelLayoutItem, b: SmallLabelLayoutItem) => {
    return (
      a.x < b.x + b.width + 4 &&
      a.x + a.width + 4 > b.x &&
      a.y < b.y + b.height + 4 &&
      a.y + a.height + 4 > b.y
    );
  };

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        if (checkOverlap(itemA, itemB)) {
          // Resolve overlap: push itemB down or right
          const shiftDown = itemA.y + itemA.height + 4;
          const shiftRight = itemA.x + itemA.width + 4;

          if (shiftDown + itemB.height <= renderedHeight - MARGIN) {
            itemB.y = shiftDown;
          } else if (shiftRight + itemB.width <= renderedWidth - MARGIN) {
            itemB.x = shiftRight;
          } else {
            // Push itemB upward if room above itemA
            const shiftUp = itemA.y - itemB.height - 4;
            if (shiftUp >= MARGIN) {
              itemB.y = shiftUp;
            }
          }

          // Ensure clamped
          itemB.x = Math.max(MARGIN, Math.min(renderedWidth - itemB.width - MARGIN, itemB.x));
          itemB.y = Math.max(MARGIN, Math.min(renderedHeight - itemB.height - MARGIN, itemB.y));
        }
      }
    }
  }

  // 3. Determine if connector is needed (if label displaced from box by > 16px)
  for (const item of items) {
    const box = item.displayBox;
    const labelCenterX = item.x + item.width / 2;
    const labelCenterY = item.y + item.height / 2;

    // Check if label intersects bounding box
    const insideBox =
      item.x >= box.x1 - 4 &&
      item.x + item.width <= box.x2 + 4 &&
      item.y >= box.y1 - 4 &&
      item.y + item.height <= box.y2 + 4;

    // Anchor point on the box closest to the label
    const closestBoxX = Math.max(box.x1, Math.min(box.x2, labelCenterX));
    const closestBoxY = Math.max(box.y1, Math.min(box.y2, labelCenterY));

    const dx = labelCenterX - closestBoxX;
    const dy = labelCenterY - closestBoxY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!insideBox && dist > 18) {
      item.hasConnector = true;
      item.connectorStart = { x: Math.round(closestBoxX), y: Math.round(closestBoxY) };
      item.connectorEnd = {
        x: Math.round(Math.max(item.x, Math.min(item.x + item.width, closestBoxX))),
        y: Math.round(labelCenterY < closestBoxY ? item.y + item.height : item.y),
      };
    } else {
      item.hasConnector = false;
    }
  }

  return items;
}

/**
 * Computes optimal, clutter-free position for the single expanded vocabulary detail card
 * when an object is selected. Placed in adjacent open space with SVG leader line.
 */
export function computeExpandedCardLayout(
  detection: DetectionItem,
  detectionIndex: number,
  options: {
    renderedWidth: number;
    renderedHeight: number;
    originalWidth: number;
    originalHeight: number;
  }
): ExpandedCardLayoutItem | null {
  const { renderedWidth, renderedHeight, originalWidth, originalHeight } = options;

  if (!detection || !renderedWidth || !renderedHeight || !originalWidth || !originalHeight) {
    return null;
  }

  const scaleX = renderedWidth / originalWidth;
  const scaleY = renderedHeight / originalHeight;

  const x1 = Math.max(0, Math.min(renderedWidth, detection.box.x1 * scaleX));
  const y1 = Math.max(0, Math.min(renderedHeight, detection.box.y1 * scaleY));
  const x2 = Math.max(0, Math.min(renderedWidth, detection.box.x2 * scaleX));
  const y2 = Math.max(0, Math.min(renderedHeight, detection.box.y2 * scaleY));

  const width = Math.max(1, x2 - x1);
  const height = Math.max(1, y2 - y1);
  const centerX = x1 + width / 2;
  const centerY = y1 + height / 2;

  const displayBox: DisplayBox = {
    x1,
    y1,
    x2,
    y2,
    width,
    height,
    centerX,
    centerY,
  };

  const CARD_WIDTH = Math.min(380, Math.max(290, Math.round(renderedWidth * 0.45)));
  const CARD_HEIGHT = 220;
  const GAP = 12;
  const MARGIN = 8;

  const spaceRight = renderedWidth - x2;
  const spaceLeft = x1;
  const spaceTop = y1;
  const spaceBottom = renderedHeight - y2;

  let side: 'left' | 'right' | 'top' | 'bottom' = 'right';
  let cardX = 0;
  let cardY = Math.max(MARGIN, Math.min(renderedHeight - CARD_HEIGHT - MARGIN, centerY - CARD_HEIGHT / 2));

  if (spaceRight >= CARD_WIDTH + GAP) {
    side = 'right';
    cardX = x2 + GAP;
  } else if (spaceLeft >= CARD_WIDTH + GAP) {
    side = 'left';
    cardX = x1 - GAP - CARD_WIDTH;
  } else if (spaceTop >= CARD_HEIGHT + GAP) {
    side = 'top';
    cardX = Math.max(MARGIN, Math.min(renderedWidth - CARD_WIDTH - MARGIN, centerX - CARD_WIDTH / 2));
    cardY = y1 - GAP - CARD_HEIGHT;
  } else if (spaceBottom >= CARD_HEIGHT + GAP) {
    side = 'bottom';
    cardX = Math.max(MARGIN, Math.min(renderedWidth - CARD_WIDTH - MARGIN, centerX - CARD_WIDTH / 2));
    cardY = y2 + GAP;
  } else {
    // Edge case: tightly bounded -> center in most spacious area
    side = spaceRight >= spaceLeft ? 'right' : 'left';
    cardX = side === 'right' ? Math.max(MARGIN, renderedWidth - CARD_WIDTH - MARGIN) : MARGIN;
    cardY = Math.max(MARGIN, Math.min(renderedHeight - CARD_HEIGHT - MARGIN, centerY - CARD_HEIGHT / 2));
  }

  // Ensure card coordinates are clamped within the container
  cardX = Math.max(MARGIN, Math.min(renderedWidth - CARD_WIDTH - MARGIN, cardX));
  cardY = Math.max(MARGIN, Math.min(renderedHeight - CARD_HEIGHT - MARGIN, cardY));

  // Determine line anchors
  let lineStart = { x: centerX, y: centerY };
  let lineEnd = { x: cardX, y: cardY + CARD_HEIGHT / 2 };

  if (side === 'right') {
    lineStart = { x: x2, y: centerY };
    lineEnd = { x: cardX, y: cardY + CARD_HEIGHT / 2 };
  } else if (side === 'left') {
    lineStart = { x: x1, y: centerY };
    lineEnd = { x: cardX + CARD_WIDTH, y: cardY + CARD_HEIGHT / 2 };
  } else if (side === 'top') {
    lineStart = { x: centerX, y: y1 };
    lineEnd = { x: cardX + CARD_WIDTH / 2, y: cardY + CARD_HEIGHT };
  } else if (side === 'bottom') {
    lineStart = { x: centerX, y: y2 };
    lineEnd = { x: cardX + CARD_WIDTH / 2, y: cardY };
  }

  return {
    detectionIndex,
    detection,
    displayBox,
    cardX: Math.round(cardX),
    cardY: Math.round(cardY),
    cardWidth: CARD_WIDTH,
    cardHeight: CARD_HEIGHT,
    side,
    lineStart: { x: Math.round(lineStart.x), y: Math.round(lineStart.y) },
    lineEnd: { x: Math.round(lineEnd.x), y: Math.round(lineEnd.y) },
  };
}

/**
 * Backward compatibility function for multi-card layout
 */
export function computeFloatingCardLayout(
  detections: DetectionItem[],
  options: CardLayoutOptions
): CardLayoutItem[] {
  const {
    renderedWidth,
    renderedHeight,
    originalWidth,
    originalHeight,
    maxVisibleCards = 4,
    selectedIndex = null,
    hoveredIndex = null,
    showAllCards = false,
  } = options;

  if (
    !detections ||
    detections.length === 0 ||
    !renderedWidth ||
    !renderedHeight ||
    !originalWidth ||
    !originalHeight
  ) {
    return [];
  }

  const CARD_WIDTH = Math.min(340, Math.max(260, Math.round(renderedWidth * 0.40)));
  const CARD_HEIGHT = 180;
  const GAP = 12;
  const MARGIN = 8;

  const displayBoxes = calculateDisplayBoxes(
    detections,
    renderedWidth,
    renderedHeight,
    originalWidth,
    originalHeight
  );

  const rawItems = detections.map((det, idx) => {
    const box = displayBoxes[idx];
    const spaceRight = renderedWidth - box.x2;
    const spaceLeft = box.x1;

    let side: 'left' | 'right' | 'top' | 'bottom' = 'right';
    let cardX = 0;
    let cardY = Math.max(MARGIN, Math.min(renderedHeight - CARD_HEIGHT - MARGIN, box.centerY - CARD_HEIGHT / 2));

    if (spaceRight >= CARD_WIDTH + GAP) {
      side = 'right';
      cardX = box.x2 + GAP;
    } else if (spaceLeft >= CARD_WIDTH + GAP) {
      side = 'left';
      cardX = box.x1 - GAP - CARD_WIDTH;
    } else {
      cardX = Math.max(MARGIN, Math.min(renderedWidth - CARD_WIDTH - MARGIN, box.x1 + (box.width - CARD_WIDTH) / 2));
      if (box.y1 >= CARD_HEIGHT + GAP) {
        side = 'top';
        cardY = box.y1 - GAP - CARD_HEIGHT;
      } else {
        side = 'bottom';
        cardY = Math.min(renderedHeight - CARD_HEIGHT - MARGIN, box.y2 + GAP);
      }
    }

    return {
      detectionIndex: idx,
      detection: det,
      displayBox: box,
      cardX: Math.round(cardX),
      cardY: Math.round(cardY),
      cardWidth: CARD_WIDTH,
      cardHeight: CARD_HEIGHT,
      side,
    };
  });

  const visibleIndices = new Set<number>();
  if (hoveredIndex !== null && hoveredIndex !== undefined && hoveredIndex >= 0) {
    visibleIndices.add(hoveredIndex);
  }
  if (selectedIndex !== null && selectedIndex !== undefined && selectedIndex >= 0) {
    visibleIndices.add(selectedIndex);
  }

  if (showAllCards) {
    for (let i = 0; i < rawItems.length; i++) {
      visibleIndices.add(i);
    }
  } else {
    const sortedByConfidence = rawItems
      .slice()
      .sort((a, b) => b.detection.confidence - a.detection.confidence);

    for (const item of sortedByConfidence) {
      if (visibleIndices.size >= maxVisibleCards) break;
      visibleIndices.add(item.detectionIndex);
    }
  }

  // Collision mitigation for visible cards on the same side
  const visibleItems = rawItems.filter((item) => visibleIndices.has(item.detectionIndex));

  const resolveSideCollisions = (itemsOnSide: typeof visibleItems) => {
    if (itemsOnSide.length <= 1) return;

    itemsOnSide.sort((a, b) => a.cardY - b.cardY);

    for (let i = 1; i < itemsOnSide.length; i++) {
      const prevBottom = itemsOnSide[i - 1].cardY + itemsOnSide[i - 1].cardHeight + MARGIN;
      if (itemsOnSide[i].cardY < prevBottom) {
        itemsOnSide[i].cardY = prevBottom;
      }
    }

    const maxBottom = renderedHeight - MARGIN;
    let overflow = itemsOnSide[itemsOnSide.length - 1].cardY + itemsOnSide[itemsOnSide.length - 1].cardHeight - maxBottom;

    if (overflow > 0) {
      for (let i = itemsOnSide.length - 1; i >= 0; i--) {
        itemsOnSide[i].cardY = Math.max(MARGIN, itemsOnSide[i].cardY - overflow);
        if (i > 0) {
          const neededSpace = itemsOnSide[i - 1].cardY + itemsOnSide[i - 1].cardHeight + MARGIN - itemsOnSide[i].cardY;
          if (neededSpace > 0) {
            overflow = neededSpace;
          } else {
            break;
          }
        }
      }
    }
  };

  resolveSideCollisions(visibleItems.filter((it) => it.side === 'right'));
  resolveSideCollisions(visibleItems.filter((it) => it.side === 'left'));

  const lookupMap = new Map<number, (typeof visibleItems)[0]>();
  for (const item of visibleItems) {
    lookupMap.set(item.detectionIndex, item);
  }

  return rawItems.map((raw) => {
    const isVisible = visibleIndices.has(raw.detectionIndex);
    const active = lookupMap.get(raw.detectionIndex) || raw;
    let lineStart = { x: active.displayBox.x2, y: active.displayBox.centerY };
    let lineEnd = { x: active.cardX, y: active.cardY + active.cardHeight / 2 };

    if (active.side === 'left') {
      lineStart = { x: active.displayBox.x1, y: active.displayBox.centerY };
      lineEnd = { x: active.cardX + active.cardWidth, y: active.cardY + active.cardHeight / 2 };
    }

    return {
      ...raw,
      cardX: active.cardX,
      cardY: active.cardY,
      lineStart,
      lineEnd,
      isVisible,
    };
  });
}

import {
  computeFloatingCardLayout,
  computeSmallLabelLayout,
  computeExpandedCardLayout,
  CardLayoutItem,
} from './src/utils/cardLayoutEngine';
import { DetectionItem } from './src/types';

interface LayoutTestCase {
  id: number;
  name: string;
  passed: boolean;
  message?: string;
}

const testResults: LayoutTestCase[] = [];

function assertLayout(id: number, name: string, condition: boolean, message?: string) {
  if (condition) {
    testResults.push({ id, name, passed: true });
    console.log(`  [PASS] Case ${id}: ${name}`);
  } else {
    testResults.push({ id, name, passed: false, message });
    console.error(`  [FAIL] Case ${id}: ${name} - ${message}`);
  }
}

console.log('='.repeat(75));
console.log('       PHASE 4 & 4.1: OBJECT LABELS & EXPANDED CARD LAYOUT TEST SUITE');
console.log('='.repeat(75));

// =========================================================================
// Case 1: Landscape image (e.g. 1920x1080 rendered at 800x450)
// =========================================================================
const landscapeDets: DetectionItem[] = [
  { classId: 2, label: 'car', confidence: 0.9, box: { x1: 200, y1: 200, x2: 600, y2: 500 } },
];
const resLandscape = computeFloatingCardLayout(landscapeDets, {
  renderedWidth: 800,
  renderedHeight: 450,
  originalWidth: 1920,
  originalHeight: 1080,
});

const case1Ok =
  resLandscape.length === 1 &&
  resLandscape[0].displayBox.width > 0 &&
  resLandscape[0].cardX > 0 &&
  resLandscape[0].cardY >= 8 &&
  resLandscape[0].cardX + resLandscape[0].cardWidth <= 800;

assertLayout(1, 'Landscape image: scale and coordinates calculated correctly within container', case1Ok);

// =========================================================================
// Case 2: Portrait image (e.g. 600x800 rendered at 450x600)
// =========================================================================
const portraitDets: DetectionItem[] = [
  { classId: 0, label: 'person', confidence: 0.95, box: { x1: 150, y1: 100, x2: 450, y2: 700 } },
];
const resPortrait = computeFloatingCardLayout(portraitDets, {
  renderedWidth: 450,
  renderedHeight: 600,
  originalWidth: 600,
  originalHeight: 800,
});

const case2Ok =
  resPortrait.length === 1 &&
  resPortrait[0].cardY >= 8 &&
  resPortrait[0].cardY + resPortrait[0].cardHeight <= 600;

assertLayout(2, 'Portrait image: vertical positioning and boundary clamping respected', case2Ok);

// =========================================================================
// Case 3: Object near right edge -> card flips to the left
// =========================================================================
const rightEdgeDet: DetectionItem[] = [
  { classId: 39, label: 'bottle', confidence: 0.88, box: { x1: 700, y1: 200, x2: 780, y2: 500 } },
];
const resRightEdge = computeFloatingCardLayout(rightEdgeDet, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 800,
  originalHeight: 600,
});

const case3Ok =
  resRightEdge.length === 1 &&
  resRightEdge[0].side === 'left' &&
  resRightEdge[0].cardX < resRightEdge[0].displayBox.x1;

assertLayout(3, 'Object near right edge of image -> card flips to the left side', case3Ok);

// =========================================================================
// Case 4: Object near left edge -> card stays on the right
// =========================================================================
const leftEdgeDet: DetectionItem[] = [
  { classId: 15, label: 'cat', confidence: 0.85, box: { x1: 20, y1: 200, x2: 120, y2: 400 } },
];
const resLeftEdge = computeFloatingCardLayout(leftEdgeDet, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 800,
  originalHeight: 600,
});

const case4Ok =
  resLeftEdge.length === 1 &&
  resLeftEdge[0].side === 'right' &&
  resLeftEdge[0].cardX > resLeftEdge[0].displayBox.x2;

assertLayout(4, 'Object near left edge of image -> card positions on the right side', case4Ok);

// =========================================================================
// Case 5: Multiple objects on the same side -> vertical collision resolution
// =========================================================================
const closeDets: DetectionItem[] = [
  { classId: 0, label: 'person', confidence: 0.9, box: { x1: 50, y1: 100, x2: 150, y2: 250 } },
  { classId: 0, label: 'person', confidence: 0.85, box: { x1: 60, y1: 150, x2: 160, y2: 300 } },
];
const resClose = computeFloatingCardLayout(closeDets, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 800,
  originalHeight: 600,
  showAllCards: true,
});

const case5Ok =
  resClose.length === 2 &&
  Math.abs(resClose[0].cardY - resClose[1].cardY) >= resClose[0].cardHeight;

assertLayout(5, 'Multiple overlapping objects -> vertical collision resolution prevents overlap', case5Ok);

// =========================================================================
// Case 6: Selection / Hover guarantees visibility in visibleCards
// =========================================================================
const manyDets: DetectionItem[] = [];
for (let i = 0; i < 10; i++) {
  manyDets.push({
    classId: i,
    label: `class_${i}`,
    confidence: 0.5 + i * 0.04,
    box: { x1: 50, y1: 40 * i, x2: 120, y2: 40 * i + 30 },
  });
}
const resSelected = computeFloatingCardLayout(manyDets, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 800,
  originalHeight: 600,
  maxVisibleCards: 4,
  selectedIndex: 0,
});

const item0 = resSelected.find((it) => it.detectionIndex === 0);
const case6Ok = item0 !== undefined && item0.isVisible === true;

assertLayout(6, 'High object count -> selected item is guaranteed visible despite confidence rank', case6Ok);

// =========================================================================
// Case 7: Leader lines anchors point correctly to bounding box and card
// =========================================================================
const sampleDet: DetectionItem[] = [
  { classId: 46, label: 'banana', confidence: 0.92, box: { x1: 100, y1: 100, x2: 200, y2: 200 } },
];
const resLine = computeFloatingCardLayout(sampleDet, {
  renderedWidth: 600,
  renderedHeight: 400,
  originalWidth: 600,
  originalHeight: 400,
});

const lineItem = resLine[0];
const case7Ok =
  lineItem !== undefined &&
  lineItem.lineStart.x === lineItem.displayBox.x2 &&
  lineItem.lineEnd.x === lineItem.cardX &&
  typeof lineItem.lineStart.y === 'number' &&
  typeof lineItem.lineEnd.y === 'number';

assertLayout(7, 'Leader line anchors computed with exact box and card connector points', case7Ok);

// =========================================================================
// PHASE 4.1 SPECIFIC TESTS
// =========================================================================

// Case 8: Small labels layout computes compact height (24px) within bounds
const smallLabels = computeSmallLabelLayout(sampleDet, {
  renderedWidth: 600,
  renderedHeight: 400,
  originalWidth: 600,
  originalHeight: 400,
});
const case8Ok =
  smallLabels.length === 1 &&
  smallLabels[0].height === 24 &&
  smallLabels[0].x >= 6 &&
  smallLabels[0].x + smallLabels[0].width <= 600 &&
  smallLabels[0].y >= 6 &&
  smallLabels[0].y + smallLabels[0].height <= 400;

assertLayout(8, 'Phase 4.1: computeSmallLabelLayout produces 24px height pill clamped in bounds', case8Ok);

// Case 9: Objects near top edge -> label does not overflow top (clamps >= 6px)
const topEdgeDet: DetectionItem[] = [
  { classId: 39, label: 'bottle', confidence: 0.85, box: { x1: 100, y1: 5, x2: 180, y2: 150 } },
];
const resTopEdge = computeSmallLabelLayout(topEdgeDet, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 800,
  originalHeight: 600,
});
const case9Ok =
  resTopEdge.length === 1 &&
  resTopEdge[0].y >= 6 &&
  resTopEdge[0].y <= 150;

assertLayout(9, 'Phase 4.1: Object near top edge of image -> label placed safely inside/below without negative Y', case9Ok);

// Case 10: 10+ dense objects with overlapping bounding boxes -> multi-pass collision resolution
const denseDets: DetectionItem[] = [];
for (let i = 0; i < 12; i++) {
  denseDets.push({
    classId: i % 5,
    label: `item_${i}`,
    confidence: 0.8,
    box: { x1: 100 + (i % 3) * 15, y1: 100 + Math.floor(i / 3) * 15, x2: 180, y2: 200 },
  });
}
const resDense = computeSmallLabelLayout(denseDets, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 800,
  originalHeight: 600,
});

let anyOverlap = false;
for (let i = 0; i < resDense.length; i++) {
  for (let j = i + 1; j < resDense.length; j++) {
    const a = resDense[i];
    const b = resDense[j];
    if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
      anyOverlap = true;
      break;
    }
  }
}
const case10Ok = resDense.length === 12 && !anyOverlap;
assertLayout(10, 'Phase 4.1: 12 dense overlapping objects -> multi-pass collision mitigates overlap', case10Ok);

// Case 11: Single expanded detail card placement when selected
const singleSelected = computeExpandedCardLayout(sampleDet[0], 0, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 600,
  originalHeight: 400,
});
const case11Ok =
  singleSelected !== null &&
  singleSelected.cardWidth >= 180 &&
  singleSelected.cardHeight >= 100 &&
  singleSelected.cardX + singleSelected.cardWidth <= 800 &&
  singleSelected.cardY + singleSelected.cardHeight <= 600 &&
  typeof singleSelected.lineStart.x === 'number' &&
  typeof singleSelected.lineEnd.x === 'number';

assertLayout(11, 'Phase 4.1: computeExpandedCardLayout positions single card with leader curve', case11Ok);

// Case 12: Selected object near right edge -> card flips to left
const selectedRight = computeExpandedCardLayout(rightEdgeDet[0], 0, {
  renderedWidth: 800,
  renderedHeight: 600,
  originalWidth: 800,
  originalHeight: 600,
});
const case12Ok =
  selectedRight !== null &&
  selectedRight.side === 'left' &&
  selectedRight.cardX < selectedRight.displayBox.x1;

assertLayout(12, 'Phase 4.1: Selected object near right edge -> expanded card flips to left', case12Ok);

console.log('='.repeat(75));
const totalPassed = testResults.filter((r) => r.passed).length;
console.log(`TOTAL PHASE 4 & 4.1 LAYOUT TESTS: ${testResults.length} | PASSED: ${totalPassed} | FAILED: ${testResults.length - totalPassed}`);
console.log('='.repeat(75));

if (totalPassed === testResults.length) {
  console.log('[SUCCESS] All Phase 4 & 4.1 layout engine tests PASSED flawlessly!');
  process.exit(0);
} else {
  console.error('[FAILURE] Some Phase 4/4.1 layout tests failed.');
  process.exit(1);
}

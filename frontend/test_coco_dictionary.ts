import {
  COCO_VOCABULARY_LIST,
  COCO_DICTIONARY_BY_ID,
  COCO_DICTIONARY_BY_LABEL,
  getVocabularyByClassId,
  getVocabularyByLabel,
  getVocabulary,
} from './src/data/cocoDictionary';
import { CocoVocabularyItem } from './src/types/vocabulary';

// Exact 80 COCO classes from Ultralytics YOLO11m (best.pt)
const EXPECTED_COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard',
  'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
  'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureMessage: string) {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`  [PASS] ${testName}`);
  } else {
    results.push({ name: testName, passed: false, message: failureMessage });
    console.error(`  [FAIL] ${testName}: ${failureMessage}`);
  }
}

console.log('='.repeat(70));
console.log('      COCO 80 VOCABULARY DICTIONARY AUTOMATED VALIDATION SUITE');
console.log('='.repeat(70));

// Test 1: Total items count
assert(
  COCO_VOCABULARY_LIST.length === 80,
  'Dictionary length is exactly 80',
  `Expected 80 items, got ${COCO_VOCABULARY_LIST.length}`
);

// Test 2: Continuous classId 0..79 with no duplicates
const seenIds = new Set<number>();
let idSequenceValid = true;
let idSeqError = '';

for (let i = 0; i < 80; i++) {
  const item = COCO_VOCABULARY_LIST[i];
  if (!item) {
    idSequenceValid = false;
    idSeqError = `Missing item at index ${i}`;
    break;
  }
  if (item.classId !== i) {
    idSequenceValid = false;
    idSeqError = `Item at index ${i} has classId ${item.classId}, expected ${i}`;
    break;
  }
  if (seenIds.has(item.classId)) {
    idSequenceValid = false;
    idSeqError = `Duplicate classId ${item.classId} encountered`;
    break;
  }
  seenIds.add(item.classId);
}

assert(
  idSequenceValid && seenIds.size === 80,
  'All 80 class IDs are contiguous from 0 to 79 without gaps or duplicates',
  idSeqError
);

// Test 3: Labels strictly match YOLO11m model classes
let labelsMatch = true;
let labelMismatchInfo = '';

for (let i = 0; i < 80; i++) {
  const item = COCO_VOCABULARY_LIST[i];
  const expectedLabel = EXPECTED_COCO_CLASSES[i];
  if (item.label !== expectedLabel) {
    labelsMatch = false;
    labelMismatchInfo = `Class ${i}: expected '${expectedLabel}', got '${item.label}'`;
    break;
  }
}

assert(
  labelsMatch,
  'All 80 labels exactly match Ultralytics YOLO11m best.pt class names',
  labelMismatchInfo
);

// Test 4: Required fields completeness (no empty / whitespace-only)
const requiredFields: (keyof CocoVocabularyItem)[] = [
  'classId',
  'label',
  'word',
  'ipa',
  'vietnamese',
  'partOfSpeech',
  'exampleEn',
  'exampleVi',
];

let allFieldsNonEmpty = true;
let emptyFieldInfo = '';

for (const item of COCO_VOCABULARY_LIST) {
  for (const field of requiredFields) {
    const val = item[field];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      allFieldsNonEmpty = false;
      emptyFieldInfo = `Class ${item.classId} (${item.label}) has empty field '${field}'`;
      break;
    }
  }
  if (!allFieldsNonEmpty) break;
}

assert(
  allFieldsNonEmpty,
  'All 8 required fields in every item are non-empty and well-formed',
  emptyFieldInfo
);

// Test 5: Verify no placeholder values in IPA, examples, translations
const placeholderRegex = /TODO|N\/A|placeholder|undefined|null/i;
let noPlaceholders = true;
let placeholderInfo = '';

for (const item of COCO_VOCABULARY_LIST) {
  // IPA validation: must start and end with /
  if (!item.ipa.startsWith('/') || !item.ipa.endsWith('/')) {
    noPlaceholders = false;
    placeholderInfo = `Class ${item.classId} IPA '${item.ipa}' must be enclosed in slashes /.../`;
    break;
  }

  // IPA must not just be English word
  if (item.ipa.replace(/[\/ˈˌ]/g, '').trim().toLowerCase() === item.word.toLowerCase() && item.word.length > 3) {
    noPlaceholders = false;
    placeholderInfo = `Class ${item.classId} IPA '${item.ipa}' is merely copy of English word`;
    break;
  }

  // Check placeholder keywords in any text field
  const texts = [item.ipa, item.vietnamese, item.exampleEn, item.exampleVi];
  for (const t of texts) {
    if (placeholderRegex.test(t)) {
      noPlaceholders = false;
      placeholderInfo = `Class ${item.classId} text contains placeholder keyword: '${t}'`;
      break;
    }
  }
  if (!noPlaceholders) break;
}

assert(
  noPlaceholders,
  'No placeholder texts or copy-pasted English found in IPA, examples, or translations',
  placeholderInfo
);

// Test 6: Verify special multi-word COCO labels
const specialLabels = ['sports ball', 'dining table', 'potted plant', 'cell phone', 'hair drier'];
let specialLabelsPreserved = true;
let specialLabelInfo = '';

for (const spec of specialLabels) {
  const found = COCO_DICTIONARY_BY_LABEL[spec];
  if (!found) {
    specialLabelsPreserved = false;
    specialLabelInfo = `Missing special COCO label '${spec}' in dictionary by label`;
    break;
  }
  if (found.label !== spec) {
    specialLabelsPreserved = false;
    specialLabelInfo = `Label mismatch for '${spec}': got '${found.label}'`;
    break;
  }
}

assert(
  specialLabelsPreserved,
  'Special multi-word COCO labels (hair drier, cell phone, etc.) are strictly preserved',
  specialLabelInfo
);

// Test 7: In-memory O(1) lookup functionality by classId and label
let lookupSuccess = true;
let lookupError = '';

// Test lookup by classId
for (let id = 0; id < 80; id++) {
  const itemById = getVocabularyByClassId(id);
  if (!itemById || itemById.classId !== id) {
    lookupSuccess = false;
    lookupError = `getVocabularyByClassId(${id}) failed`;
    break;
  }
}

// Test lookup by label (case-insensitive & trimmed)
if (lookupSuccess) {
  for (const label of EXPECTED_COCO_CLASSES) {
    const itemByLabel = getVocabularyByLabel(label.toUpperCase());
    if (!itemByLabel || itemByLabel.label !== label) {
      lookupSuccess = false;
      lookupError = `getVocabularyByLabel('${label}') case-insensitive lookup failed`;
      break;
    }
  }
}

// Test universal getVocabulary
if (lookupSuccess) {
  const item1 = getVocabulary(0);
  const item2 = getVocabulary('person');
  const item3 = getVocabulary('  PERSON  ');
  const itemOut = getVocabulary(999);
  const itemOutStr = getVocabulary('unknown_object');

  if (!item1 || item1.label !== 'person' || !item2 || item2.classId !== 0 || !item3 || item3.classId !== 0) {
    lookupSuccess = false;
    lookupError = 'Universal getVocabulary() failed on valid input';
  } else if (itemOut !== undefined || itemOutStr !== undefined) {
    lookupSuccess = false;
    lookupError = 'Universal getVocabulary() should return undefined for out-of-bounds queries';
  }
}

assert(
  lookupSuccess,
  'Fast in-memory lookup by classId, case-insensitive label, and universal getVocabulary works correctly',
  lookupError
);

// Test 8: Benchmark lookup performance
const benchmarkStart = performance.now();
const LOOKUP_ITERATIONS = 50000;
for (let i = 0; i < LOOKUP_ITERATIONS; i++) {
  const id = i % 80;
  getVocabularyByClassId(id);
  getVocabularyByLabel(EXPECTED_COCO_CLASSES[id]);
}
const benchmarkDurationMs = performance.now() - benchmarkStart;
const avgLookupNs = (benchmarkDurationMs * 1_000_000) / (LOOKUP_ITERATIONS * 2);

assert(
  benchmarkDurationMs < 100, // 100k lookups in < 100ms
  `Lookup performance benchmark: 100,000 lookups completed in ${benchmarkDurationMs.toFixed(2)}ms (${avgLookupNs.toFixed(1)}ns/op)`,
  `Benchmark took too long: ${benchmarkDurationMs}ms`
);

console.log('='.repeat(70));
const totalPassed = results.filter((r) => r.passed).length;
console.log(`TOTAL TESTS: ${results.length} | PASSED: ${totalPassed} | FAILED: ${results.length - totalPassed}`);
console.log('='.repeat(70));

if (totalPassed === results.length) {
  console.log('[SUCCESS] All Phase 2 automated test assertions passed flawlessly!');
  process.exit(0);
} else {
  console.error('[FAILURE] Some test assertions failed.');
  process.exit(1);
}

import {
  enrichDetectionWithVocabulary,
  enrichDetectionRecord,
  EnrichedDetectionItem,
  EnrichedObjectDetectionRecord,
} from './src/utils/vocabularyEnricher';
import { DetectionItem, ObjectDetectionRecord } from './src/types';

interface TestCaseResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestCaseResult[] = [];

function assertTest(id: number, name: string, condition: boolean, details?: string) {
  if (condition) {
    results.push({ id, name, passed: true });
    console.log(`  [PASS] Case ${id}: ${name}`);
  } else {
    results.push({ id, name, passed: false, details });
    console.error(`  [FAIL] Case ${id}: ${name} - Details: ${details}`);
  }
}

console.log('='.repeat(75));
console.log('     PHASE 3: YOLO11m DETECTION & VOCABULARY INTEGRATION TEST SUITE');
console.log('='.repeat(75));

// =========================================================================
// Case 1: Detection có classId hợp lệ -> gắn đúng từ vựng
// =========================================================================
const det1: DetectionItem = {
  classId: 0,
  label: 'person',
  confidence: 0.942,
  box: { x1: 10, y1: 20, x2: 100, y2: 200 },
};
const res1 = enrichDetectionWithVocabulary(det1);

const case1Passed =
  res1 !== undefined &&
  res1.vocabulary !== undefined &&
  res1.vocabulary.classId === 0 &&
  res1.vocabulary.label === 'person' &&
  res1.vocabulary.word === 'Person' &&
  res1.vocabulary.ipa === '/ˈpɜːrsn/' &&
  res1.vocabulary.vietnamese === 'người' &&
  res1.vocabulary.partOfSpeech === 'noun' &&
  typeof res1.vocabulary.exampleEn === 'string' &&
  res1.vocabulary.exampleEn.length > 5 &&
  typeof res1.vocabulary.exampleVi === 'string' &&
  res1.vocabulary.exampleVi.length > 5;

assertTest(1, 'Detection có classId hợp lệ (0: person) -> gắn đúng trọn bộ từ vựng', case1Passed);

// =========================================================================
// Case 2: Nhiều vật thể cùng một lớp -> mỗi vật thể giữ box và confidence riêng
// =========================================================================
const det2A: DetectionItem = {
  classId: 2,
  label: 'car',
  confidence: 0.88,
  box: { x1: 50, y1: 100, x2: 150, y2: 180 },
};
const det2B: DetectionItem = {
  classId: 2,
  label: 'car',
  confidence: 0.72,
  box: { x1: 300, y1: 400, x2: 450, y2: 520 },
};

const res2A = enrichDetectionWithVocabulary(det2A);
const res2B = enrichDetectionWithVocabulary(det2B);

const case2Passed =
  res2A.vocabulary?.classId === 2 &&
  res2B.vocabulary?.classId === 2 &&
  res2A.confidence === 0.88 &&
  res2B.confidence === 0.72 &&
  res2A.box.x1 === 50 &&
  res2B.box.x1 === 300 &&
  res2A.box !== res2B.box &&
  res2A !== res2B;

assertTest(
  2,
  'Nhiều vật thể cùng một lớp (car) -> mỗi vật thể giữ nguyên box và confidence riêng biệt',
  case2Passed
);

// =========================================================================
// Case 3: Detection có nhãn nhiều từ (traffic light, cell phone, hair drier) -> tra cứu đúng
// =========================================================================
const multiWordItems: DetectionItem[] = [
  { classId: 9, label: 'traffic light', confidence: 0.85, box: { x1: 0, y1: 0, x2: 10, y2: 10 } },
  { classId: 67, label: 'cell phone', confidence: 0.91, box: { x1: 0, y1: 0, x2: 10, y2: 10 } },
  { classId: 78, label: 'hair drier', confidence: 0.79, box: { x1: 0, y1: 0, x2: 10, y2: 10 } },
];

const resMulti = multiWordItems.map(enrichDetectionWithVocabulary);
const case3Passed =
  resMulti[0].vocabulary?.word === 'Traffic light' &&
  resMulti[0].vocabulary?.ipa === '/ˈtræfɪk laɪt/' &&
  resMulti[1].vocabulary?.word === 'Cell phone' &&
  resMulti[1].vocabulary?.ipa === '/ˈsel foʊn/' &&
  resMulti[2].vocabulary?.word === 'Hair drier' &&
  resMulti[2].vocabulary?.ipa === '/ˈher ˌdraɪər/';

assertTest(
  3,
  'Detection có nhãn nhiều từ (traffic light, cell phone, hair drier) -> tra cứu chính xác',
  case3Passed
);

// =========================================================================
// Case 4: Detection không có classId (hoặc -1) nhưng có label -> tra cứu dự phòng thành công
// =========================================================================
const detNoId: DetectionItem = {
  classId: -1,
  label: '  DINING TABLE  ',
  confidence: 0.65,
  box: { x1: 20, y1: 20, x2: 80, y2: 80 },
};
const resNoId = enrichDetectionWithVocabulary(detNoId);

const case4Passed =
  resNoId.vocabulary !== undefined &&
  resNoId.vocabulary.classId === 60 &&
  resNoId.vocabulary.word === 'Dining table' &&
  resNoId.vocabulary.vietnamese === 'bàn ăn';

assertTest(
  4,
  'Detection không có classId hợp lệ nhưng có label -> kích hoạt fallback tra cứu theo label thành công',
  case4Passed
);

// =========================================================================
// Case 5: Không tìm thấy từ điển (vật thể ngoài COCO) -> vẫn giữ nguyên kết quả YOLO gốc
// =========================================================================
const detUnknown: DetectionItem = {
  classId: 999,
  label: 'alien_spaceship',
  confidence: 0.99,
  box: { x1: 100, y1: 200, x2: 300, y2: 400 },
};
const resUnknown = enrichDetectionWithVocabulary(detUnknown);

const case5Passed =
  resUnknown.classId === 999 &&
  resUnknown.label === 'alien_spaceship' &&
  resUnknown.confidence === 0.99 &&
  resUnknown.box.x1 === 100 &&
  resUnknown.box.y2 === 400 &&
  resUnknown.vocabulary === undefined;

assertTest(
  5,
  'Không tìm thấy từ điển (nhãn ngoài 80 COCO) -> vẫn bảo toàn 100% kết quả YOLO và gán vocabulary = undefined',
  case5Passed
);

// =========================================================================
// Case 6: Không có vật thể được phát hiện (empty detections) -> không bị lỗi hay crash
// =========================================================================
const emptyRecord: ObjectDetectionRecord = {
  id: 'test_rec_0',
  imageId: 'img_test_0',
  model: 'yolo11m',
  imageWidth: 640,
  imageHeight: 480,
  objectCount: 0,
  processingTimeMs: 185,
  detections: [],
};

const resEmpty = enrichDetectionRecord(emptyRecord);
const resNull = enrichDetectionRecord(null);
const resUndefined = enrichDetectionRecord(undefined);

const case6Passed =
  resEmpty !== null &&
  resEmpty.detections.length === 0 &&
  resEmpty.objectCount === 0 &&
  resEmpty.processingTimeMs === 185 &&
  resNull === null &&
  resUndefined === null;

assertTest(
  6,
  'Không có vật thể được phát hiện (hoặc record null/undefined) -> xử lý an toàn không văng lỗi',
  case6Passed
);

// =========================================================================
// Case 7: Kết quả nhận diện không bị thay đổi ngoài phần từ vựng bổ sung (Tính bất biến)
// =========================================================================
const originalRecord: ObjectDetectionRecord = {
  id: 'orig_record_123',
  imageId: 'img_abc_456',
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  originalName: 'street.jpg',
  model: 'yolo11m',
  imageWidth: 800,
  imageHeight: 600,
  objectCount: 2,
  processingTimeMs: 215,
  detections: [
    { classId: 2, label: 'car', confidence: 0.8571, box: { x1: 10.5, y1: 20.2, x2: 150.8, y2: 90.4 } },
    { classId: 5, label: 'bus', confidence: 0.8012, box: { x1: 200.0, y1: 150.0, x2: 450.0, y2: 380.0 } },
  ],
};

const enrichedRec = enrichDetectionRecord(originalRecord);

// Verify immutability of originalRecord
const case7Passed =
  enrichedRec !== null &&
  // Original record untouched:
  (originalRecord.detections[0] as any).vocabulary === undefined &&
  // Top-level properties preserved exactly:
  enrichedRec.id === originalRecord.id &&
  enrichedRec.imageId === originalRecord.imageId &&
  enrichedRec.imageUrl === originalRecord.imageUrl &&
  enrichedRec.originalName === originalRecord.originalName &&
  enrichedRec.model === originalRecord.model &&
  enrichedRec.imageWidth === originalRecord.imageWidth &&
  enrichedRec.imageHeight === originalRecord.imageHeight &&
  enrichedRec.objectCount === originalRecord.objectCount &&
  enrichedRec.processingTimeMs === originalRecord.processingTimeMs &&
  // Detections counts match:
  enrichedRec.detections.length === originalRecord.detections.length &&
  // Detections properties preserved:
  enrichedRec.detections[0].classId === 2 &&
  enrichedRec.detections[0].label === 'car' &&
  enrichedRec.detections[0].confidence === 0.8571 &&
  enrichedRec.detections[0].box.x1 === 10.5 &&
  enrichedRec.detections[0].vocabulary?.word === 'Car' &&
  enrichedRec.detections[1].classId === 5 &&
  enrichedRec.detections[1].label === 'bus' &&
  enrichedRec.detections[1].confidence === 0.8012 &&
  enrichedRec.detections[1].box.x2 === 450.0 &&
  enrichedRec.detections[1].vocabulary?.word === 'Bus';

assertTest(
  7,
  'Tính bất biến: Giữ nguyên vẹn 100% metadata, box, confidence của YOLO, chỉ bổ sung trường vocabulary',
  case7Passed
);

console.log('='.repeat(75));
const totalPassed = results.filter((r) => r.passed).length;
console.log(`TOTAL PHASE 3 INTEGRATION TESTS: ${results.length} | PASSED: ${totalPassed} | FAILED: ${results.length - totalPassed}`);
console.log('='.repeat(75));

if (totalPassed === results.length) {
  console.log('[SUCCESS] All 7 Phase 3 test cases PASSED flawlessly!');
  process.exit(0);
} else {
  console.error('[FAILURE] Some Phase 3 test cases failed.');
  process.exit(1);
}

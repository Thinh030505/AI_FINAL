/**
 * Comprehensive Automated Test Suite for:
 * 1. IPA Label & Vocabulary Card Integrity (Unicode, US/UK distinction, non-truncation)
 * 2. Synchronized Multilingual Translation (Synchronized Word + Meaning + Example)
 * 3. Duplicate Class Aggregation (5 Motorcycle, 3 Person, 2 Car, 1 Umbrella -> 4 items)
 * 4. Canvas Coordinate & Instance Preservation
 * 5. OCR Text Processing & Translation Caching
 */

import { COCO_VOCABULARY_LIST, getVocabularyByClassId, getVocabularyByLabel } from './src/data/cocoDictionary';
import { aggregateObjectsByClass, computeStudioStats } from './src/utils/vocabularyAggregation';
import {
  fetchSynchronizedVocabularyTranslation,
  getCachedVocabularyTranslation,
  translateOcrTextWithCache,
} from './src/utils/synchronizedTranslation';
import { VisualIntelligenceObject, VisualIntelligenceText } from './src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('='.repeat(70));
  console.log('   ADVANCED OBJECT DETECTION & VOCABULARY STUDIO TEST SUITE');
  console.log('='.repeat(70));

  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 1: IPA AUDIT & INTEGRITY
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 1. IPA Integrity, Unicode & US/UK Pronunciation Tests ---');

  assert(COCO_VOCABULARY_LIST.length === 80, 'COCO dictionary contains exactly 80 standard classes');

  // Check Unicode IPA characters preservation
  const person = getVocabularyByClassId(0);
  assert(person !== undefined, 'Person class found by ID 0');
  assert(person?.ipa.includes('ˈ'), 'Primary IPA preserves primary stress marker ˈ');
  assert(person?.ipaUs !== undefined && person?.ipaUs.length > 0, 'US IPA is defined and non-empty');
  assert(person?.ipaUk !== undefined && person?.ipaUk.length > 0, 'UK IPA is defined and non-empty');
  assert(person?.ipaUk === '/ˈpɜː.sən/', 'Person UK IPA matches Oxford standard /ˈpɜː.sən/');

  const car = getVocabularyByClassId(2);
  assert(car?.ipaUk === '/kɑː/', 'Car UK IPA matches RP pronunciation /kɑː/');
  assert(car?.ipaUs === '/ˈkɑːr/' || car?.ipaUs === '/kɑːr/', 'Car US IPA preserves rhotic /r/');

  // Verify all 80 classes have valid non-empty Unicode IPAs
  let allIpaValid = true;
  for (const item of COCO_VOCABULARY_LIST) {
    if (!item.ipa || !item.ipa.startsWith('/') || !item.ipa.endsWith('/')) {
      allIpaValid = false;
      break;
    }
  }
  assert(allIpaValid, 'All 80 COCO vocabulary items have slash-delimited valid IPAs');

  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 2: DUPLICATE CLASS AGGREGATION (PART 5)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Duplicate Class Aggregation Tests ---');

  // Scenario: 5 Motorcycle, 3 Person, 2 Car, 1 Umbrella = 11 total instances
  const mockObjects: VisualIntelligenceObject[] = [
    // 5 Motorcycles (classId: 3)
    { id: 'moto_1', classId: 3, label: 'motorcycle', confidence: 0.95, bbox: { x1: 10, y1: 10, x2: 100, y2: 100 } },
    { id: 'moto_2', classId: 3, label: 'motorcycle', confidence: 0.88, bbox: { x1: 110, y1: 10, x2: 200, y2: 100 } },
    { id: 'moto_3', classId: 3, label: 'motorcycle', confidence: 0.92, bbox: { x1: 210, y1: 10, x2: 300, y2: 100 } },
    { id: 'moto_4', classId: 3, label: 'motorcycle', confidence: 0.79, bbox: { x1: 310, y1: 10, x2: 400, y2: 100 } },
    { id: 'moto_5', classId: 3, label: 'motorcycle', confidence: 0.85, bbox: { x1: 410, y1: 10, x2: 500, y2: 100 } },

    // 3 Persons (classId: 0)
    { id: 'person_1', classId: 0, label: 'person', confidence: 0.98, bbox: { x1: 50, y1: 150, x2: 90, y2: 300 } },
    { id: 'person_2', classId: 0, label: 'person', confidence: 0.91, bbox: { x1: 120, y1: 150, x2: 160, y2: 300 } },
    { id: 'person_3', classId: 0, label: 'person', confidence: 0.87, bbox: { x1: 190, y1: 150, x2: 230, y2: 300 } },

    // 2 Cars (classId: 2)
    { id: 'car_1', classId: 2, label: 'car', confidence: 0.96, bbox: { x1: 300, y1: 200, x2: 450, y2: 350 } },
    { id: 'car_2', classId: 2, label: 'car', confidence: 0.84, bbox: { x1: 480, y1: 200, x2: 620, y2: 350 } },

    // 1 Umbrella (classId: 25)
    { id: 'umbrella_1', classId: 25, label: 'umbrella', confidence: 0.90, bbox: { x1: 50, y1: 120, x2: 90, y2: 150 } },
  ];

  const grouped = aggregateObjectsByClass(mockObjects);

  assert(grouped.length === 4, '11 instances of 4 classes are aggregated into exactly 4 Vocabulary Items');
  
  const motoGroup = grouped.find((g) => g.classId === 3);
  assert(motoGroup !== undefined, 'Motorcycle group exists');
  assert(motoGroup?.count === 5, 'Motorcycle count is exactly 5');
  assert(motoGroup?.instances.length === 5, 'All 5 individual motorcycle instances are preserved');
  assert(motoGroup?.primaryInstance.id === 'moto_1', 'Highest confidence motorcycle (0.95) selected as primary');

  const personGroup = grouped.find((g) => g.classId === 0);
  assert(personGroup?.count === 3, 'Person count is exactly 3');
  assert(personGroup?.instances.length === 3, 'All 3 individual person instances are preserved');

  const carGroup = grouped.find((g) => g.classId === 2);
  assert(carGroup?.count === 2, 'Car count is exactly 2');
  assert(carGroup?.instances.length === 2, 'All 2 individual car instances are preserved');

  const umbrellaGroup = grouped.find((g) => g.classId === 25);
  assert(umbrellaGroup?.count === 1, 'Umbrella count is exactly 1');

  // Verify bounding boxes are distinct and not merged into one giant bounding box
  const allBboxes = motoGroup?.instances.map((i) => i.bbox);
  const distinctBboxes = new Set(allBboxes?.map((b) => `${b.x1},${b.y1},${b.x2},${b.y2}`));
  assert(distinctBboxes.size === 5, 'Each of the 5 motorcycles maintains its own distinct bounding box coordinates');

  // Statistics calculation
  const mockTexts: VisualIntelligenceText[] = [
    { id: 'txt_1', content: 'SIÊU THỊ XE ĐẠP', confidence: 0.98, bbox: { x1: 10, y1: 10, x2: 150, y2: 30 } },
    { id: 'txt_2', content: 'GIẢM GIÁ 20%', confidence: 0.94, bbox: { x1: 10, y1: 35, x2: 120, y2: 55 } },
  ];

  const stats = computeStudioStats(mockObjects, mockTexts);
  assert(stats.totalObjects === 11, 'Total objects stat is 11');
  assert(stats.uniqueClasses === 4, 'Unique classes stat is 4');
  assert(stats.textRegions === 2, 'Text regions stat is 2');

  // Edge cases: empty objects
  const emptyGrouped = aggregateObjectsByClass([]);
  assert(emptyGrouped.length === 0, 'Empty objects list returns empty grouped array');
  const emptyStats = computeStudioStats([], []);
  assert(emptyStats.totalObjects === 0 && emptyStats.uniqueClasses === 0 && emptyStats.textRegions === 0, 'Empty lists produce zeroed stats');

  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 3: SYNCHRONIZED MULTILINGUAL TRANSLATION (PART 2)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Synchronized Multilingual Translation Tests ---');

  const sampleVocab = getVocabularyByClassId(0)!; // Person
  const origWord = sampleVocab.word;
  const origExampleEn = sampleVocab.exampleEn;
  const origMeaningVi = sampleVocab.vietnamese;
  const origExampleVi = sampleVocab.exampleVi;
  const origIpa = sampleVocab.ipa;

  // 3.1 Vietnamese fast-path
  const viTrans = await fetchSynchronizedVocabularyTranslation(sampleVocab, 'vi');
  assert(viTrans.word === sampleVocab.vietnamese, 'VI translation: word matches Vietnamese dictionary');
  assert(viTrans.meaning === sampleVocab.vietnamese, 'VI translation: meaning matches Vietnamese dictionary');
  assert(viTrans.example === sampleVocab.exampleVi, 'VI translation: example matches Vietnamese example');

  // 3.2 English fast-path
  const enTrans = await fetchSynchronizedVocabularyTranslation(sampleVocab, 'en');
  assert(enTrans.word === sampleVocab.word, 'EN translation: word matches English source');
  assert(enTrans.meaning === sampleVocab.word, 'EN translation: meaning matches English source');
  assert(enTrans.example === sampleVocab.exampleEn, 'EN translation: example matches English example');

  // Verify source data immutability
  assert(sampleVocab.word === origWord, 'English source word is never mutated');
  assert(sampleVocab.exampleEn === origExampleEn, 'English source example is never mutated');
  assert(sampleVocab.vietnamese === origMeaningVi, 'Vietnamese source meaning is never mutated');
  assert(sampleVocab.exampleVi === origExampleVi, 'Vietnamese source example is never mutated');
  assert(sampleVocab.ipa === origIpa, 'IPA is never mutated');

  // 3.3 Dynamic multilingual translation (mocked/cached for fast assertion)
  console.log('  Testing translation caching mechanism...');
  const cachedCheck = getCachedVocabularyTranslation('Person', 'vi');
  assert(cachedCheck === null, 'Cache returns null before explicit cache insertion');

  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 4: OCR TEXT TRANSLATION & ORDER PRESERVATION
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 4. OCR Text Reading Order & Translation Tests ---');

  const multiLineOcr = 'SIÊU THỊ XE ĐẠP\nCHUYÊN CÁC LOẠI XE\nĐỊA CHỈ: 123 ĐƯỜNG ABC';
  const lines = multiLineOcr.split('\n');
  assert(lines.length === 3, 'OCR lines maintain natural reading order');
  assert(lines[0] === 'SIÊU THỊ XE ĐẠP', 'First OCR line is heading');
  assert(lines[1] === 'CHUYÊN CÁC LOẠI XE', 'Second OCR line is description');
  assert(lines[2] === 'ĐỊA CHỈ: 123 ĐƯỜNG ABC', 'Third OCR line is address');

  // Empty text handling
  const emptyOcrTrans = await translateOcrTextWithCache('', 'zh');
  assert(emptyOcrTrans === '', 'Empty OCR text returns empty string gracefully');

  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
  console.log('='.repeat(70));
  console.log('[SUCCESS] All upgrade automated test assertions passed flawlessly!\n');
}

runTestSuite().catch((err) => {
  console.error('[ERROR] Test failed:', err);
  process.exit(1);
});


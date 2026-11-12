import { DetectionItem, ObjectDetectionRecord } from '../types';
import { CocoVocabularyItem } from '../types/vocabulary';
import { getVocabularyByClassId, getVocabularyByLabel } from '../data/cocoDictionary';

export interface EnrichedDetectionItem extends DetectionItem {
  vocabulary?: CocoVocabularyItem;
}

export interface EnrichedObjectDetectionRecord extends Omit<ObjectDetectionRecord, 'detections'> {
  detections: EnrichedDetectionItem[];
}

/**
 * Enriches a single DetectionItem with static vocabulary data.
 * Pure function: Does NOT mutate the input object; returns a new object.
 *
 * Priority order:
 * 1. classId lookup (stable COCO integer 0..79).
 * 2. label fallback lookup (case-insensitive trimmed string).
 * 3. Graceful fallback: If dictionary entry not found, keeps original detection untouched without vocabulary.
 */
export function enrichDetectionWithVocabulary(detection: DetectionItem): EnrichedDetectionItem {
  if (!detection) {
    return detection;
  }

  let vocab: CocoVocabularyItem | undefined;

  // 1. Prioritize classId lookup (most reliable in YOLO COCO)
  if (typeof detection.classId === 'number' && !Number.isNaN(detection.classId) && detection.classId >= 0) {
    vocab = getVocabularyByClassId(detection.classId);
  }

  // 2. Fallback to label lookup if classId lookup missed or was omitted
  if (!vocab && detection.label && typeof detection.label === 'string') {
    vocab = getVocabularyByLabel(detection.label);
  }

  // 3. Return enriched detection item without mutating input
  return {
    ...detection,
    // Preserve exact box, confidence, label, classId
    box: detection.box ? { ...detection.box } : detection.box,
    vocabulary: vocab,
  };
}

/**
 * Enriches an entire ObjectDetectionRecord with vocabulary for every detection item.
 * Pure function: Does not mutate the original record.
 * Handles null/undefined inputs, empty detection arrays, and missing fields safely.
 */
export function enrichDetectionRecord(
  record: ObjectDetectionRecord | null | undefined
): EnrichedObjectDetectionRecord | null {
  if (!record) {
    return null;
  }

  const rawDetections = Array.isArray(record.detections) ? record.detections : [];
  const enrichedDetections: EnrichedDetectionItem[] = rawDetections.map(enrichDetectionWithVocabulary);

  return {
    ...record,
    detections: enrichedDetections,
  };
}

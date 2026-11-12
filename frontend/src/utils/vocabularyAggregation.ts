import { VisualIntelligenceObject, VisualIntelligenceText } from '../types';
import { CocoVocabularyItem, GroupedVocabularyItem } from '../types/vocabulary';
import { getVocabularyByClassId, getVocabularyByLabel } from '../data/cocoDictionary';

export interface StudioStatistics {
  totalObjects: number;
  uniqueClasses: number;
  textRegions: number;
}

/**
 * Groups raw object detection instances by COCO classId (or stable normalized label).
 * Preserves all original instances and individual bounding boxes intact.
 * Produces exactly ONE GroupedVocabularyItem per unique class.
 */
export function aggregateObjectsByClass(
  objects: VisualIntelligenceObject[]
): GroupedVocabularyItem[] {
  if (!objects || objects.length === 0) {
    return [];
  }

  const groupMap = new Map<number | string, GroupedVocabularyItem>();

  for (const obj of objects) {
    const key =
      typeof obj.classId === 'number' && !Number.isNaN(obj.classId) && obj.classId >= 0
        ? obj.classId
        : obj.label.toLowerCase().trim();

    if (!groupMap.has(key)) {
      const vocab =
        typeof obj.classId === 'number'
          ? getVocabularyByClassId(obj.classId)
          : getVocabularyByLabel(obj.label);

      const word = vocab?.word || obj.label.charAt(0).toUpperCase() + obj.label.slice(1);

      groupMap.set(key, {
        classId: obj.classId,
        label: obj.label,
        word,
        count: 1,
        instances: [obj],
        primaryInstance: obj,
        vocabulary: vocab,
      });
    } else {
      const existing = groupMap.get(key)!;
      existing.instances.push(obj);
      existing.count += 1;

      // Update primary instance if current has higher confidence
      if (obj.confidence > existing.primaryInstance.confidence) {
        existing.primaryInstance = obj;
      }
    }
  }

  // Sort each group's instances by confidence descending
  const result: GroupedVocabularyItem[] = Array.from(groupMap.values()).map((grp) => {
    grp.instances.sort((a, b) => b.confidence - a.confidence);
    return grp;
  });

  // Sort groups by count descending, then alphabetical
  result.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.word.localeCompare(b.word);
  });

  return result;
}

/**
 * Computes simple, transparent studio statistics.
 * No internal technical details or debug parameters exposed.
 */
export function computeStudioStats(
  objects: VisualIntelligenceObject[],
  texts: VisualIntelligenceText[]
): StudioStatistics {
  const totalObjects = objects ? objects.length : 0;
  const uniqueClassSet = new Set<string>();

  if (objects) {
    for (const obj of objects) {
      uniqueClassSet.add(
        typeof obj.classId === 'number' ? `id_${obj.classId}` : obj.label.toLowerCase().trim()
      );
    }
  }

  const uniqueClasses = uniqueClassSet.size;
  const textRegions = texts ? texts.length : 0;

  return {
    totalObjects,
    uniqueClasses,
    textRegions,
  };
}


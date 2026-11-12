/**
 * Type definitions for COCO 80 English Vocabulary Learning & Multilingual Translation
 */

import type { VisualIntelligenceObject } from './index';

export interface CocoVocabularyItem {
  classId: number;
  label: string;
  word: string;
  ipa: string;
  ipaUs?: string;
  ipaUk?: string;
  vietnamese: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleVi: string;
}

export type CocoDictionaryById = Record<number, CocoVocabularyItem>;
export type CocoDictionaryByLabel = Record<string, CocoVocabularyItem>;

/**
 * Synchronized Multilingual Translation Schema (Part 2)
 */
export interface VocabularyItemTranslations {
  word: string;
  meaning: string;
  example: string;
}

export interface VocabularyCardSource {
  word: string;
  ipa: string;
  ipaUs?: string;
  ipaUk?: string;
  partOfSpeech: string;
  meaningVi: string;
  exampleEn: string;
  exampleVi: string;
}

export interface VocabularyCardData {
  source: VocabularyCardSource;
  translations: Record<string, VocabularyItemTranslations>;
}

/**
 * Duplicate Class Aggregation Schema (Part 5)
 */
export interface GroupedVocabularyItem {
  classId: number;
  label: string;
  word: string;
  count: number;
  instances: VisualIntelligenceObject[];
  primaryInstance: VisualIntelligenceObject;
  vocabulary?: CocoVocabularyItem;
  translations?: Record<string, VocabularyItemTranslations>;
}

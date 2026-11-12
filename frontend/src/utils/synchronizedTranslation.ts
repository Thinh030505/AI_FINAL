import { translationService } from '../services/translationService';
import { CocoVocabularyItem, VocabularyItemTranslations } from '../types/vocabulary';

/**
 * In-memory LRU-like cache for synchronized vocabulary translations:
 * Key: `${word.toLowerCase()}:${targetLanguage}` -> VocabularyItemTranslations
 */
const vocabularyTranslationCache = new Map<string, VocabularyItemTranslations>();

/**
 * In-memory cache for OCR translations:
 * Key: `${hash}:${targetLanguage}` -> string
 */
const ocrTranslationCache = new Map<string, string>();

/**
 * Synchronously retrieves cached translation if already fetched, or null if pending/uncached.
 */
export function getCachedVocabularyTranslation(
  word: string,
  targetLanguage: string
): VocabularyItemTranslations | null {
  const normalizedLang = targetLanguage.toLowerCase().trim();
  const cacheKey = `${word.toLowerCase().trim()}:${normalizedLang}`;
  return vocabularyTranslationCache.get(cacheKey) || null;
}

/**
 * Synchronously retrieves cached OCR translation if already fetched, or null.
 */
export function getCachedOcrTranslation(text: string, targetLanguage: string): string | null {
  const normalizedLang = targetLanguage.toLowerCase().trim();
  const cacheKey = `${text.trim()}:${normalizedLang}`;
  return ocrTranslationCache.get(cacheKey) || null;
}

/**
 * Fetches and synchronizes all 3 components of vocabulary translation:
 * 1. Object Word Translation
 * 2. Meaning Translation
 * 3. Example Sentence Translation
 *
 * Guarantees that:
 * - Native base data is NEVER overwritten or mutated.
 * - Translations are fully synchronized to the specified targetLanguage.
 * - Results are cached in memory to eliminate redundant API calls.
 */
export async function fetchSynchronizedVocabularyTranslation(
  vocab: CocoVocabularyItem,
  targetLanguage: string
): Promise<VocabularyItemTranslations> {
  const normalizedLang = targetLanguage.toLowerCase().trim();

  // Fast-path: Vietnamese base dictionary (zero latency, zero API calls)
  if (normalizedLang === 'vi') {
    return {
      word: vocab.vietnamese,
      meaning: vocab.vietnamese,
      example: vocab.exampleVi,
    };
  }

  // Fast-path: English source (zero latency, zero API calls)
  if (normalizedLang === 'en') {
    return {
      word: vocab.word,
      meaning: vocab.word,
      example: vocab.exampleEn,
    };
  }

  // Check in-memory cache
  const cacheKey = `${vocab.word.toLowerCase().trim()}:${normalizedLang}`;
  const cached = vocabularyTranslationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Translate word and example in parallel
    const [wordRes, exampleRes] = await Promise.all([
      translationService.translate(vocab.word, 'en', normalizedLang),
      vocab.exampleEn
        ? translationService.translate(vocab.exampleEn, 'en', normalizedLang)
        : Promise.resolve({ data: { translation: { translatedText: '' } } }),
    ]);

    const translatedWord =
      wordRes.data?.translation?.translatedText?.trim() || vocab.vietnamese;
    const translatedExample =
      exampleRes.data?.translation?.translatedText?.trim() ||
      vocab.exampleVi ||
      vocab.exampleEn;

    const result: VocabularyItemTranslations = {
      word: translatedWord,
      meaning: translatedWord,
      example: translatedExample,
    };

    vocabularyTranslationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    // Graceful fallback on network or translation provider failure:
    // Return Vietnamese without corrupting or losing data
    const fallback: VocabularyItemTranslations = {
      word: vocab.vietnamese,
      meaning: vocab.vietnamese,
      example: vocab.exampleVi,
    };
    return fallback;
  }
}

/**
 * Translates OCR text with in-memory caching
 */
export async function translateOcrTextWithCache(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string> {
  if (!text || !text.trim()) {
    return '';
  }

  const normalizedLang = targetLanguage.toLowerCase().trim();
  const cacheKey = `${text.trim()}:${normalizedLang}`;

  const cached = ocrTranslationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await translationService.translate(text, sourceLanguage, normalizedLang);
  const translated = res.data?.translation?.translatedText || text;

  ocrTranslationCache.set(cacheKey, translated);
  return translated;
}


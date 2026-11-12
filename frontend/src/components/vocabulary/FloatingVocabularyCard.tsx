import React, { useState, useEffect } from 'react';
import { DetectionItem } from '../../types';
import { X, Volume2, Globe, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { CocoVocabularyItem, VocabularyItemTranslations } from '../../types/vocabulary';
import { SUPPORTED_LANGUAGES } from '../common/LanguageSelector';
import {
  fetchSynchronizedVocabularyTranslation,
  getCachedVocabularyTranslation,
} from '../../utils/synchronizedTranslation';

interface FloatingVocabularyCardProps {
  detection: DetectionItem;
  index: number;
  color: { stroke: string; fill: string; bg: string; text: string; border: string };
  isHovered: boolean;
  isSelected: boolean;
  count?: number;
  mode?: 'learn' | 'compact' | 'inspector';
  targetLanguage?: string;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const FloatingVocabularyCard: React.FC<FloatingVocabularyCardProps> = ({
  detection,
  index,
  color,
  isHovered,
  isSelected,
  count = 1,
  mode = 'learn',
  targetLanguage = 'vi',
  onHover,
  onClick,
  onClose,
  style,
  className = '',
}) => {
  const vocab: CocoVocabularyItem | undefined = detection.vocabulary;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Synchronized translation state
  const [translations, setTranslations] = useState<VocabularyItemTranslations | null>(() => {
    if (!vocab) return null;
    return getCachedVocabularyTranslation(vocab.word, targetLanguage);
  });
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  const wordToSpeak = vocab?.word || detection.label;
  const currentLangObj = SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === targetLanguage.toLowerCase()
  );

  // Synchronized Multilingual Translation Hook (Part 2)
  useEffect(() => {
    let isCancelled = false;

    if (!vocab) return;

    // Check fast cache first
    const cached = getCachedVocabularyTranslation(vocab.word, targetLanguage);
    if (cached) {
      setTranslations(cached);
      setIsTranslating(false);
      return;
    }

    // Fast-path: Vietnamese
    if (targetLanguage.toLowerCase() === 'vi') {
      setTranslations({
        word: vocab.vietnamese,
        meaning: vocab.vietnamese,
        example: vocab.exampleVi,
      });
      setIsTranslating(false);
      return;
    }

    // Fast-path: English
    if (targetLanguage.toLowerCase() === 'en') {
      setTranslations({
        word: vocab.word,
        meaning: vocab.word,
        example: vocab.exampleEn,
      });
      setIsTranslating(false);
      return;
    }

    // Fetch synchronized translations for word, meaning and example simultaneously
    setIsTranslating(true);
    fetchSynchronizedVocabularyTranslation(vocab, targetLanguage)
      .then((res) => {
        if (!isCancelled) {
          setTranslations(res);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTranslations({
            word: vocab.vietnamese,
            meaning: vocab.vietnamese,
            example: vocab.exampleVi,
          });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsTranslating(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [vocab, targetLanguage]);

  const handleSpeakWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window && wordToSpeak) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordToSpeak);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // IPA Phonetic rendering helpers (Part 1.1)
  const ipaUs = vocab?.ipaUs || vocab?.ipa;
  const ipaUk = vocab?.ipaUk;
  const hasDistinctUk = Boolean(ipaUk && ipaUs && ipaUk !== ipaUs);

  return (
    <div
      style={style}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      role="region"
      aria-label="Vocabulary Learning Card"
      className={`absolute z-30 pointer-events-auto select-none rounded-2xl bg-white/98 backdrop-blur-md p-4 sm:p-5 text-left border border-slate-200 shadow-elevated w-84 sm:w-96 max-w-[94vw] transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-indigo-500/80 border-indigo-400'
          : 'hover:border-slate-300'
      } ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          CARD HEADER: Dot, English Word, Count, Part of Speech, Audio & Close
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-xs mt-1"
            style={{ backgroundColor: color.stroke }}
          />

          {/* Word Name: No truncation, full word visibility */}
          <h4 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight capitalize break-words">
            {wordToSpeak}
          </h4>

          {/* Aggregated Count Badge (Part 5) */}
          {count > 1 && (
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shadow-xs">
              ×{count}
            </span>
          )}

          {/* Part of Speech Badge */}
          {vocab?.partOfSpeech && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
              {vocab.partOfSpeech}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Audio Pronunciation Button */}
          <button
            type="button"
            onClick={handleSpeakWord}
            title="Pronounce native English"
            className={`p-1.5 rounded-lg border transition-all ${
              isPlayingAudio
                ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-sm'
                : 'bg-indigo-50 text-indigo-600 border-indigo-200/70 hover:bg-indigo-100'
            }`}
          >
            <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
          </button>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            title={isExpanded ? 'Collapse card' : 'Expand card'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close card"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CARD BODY: Phonetics Line (Part 1), Meanings & Synchronized Translations (Part 2)
          ───────────────────────────────────────────────────────────── */}
      {vocab ? (
        <div className="pt-3 space-y-3 text-xs">
          
          {/* Dedicated Phonetic IPA Line (Part 1.1) */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasDistinctUk ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-ipa text-xs sm:text-sm font-semibold">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase font-sans">US</span>
                  <span>{ipaUs}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-800 font-ipa text-xs sm:text-sm font-semibold">
                  <span className="text-[10px] font-bold text-teal-600 uppercase font-sans">UK</span>
                  <span>{ipaUk}</span>
                </div>
              </>
            ) : ipaUs ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-ipa text-xs sm:text-sm font-semibold">
                <span className="text-[10px] font-bold text-emerald-600 uppercase font-sans">IPA</span>
                <span>{ipaUs}</span>
              </div>
            ) : null}
          </div>

          {/* Vietnamese Base Meaning */}
          <div className="flex items-baseline gap-1.5 text-slate-700">
            <span className="text-[11px] font-medium text-slate-400">Nghĩa tiếng Việt:</span>
            <strong className="text-slate-900 font-bold text-sm">
              {vocab.vietnamese}
            </strong>
          </div>

          {/* Synchronized Target Language Translation (Part 2) */}
          {targetLanguage !== 'vi' && targetLanguage !== 'en' && (
            <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-800 flex-wrap">
                <span className="text-sm">{currentLangObj?.flag}</span>
                <span className="text-[11px] text-purple-700 font-semibold">
                  {currentLangObj?.nativeName || currentLangObj?.name} Meaning:
                </span>
                <strong className="text-purple-950 font-bold text-sm">
                  {isTranslating ? (
                    <span className="inline-flex items-center gap-1 text-purple-600 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Translating...</span>
                    </span>
                  ) : (
                    translations?.meaning || translations?.word || vocab.vietnamese
                  )}
                </strong>
              </div>
            </div>
          )}

          {/* Contextual Examples (Part 1.2 & Part 2.2) */}
          {isExpanded && vocab.exampleEn && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Example Usage:
              </div>

              {/* English Example */}
              <p className="text-xs text-slate-800 italic leading-relaxed font-sans bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                "{vocab.exampleEn}"
              </p>

              {/* Vietnamese Translation of Example */}
              {vocab.exampleVi && (
                <div className="text-[11px] text-slate-600 pl-1">
                  <span className="text-slate-400 font-medium">Bản dịch:</span>{' '}
                  <span>{vocab.exampleVi}</span>
                </div>
              )}

              {/* Target Language Synchronized Example Translation (Part 2.2) */}
              {targetLanguage !== 'vi' && targetLanguage !== 'en' && (
                <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900 leading-relaxed font-medium">
                  <span className="text-purple-600 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                    {currentLangObj?.nativeName || currentLangObj?.name} Example:
                  </span>
                  {isTranslating ? (
                    <span className="inline-flex items-center gap-1 text-purple-600 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Translating example...</span>
                    </span>
                  ) : (
                    translations?.example || vocab.exampleVi || vocab.exampleEn
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="pt-2 text-xs text-slate-500">
          <span className="text-slate-800 font-medium capitalize">{detection.label}</span>
          <span className="text-slate-400 text-[10px] ml-1.5 font-mono">
            ({Math.round(detection.confidence * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
};

export default FloatingVocabularyCard;

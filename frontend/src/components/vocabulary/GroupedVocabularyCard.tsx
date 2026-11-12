import React, { useState, useEffect } from 'react';
import { Volume2, ChevronDown, ChevronUp, Loader2, Sparkles, Layers } from 'lucide-react';
import { GroupedVocabularyItem, VocabularyItemTranslations } from '../../types/vocabulary';
import { SUPPORTED_LANGUAGES } from '../common/LanguageSelector';
import {
  fetchSynchronizedVocabularyTranslation,
  getCachedVocabularyTranslation,
} from '../../utils/synchronizedTranslation';

interface GroupedVocabularyCardProps {
  item: GroupedVocabularyItem;
  color: { stroke: string; fill: string; bg: string; text: string; border: string };
  isSelected: boolean;
  isHovered: boolean;
  targetLanguage: string;
  displayMode: 'learn' | 'compact';
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onSelectInstance?: (instanceId: string) => void;
  selectedInstanceId?: string | null;
}

export const GroupedVocabularyCard: React.FC<GroupedVocabularyCardProps> = ({
  item,
  color,
  isSelected,
  isHovered,
  targetLanguage,
  displayMode,
  onSelect,
  onHover,
  onSelectInstance,
  selectedInstanceId,
}) => {
  const vocab = item.vocabulary;
  const word = item.word;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isInstancesExpanded, setIsInstancesExpanded] = useState(false);

  // Synchronized translation state (Part 2)
  const [translations, setTranslations] = useState<VocabularyItemTranslations | null>(() => {
    if (!vocab) return null;
    return getCachedVocabularyTranslation(vocab.word, targetLanguage);
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const currentLangObj = SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === targetLanguage.toLowerCase()
  );

  // Synchronize vocabulary translation when target language changes
  useEffect(() => {
    let isCancelled = false;

    if (!vocab) return;

    const cached = getCachedVocabularyTranslation(vocab.word, targetLanguage);
    if (cached) {
      setTranslations(cached);
      setIsTranslating(false);
      return;
    }

    if (targetLanguage.toLowerCase() === 'vi') {
      setTranslations({
        word: vocab.vietnamese,
        meaning: vocab.vietnamese,
        example: vocab.exampleVi,
      });
      setIsTranslating(false);
      return;
    }

    if (targetLanguage.toLowerCase() === 'en') {
      setTranslations({
        word: vocab.word,
        meaning: vocab.word,
        example: vocab.exampleEn,
      });
      setIsTranslating(false);
      return;
    }

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

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window && word) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const ipaUs = vocab?.ipaUs || vocab?.ipa;
  const ipaUk = vocab?.ipaUk;
  const hasDistinctUk = Boolean(ipaUk && ipaUs && ipaUk !== ipaUs);

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onSelect}
      className={`p-3.5 sm:p-4 rounded-2xl border text-xs transition-all cursor-pointer ${
        isSelected
          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-card'
          : isHovered
          ? 'bg-slate-50/90 border-indigo-300 shadow-subtle'
          : 'bg-white border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          ROW 1: Category Dot, English Word, Count Badge, Part of Speech, Audio
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-xs mt-0.5"
            style={{ backgroundColor: color.stroke }}
          />

          {/* Word Name: No truncation, full visibility */}
          <span className="font-extrabold text-slate-900 capitalize text-sm sm:text-base tracking-tight break-words">
            {word}
          </span>

          {/* Aggregation Count Badge (Part 5: e.g. Motorcycle × 5) */}
          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shadow-xs">
            ×{item.count}
          </span>

          {/* Part of Speech Badge */}
          {vocab?.partOfSpeech && (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider shrink-0">
              {vocab.partOfSpeech}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSpeak}
          title="Pronounce"
          className={`p-1.5 rounded-lg border shrink-0 transition-all ${
            isPlayingAudio
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-indigo-50 text-indigo-600 border-indigo-200/70 hover:bg-indigo-100'
          }`}
        >
          <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: Dedicated Phonetic IPA Line (Part 1.1)
          ───────────────────────────────────────────────────────────── */}
      {vocab && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {hasDistinctUk ? (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-ipa font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                <span className="text-[9px] font-black text-emerald-600 font-sans">US</span>
                <span>{ipaUs}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-ipa font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                <span className="text-[9px] font-black text-teal-600 font-sans">UK</span>
                <span>{ipaUk}</span>
              </span>
            </>
          ) : ipaUs ? (
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-ipa font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
              <span className="text-[9px] font-black text-emerald-600 font-sans">IPA</span>
              <span>{ipaUs}</span>
            </span>
          ) : null}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ROW 3: Vietnamese Meaning & Target Language Meaning (Part 2)
          ───────────────────────────────────────────────────────────── */}
      {vocab?.vietnamese && (
        <div className="mt-2 text-slate-700 text-xs flex items-baseline gap-1.5 flex-wrap">
          <span className="text-slate-400 text-[11px] font-medium">Nghĩa:</span>
          <strong className="text-slate-900 font-bold">{vocab.vietnamese}</strong>

          {/* Synchronized Target Language Meaning */}
          {targetLanguage !== 'vi' && targetLanguage !== 'en' && (
            <span className="inline-flex items-center gap-1 ml-2 text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 font-bold">
              <span>{currentLangObj?.flag}</span>
              {isTranslating ? (
                <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
              ) : (
                <span>{translations?.meaning || translations?.word}</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ROW 4: Example Sentences in Learn Mode (Part 1.2 & Part 2.2)
          ───────────────────────────────────────────────────────────── */}
      {displayMode === 'learn' && vocab?.exampleEn && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] space-y-1">
          <p className="italic text-slate-700 leading-snug">"{vocab.exampleEn}"</p>

          {vocab.exampleVi && (
            <p className="text-slate-500 leading-snug">{vocab.exampleVi}</p>
          )}

          {/* Target Language Example */}
          {targetLanguage !== 'vi' && targetLanguage !== 'en' && (
            <div className="pt-1 text-purple-800 font-medium leading-snug">
              <span className="text-[10px] uppercase font-bold text-purple-500 tracking-wider block">
                {currentLangObj?.nativeName || currentLangObj?.name}:
              </span>
              {isTranslating ? (
                <span className="inline-flex items-center gap-1 text-purple-600 italic">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Translating...
                </span>
              ) : (
                <span>{translations?.example}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ROW 5: Instances Breakdown (Part 5: Expandable if count > 1)
          ───────────────────────────────────────────────────────────── */}
      {item.count > 1 && (
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsInstancesExpanded(!isInstancesExpanded);
            }}
            className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>{item.count} individual instances detected</span>
            </span>
            {isInstancesExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {isInstancesExpanded && (
            <div className="mt-2 space-y-1 animate-in fade-in duration-150 pl-2 border-l-2 border-indigo-100">
              {item.instances.map((inst, idx) => {
                const isInstSelected = selectedInstanceId === inst.id;
                return (
                  <div
                    key={inst.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectInstance?.(inst.id);
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      isInstSelected
                        ? 'bg-indigo-100/80 text-indigo-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span>
                      Instance #{idx + 1} ({inst.id})
                    </span>
                    <span className="text-emerald-700 font-bold">
                      {Math.round(inst.confidence * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupedVocabularyCard;

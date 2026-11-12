import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Globe, Check } from 'lucide-react';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  popular?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', popular: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', popular: true },
  { code: 'zh', name: 'Chinese Simplified', nativeName: '中文 (简体)', flag: '🇨🇳', popular: true },
  { code: 'zh-TW', name: 'Chinese Traditional', nativeName: '中文 (繁體)', flag: '🇹🇼', popular: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', popular: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', popular: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', popular: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', popular: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', popular: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', popular: true },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
];

export const getStoredLanguage = (defaultLang: string = 'vi'): string => {
  try {
    const saved = localStorage.getItem('preferred_translation_language');
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  } catch {
    // Ignore localStorage access issues
  }
  return defaultLang;
};

export const setStoredLanguage = (langCode: string): void => {
  try {
    localStorage.setItem('preferred_translation_language', langCode);
  } catch {
    // Ignore localStorage access issues
  }
};

interface LanguageSelectorProps {
  value: string;
  onChange: (languageCode: string) => void;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  showAuto?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  label,
  size = 'md',
  className = '',
  showAuto = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allLanguages = showAuto
    ? [
        { code: 'auto', name: 'Auto Detect', nativeName: 'Tự động phát hiện', flag: '🌐', popular: true },
        ...SUPPORTED_LANGUAGES,
      ]
    : SUPPORTED_LANGUAGES;

  const currentLang =
    allLanguages.find((l) => l.code.toLowerCase() === value.toLowerCase()) ||
    allLanguages[0];

  const filteredLanguages = allLanguages.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (code: string) => {
    onChange(code);
    setStoredLanguage(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {label && (
        <span className="block text-[11px] font-semibold text-slate-500 mb-1">
          {label}
        </span>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all shadow-subtle ${
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs font-medium'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className="text-sm shrink-0">{currentLang.flag}</span>
          <span className="font-semibold text-slate-900">{currentLang.nativeName}</span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white border border-slate-200 shadow-elevated p-2 z-50 animate-in fade-in slide-in-from-top-1">
          {/* Search Input */}
          <div className="relative mb-2 px-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search language..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Languages List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
            {filteredLanguages.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                No languages found
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-sm">{lang.flag}</span>
                      <span className="truncate">{lang.nativeName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({lang.name})
                      </span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

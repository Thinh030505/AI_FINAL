import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scan,
  Sparkles,
  ArrowRight,
  Volume2,
  Camera,
  Layers,
  ScanText,
  Upload,
  ArrowUpRight,
  GraduationCap,
  Languages,
  Cpu,
  Check,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { ImageRecord } from '../types';
import { Button } from '../components/ui/Button';

interface HeroDemoObject {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  vietnamese: string;
  exampleEn: string;
  exampleVi: string;
  box: { top: string; left: string; width: string; height: string };
  pillPos: { top: string; left: string };
  color: string;
  translations: Record<string, { word: string; example: string }>;
}

const HERO_DEMO_ITEMS: HeroDemoObject[] = [
  {
    id: 'laptop',
    word: 'Laptop',
    ipa: '/ˈlæp.tɒp/',
    partOfSpeech: 'noun',
    vietnamese: 'máy tính xách tay',
    exampleEn: 'She closed her laptop after finishing the project.',
    exampleVi: 'Cô ấy gập máy tính lại sau khi hoàn thành dự án.',
    box: { top: '34%', left: '26%', width: '38%', height: '38%' },
    pillPos: { top: '27%', left: '26%' },
    color: '#4F46E5', // Indigo
    translations: {
      vi: { word: 'máy tính xách tay', example: 'Cô ấy gập máy tính lại sau khi hoàn thành dự án.' },
      ja: { word: 'ノートパソコン', example: 'プロジェクトを終えた後、彼女はノートパソコンを閉じた。' },
      zh: { word: '笔记本电脑', example: '完成项目后，她合上了笔记本电脑。' },
      ko: { word: '노트북', example: '그녀는 프로젝트를 마친 후 노트북을 닫았습니다.' },
      fr: { word: 'ordinateur portable', example: 'Elle a fermé son ordinateur portable après avoir terminé le projet.' },
    },
  },
  {
    id: 'cup',
    word: 'Coffee Cup',
    ipa: '/ˈkɒf.i kʌp/',
    partOfSpeech: 'noun',
    vietnamese: 'tách cà phê',
    exampleEn: 'A warm cup of coffee sits beside the notebook.',
    exampleVi: 'Một tách cà phê ấm đặt cạnh cuốn sổ tay.',
    box: { top: '50%', left: '72%', width: '16%', height: '24%' },
    pillPos: { top: '44%', left: '72%' },
    color: '#059669', // Emerald
    translations: {
      vi: { word: 'tách cà phê', example: 'Một tách cà phê ấm đặt cạnh cuốn sổ tay.' },
      ja: { word: 'コーヒーカップ', example: 'ノートの横に温かいコーヒーカップが置いてある。' },
      zh: { word: '咖啡杯', example: '笔记本旁边放着一杯热咖啡。' },
      ko: { word: '커피 잔', example: '노트 옆에 따뜻한 커피 한 잔이 놓여 있습니다.' },
      fr: { word: 'tasse de café', example: 'Une tasse de café chaud se trouve à côté du carnet.' },
    },
  },
  {
    id: 'chair',
    word: 'Office Chair',
    ipa: '/ˈɒf.ɪs tʃeə(r)/',
    partOfSpeech: 'noun',
    vietnamese: 'ghế văn phòng',
    exampleEn: 'An ergonomic office chair supports good posture.',
    exampleVi: 'Chiếc ghế văn phòng tiện dụng giúp duy trì tư thế tốt.',
    box: { top: '15%', left: '68%', width: '28%', height: '42%' },
    pillPos: { top: '9%', left: '68%' },
    color: '#D97706', // Amber
    translations: {
      vi: { word: 'ghế văn phòng', example: 'Chiếc ghế văn phòng tiện dụng giúp duy trì tư thế tốt.' },
      ja: { word: 'オフィスチェア', example: '人間工学に基づいたオフィスチェアが良い姿勢を保ちます。' },
      zh: { word: '办公椅', example: '符合人体工程学设计的办公椅有助于保持良好坐姿。' },
      ko: { word: '사무용 의자', example: '인체공학적 사무용 의자는 바른 자세를 유지해 줍니다.' },
      fr: { word: 'chaise de bureau', example: 'Une chaise de bureau ergonomique favorise une bonne posture.' },
    },
  },
];

interface SampleScenario {
  id: string;
  title: string;
  category: string;
  image: string;
  objects: { name: string; ipa: string; color: string }[];
  targetPath: string;
}

const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'office',
    title: 'Modern Workspace',
    category: 'Productivity & Tech',
    image: '/samples/office.jpg',
    objects: [
      { name: 'Laptop', ipa: '/ˈlæp.tɒp/', color: 'bg-indigo-500' },
      { name: 'Chair', ipa: '/tʃeə(r)/', color: 'bg-amber-500' },
      { name: 'Cup', ipa: '/kʌp/', color: 'bg-emerald-500' },
    ],
    targetPath: '/object-detection',
  },
  {
    id: 'street',
    title: 'Urban Traffic & Street',
    category: 'City & Transport',
    image: '/samples/street.jpg',
    objects: [
      { name: 'Car', ipa: '/kɑːr/', color: 'bg-blue-500' },
      { name: 'Traffic Light', ipa: '/ˈtræf.ɪk laɪt/', color: 'bg-rose-500' },
      { name: 'Person', ipa: '/ˈpɜːrsn/', color: 'bg-teal-500' },
    ],
    targetPath: '/visual-intelligence',
  },
  {
    id: 'beach',
    title: 'Coastal Beach Scene',
    category: 'Nature & Travel',
    image: '/samples/beach.jpg',
    objects: [
      { name: 'Person', ipa: '/ˈpɜːrsn/', color: 'bg-teal-500' },
      { name: 'Umbrella', ipa: '/ʌmˈbrel.ə/', color: 'bg-orange-500' },
    ],
    targetPath: '/image-analysis',
  },
  {
    id: 'receipt',
    title: 'Document & Receipt OCR',
    category: 'Documents & Receipts',
    image: '/samples/receipt.jpg',
    objects: [
      { name: 'Receipt Text', ipa: '/rɪˈsiːt/', color: 'bg-purple-500' },
      { name: 'Store Data', ipa: '/stɔːr/', color: 'bg-indigo-500' },
    ],
    targetPath: '/ocr',
  },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [recentImages, setRecentImages] = useState<ImageRecord[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(true);

  // Hero Interactive Simulation
  const [activeHeroObject, setActiveHeroObject] = useState<HeroDemoObject>(HERO_DEMO_ITEMS[0]);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [demoLanguage, setDemoLanguage] = useState<string>('vi');

  useEffect(() => {
    const fetchRecentImages = async () => {
      try {
        const response = await imageService.getImages();
        if (response.success && response.data.images) {
          setRecentImages(response.data.images.slice(0, 6));
        }
      } catch (err) {
        // Silently handle
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchRecentImages();
  }, []);

  const handlePronounce = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window && word) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const activeTranslation =
    activeHeroObject.translations[demoLanguage] ||
    activeHeroObject.translations['vi'] || {
      word: activeHeroObject.vietnamese,
      example: activeHeroObject.exampleVi,
    };

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HERO AREA: VISUAL-FIRST INTERACTIVE WORKSPACE
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-card grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Headline & Action Triggers */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Visual Intelligence & Vocabulary Studio</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              See the World.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Learn the Words.
              </span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Explore 80+ real-world objects and multilingual OCR with native IPA phonetics,
              grammar classifications, and instant translation across 14+ world languages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/object-detection">
              <Button
                variant="primary"
                size="lg"
                icon={<GraduationCap className="w-4 h-4" />}
                className="shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
              >
                Start Learning
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/visual-intelligence">
              <Button
                variant="outline"
                size="lg"
                icon={<Sparkles className="w-4 h-4 text-purple-600" />}
              >
                Visual Studio
              </Button>
            </Link>
          </div>

          {/* Core Feature Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-medium text-slate-500">
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-indigo-600" /> 80+ COCO Objects
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> IPA Phonetics
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-purple-600" /> 14+ Languages
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-600" /> PaddleOCR Text
            </span>
          </div>
        </div>

        {/* Right Column: Visual AI Interactive Live Canvas */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-elevated border border-slate-800 space-y-3.5">
            
            {/* Visual Canvas Simulator with Real Scene */}
            <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-700/80 select-none group">
              <img
                src="/samples/office.jpg"
                alt="Workspace detection preview"
                className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
              />

              {/* Bounding Boxes & Tags */}
              {HERO_DEMO_ITEMS.map((item) => {
                const isActive = activeHeroObject.id === item.id;
                return (
                  <React.Fragment key={item.id}>
                    {/* Bounding Box with Corner Accents */}
                    <div
                      style={{
                        top: item.box.top,
                        left: item.box.left,
                        width: item.box.width,
                        height: item.box.height,
                        borderColor: item.color,
                        backgroundColor: isActive ? `${item.color}25` : `${item.color}08`,
                      }}
                      className={`absolute rounded-lg border-2 transition-all duration-200 pointer-events-none ${
                        isActive ? 'scale-[1.02] shadow-lg ring-2 ring-white/20' : 'opacity-60'
                      }`}
                    >
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white rounded-tl" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white rounded-br" />
                    </div>

                    {/* Floating Clickable Object Tag */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHeroObject(item);
                        handlePronounce(item.word);
                      }}
                      style={{
                        top: item.pillPos.top,
                        left: item.pillPos.left,
                      }}
                      className={`absolute z-20 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md shadow-md ${
                        isActive
                          ? 'bg-white text-slate-900 ring-2 ring-indigo-400 scale-105'
                          : 'bg-slate-900/85 text-slate-200 border border-slate-600 hover:bg-slate-800 hover:scale-102'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="capitalize">{item.word}</span>
                      <span className="text-[10px] opacity-75 font-mono">{item.ipa}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Active Word Educational Card (Learn Mode + Translation) */}
            <div className="bg-slate-800/95 rounded-xl p-3.5 border border-slate-700/80 space-y-2.5 shadow-subtle">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-base capitalize">
                      {activeHeroObject.word}
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      {activeHeroObject.ipa}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-700 text-slate-300">
                      {activeHeroObject.partOfSpeech}
                    </span>
                  </div>

                  {/* Target Translated Meaning */}
                  <div className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                    <span>{activeTranslation.word}</span>
                    {demoLanguage !== 'vi' && (
                      <span className="text-slate-400 text-[11px]">({activeHeroObject.vietnamese})</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePronounce(activeHeroObject.word)}
                  title="Pronounce English word"
                  className={`p-2 rounded-lg border transition-all shrink-0 ${
                    isPlayingAudio
                      ? 'bg-indigo-600 text-white border-indigo-500 scale-105 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              {/* Example Sentence & Target Translation */}
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-xs space-y-1">
                <p className="text-slate-200 italic">"{activeHeroObject.exampleEn}"</p>
                <p className="text-slate-400 text-[11px]">→ {activeTranslation.example}</p>
              </div>

              {/* Dynamic Translation Language Selector Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Translate:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { code: 'vi', label: '🇻🇳 Tiếng Việt' },
                    { code: 'ja', label: '🇯🇵 日本語' },
                    { code: 'zh', label: '🇨🇳 中文' },
                    { code: 'ko', label: '🇰🇷 한국어' },
                    { code: 'fr', label: '🇫🇷 Français' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setDemoLanguage(lang.code)}
                      className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                        demoLanguage === lang.code
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. HOW IT WORKS – 3 VISUAL STEPS
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              How It Works
            </h2>
            <p className="text-xs text-slate-500">
              Transform any photo into a bilingual vocabulary lesson in 3 simple steps
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
              01
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-600" /> Upload or Snap
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload any everyday picture or use your device camera to capture real-time surroundings.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
              02
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-600" /> Dual-Engine Detection
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                YOLO11 identifies 80+ objects while PaddleOCR extracts embedded texts with high precision.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
              03
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-emerald-600" /> Learn & Translate
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Master words with IPA phonetics, listen to audio, and translate into 14+ world languages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. AI FEATURES SHOWCASE: EDITORIAL ASYMMETRIC GRID
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              AI Vision & Learning Tools
            </h2>
            <p className="text-xs text-slate-500">
              Purpose-built visual intelligence engines tailored for learning and productivity
            </p>
          </div>
        </div>

        {/* Editorial Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Card 1: Object & Vocabulary (Lead Card) */}
          <Link
            to="/object-detection"
            className="md:col-span-2 bg-gradient-to-br from-indigo-50/50 via-white to-white rounded-3xl border border-indigo-200/70 p-6 shadow-card hover:border-indigo-300 hover:shadow-elevated transition-all flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <Scan className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold">
                  Core Engine
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Object Detection & Vocabulary Studio
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time YOLO11 model detecting 80+ COCO categories with interactive floating cards,
                  IPA phonetic guides, grammar classifications, and 14+ language translations.
                </p>
              </div>

              {/* Visual Preview Tags */}
              <div className="flex flex-wrap gap-2 pt-1">
                {['Apple /ˈæp.əl/', 'Car /ˈkɑːr/', 'Laptop /ˈlæp.tɒp/', 'Person /ˈpɜːrsn/'].map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-100 text-indigo-800 text-xs font-medium shadow-subtle"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
              Launch Object Studio <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </Link>

          {/* Card 2: Visual Intelligence (Dual Engine) */}
          <Link
            to="/visual-intelligence"
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card hover:border-purple-300 hover:shadow-elevated transition-all flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  Visual Intelligence Studio
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Unified YOLO11 object recognition and PaddleOCR text extraction merged in a single image canvas.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center text-xs font-semibold text-purple-600">
              Open Visual Studio <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 3: Multimodal AI */}
          <Link
            to="/image-analysis"
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card hover:border-sky-300 hover:shadow-elevated transition-all flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  Multimodal AI Analysis
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Synthesize scene context, environment attributes, and semantic relations across recognized zones.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center text-xs font-semibold text-sky-600">
              Explore Multimodal AI <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 4: Smart Camera */}
          <Link
            to="/camera"
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card hover:border-emerald-300 hover:shadow-elevated transition-all flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Smart Camera
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Point and learn in real time directly using your webcam or mobile camera lens.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center text-xs font-semibold text-emerald-600">
              Open Camera Lens <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 5: OCR Scanner */}
          <Link
            to="/ocr"
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card hover:border-amber-300 hover:shadow-elevated transition-all flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <ScanText className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  OCR Scanner & Translation
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Extract dense printed text, receipts, or signs with instant multilingual translation.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center text-xs font-semibold text-amber-600">
              Scan Document <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. VISUAL SHOWCASE / SAMPLE GALLERY
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Visual Showcase & Sample Scenes
            </h2>
            <p className="text-xs text-slate-500">
              Curated real-world environments demonstrated with AI object recognition
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SAMPLE_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              onClick={() => navigate(scenario.targetPath)}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle hover:border-indigo-300 hover:shadow-card transition-all cursor-pointer group flex flex-col"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={scenario.image}
                  alt={scenario.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-slate-900/75 backdrop-blur-sm text-white text-[10px] font-medium">
                  {scenario.category}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {scenario.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.objects.map((obj) => (
                      <span
                        key={obj.name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${obj.color}`} />
                        {obj.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                  <span>Explore Scene</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. RECENT IMAGES: USER GALLERY
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Recent Images
            </h2>
            <p className="text-xs text-slate-500">
              Your previously uploaded and analyzed image records
            </p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            View History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoadingImages ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recentImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {recentImages.map((img) => (
              <div
                key={img.id}
                onClick={() => navigate('/object-detection')}
                className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-subtle transition-all p-2 flex flex-col"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2">
                  <img
                    src={img.imageUrl}
                    alt={img.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="text-xs font-medium text-slate-800 truncate px-0.5">
                  {img.originalName}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">No images analyzed yet</p>
            </div>
            <Link to="/object-detection">
              <Button variant="primary" size="sm">
                Upload First Image
              </Button>
            </Link>
          </div>
        )}
      </section>

    </div>
  );
};

export default DashboardPage;

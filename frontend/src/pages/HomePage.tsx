import React from 'react';
import { Link } from 'react-router-dom';
import {
  Scan,
  ArrowRight,
  Camera,
  Layers,
  ScanText,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const HomePage: React.FC = () => {
  const tools = [
    {
      title: 'Object & Vocab',
      path: '/object-detection',
      icon: Scan,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200/80',
      description: 'Detect 80+ objects with bilingual phonetic vocabulary.',
    },
    {
      title: 'Visual Studio',
      path: '/visual-intelligence',
      icon: Sparkles,
      color: 'text-purple-600 bg-purple-50 border-purple-200/80',
      description: 'Dual-engine object detection and text extraction.',
    },
    {
      title: 'Multimodal AI',
      path: '/image-analysis',
      icon: Layers,
      color: 'text-sky-600 bg-sky-50 border-sky-200/80',
      description: 'Scene synthesis, environmental regions, and vision fusion.',
    },
    {
      title: 'Smart Camera',
      path: '/camera',
      icon: Camera,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      description: 'Real-time lens with instant entity recognition.',
    },
    {
      title: 'OCR Scanner',
      path: '/ocr',
      icon: ScanText,
      color: 'text-amber-600 bg-amber-50 border-amber-200/80',
      description: 'Document and photo text extraction with translation.',
    },
  ];

  return (
    <div className="py-10 sm:py-16 space-y-16 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Vision & Language Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight">
          See the World.{' '}
          <span className="text-indigo-600">Learn the Words.</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Transform photos and camera scenes into active English vocabulary with IPA phonetics, bilingual meanings, and speech audio.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/object-detection">
            <Button variant="primary" size="lg" icon={<Scan className="w-4 h-4" />}>
              Start Detection
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/visual-intelligence">
            <Button variant="outline" size="lg" icon={<Sparkles className="w-4 h-4 text-purple-600" />}>
              Visual Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              to={tool.path}
              className="flat-card p-5 hover:border-indigo-300 hover:shadow-subtle transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tool.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;

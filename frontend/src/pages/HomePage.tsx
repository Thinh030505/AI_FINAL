import React from 'react';
import { Link } from 'react-router-dom';
import { ScanText, ArrowRight, ShieldCheck, Cpu, Database, Server } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
        <Cpu className="w-4 h-4" /> Phase 1 Architecture Foundation
      </div>
      
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-3xl leading-tight">
        Next-Generation <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">AI OCR</span> Workspace
      </h1>

      <p className="mt-6 text-lg text-slate-400 max-w-2xl">
        Extract, structure, and translate document text effortlessly. Built on NestJS API Gateway, Python FastAPI AI Service, and React.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
        >
          Open Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/ocr"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-all"
        >
          <ScanText className="w-4 h-4 text-indigo-400" />
          OCR Studio (Placeholder)
        </Link>
      </div>

      {/* Tech Stack Cards */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="glass-card p-6 rounded-2xl text-left border border-slate-800">
          <Server className="w-8 h-8 text-indigo-400 mb-3" />
          <h3 className="font-semibold text-white">NestJS API Gateway</h3>
          <p className="text-sm text-slate-400 mt-1">Central gateway routing requests, handling auth, and managing database connections.</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-left border border-slate-800">
          <Cpu className="w-8 h-8 text-purple-400 mb-3" />
          <h3 className="font-semibold text-white">Python FastAPI AI</h3>
          <p className="text-sm text-slate-400 mt-1">Standalone microservice designed for PaddleOCR processing and ML inference.</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-left border border-slate-800">
          <Database className="w-8 h-8 text-emerald-400 mb-3" />
          <h3 className="font-semibold text-white">MongoDB & Mongoose</h3>
          <p className="text-sm text-slate-400 mt-1">High-performance document storage for OCR records, metadata, and user history.</p>
        </div>
      </div>
    </div>
  );
};

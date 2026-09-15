import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanText, History, User, Activity, ArrowRight, LogOut, Mail, Tag, ImageIcon, Plus, Scan, Layers, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { imageService } from '../services/imageService';
import { ImageRecord } from '../types';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [recentImages, setRecentImages] = useState<ImageRecord[]>([]);

  useEffect(() => {
    const fetchRecentImages = async () => {
      try {
        const response = await imageService.getImages();
        if (response.success && response.data.images) {
          setRecentImages(response.data.images.slice(0, 3));
        }
      } catch (err) {
        // Silently fail if images fail to load on dashboard
      }
    };

    fetchRecentImages();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-8">
      {/* Header Banner with Authenticated User Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Welcome back, {user?.displayName || 'User'}!
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                {user?.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                @{user?.username}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase text-[10px]">
                ROLE: {user?.role || 'user'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 font-medium text-xs transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Smart Camera Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-rose-500/50 transition-all group flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-500 text-[10px] font-bold text-white uppercase tracking-wider">
            Phase 8
          </div>
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Smart Camera</h2>
            <p className="text-sm text-slate-400 mt-2 mb-4">
              Capture live webcam photos with instant full-stack multimodal AI detection & text recognition.
            </p>
          </div>
          <Link
            to="/camera"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-medium text-sm shadow-md shadow-rose-600/20 transition-all"
          >
            Launch Camera
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* OCR Button Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <ScanText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">OCR & Translation</h2>
            <p className="text-sm text-slate-400 mt-2 mb-4">
              Extract multi-language text using PaddleOCR and translate results into English, Vietnamese, or Chinese.
            </p>
          </div>
          <Link
            to="/ocr"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all"
          >
            Launch OCR
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Object Detection Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-violet-500/50 transition-all group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
              <Scan className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">YOLO Detection</h2>
            <p className="text-sm text-slate-400 mt-2 mb-4">
              Detect 80+ object classes with bounding box visualization, confidence filtering, and class summaries.
            </p>
          </div>
          <Link
            to="/object-detection"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-all"
          >
            Launch YOLO
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* AI Multimodal Understanding Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all group flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-bold text-slate-950 uppercase tracking-wider">
            Phase 7
          </div>
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">AI Understanding</h2>
            <p className="text-sm text-slate-400 mt-2 mb-4">
              Multi-model fusion: SegFormer semantic regions + YOLO objects + OCR text + grounded scene synthesis.
            </p>
          </div>
          <Link
            to="/image-analysis"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-md shadow-emerald-600/20 transition-all"
          >
            Launch Studio
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* History Button Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-all group flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">History & Gallery</h2>
            <p className="text-sm text-slate-400 mt-2 mb-4">
              Review your uploaded Cloudinary images, OCR transcriptions, YOLO detection logs, and AI fusion reports.
            </p>
          </div>
          <Link
            to="/history"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-all"
          >
            View History
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Uploaded Images Section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-400" /> Recent Uploaded Images
          </h3>
          <Link to="/history" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
            View All ({recentImages.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentImages.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            No recent uploaded images. <Link to="/ocr" className="text-indigo-400 hover:underline">Upload an image</Link> to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recentImages.map((img) => (
              <div key={img.id} className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden flex items-center gap-3 p-3">
                <img src={img.imageUrl} alt={img.originalName} className="w-12 h-12 rounded-lg object-cover bg-slate-950 border border-slate-800" />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-semibold text-white truncate">{img.originalName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{(img.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Status Summary */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" /> System Metrics & Session
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Authentication</span>
            <div className="text-sm font-bold text-emerald-400 mt-1">JWT Active</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Storage Provider</span>
            <div className="text-sm font-bold text-indigo-400 mt-1">Cloudinary</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Backend Gateway</span>
            <div className="text-sm font-bold text-purple-400 mt-1">NestJS (Port 3000)</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Database</span>
            <div className="text-sm font-bold text-emerald-400 mt-1">MongoDB Atlas</div>
          </div>
        </div>
      </div>
    </div>
  );
};

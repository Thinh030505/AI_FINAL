import React, { useState } from 'react';
import { imageService } from '../services/imageService';
import { ocrService } from '../services/ocrService';
import { translationService } from '../services/translationService';
import { OCRResultRecord, ImageRecord, TranslationRecord } from '../types';

export const OCRPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [uploadedImage, setUploadedImage] = useState<ImageRecord | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResultRecord | null>(null);
  const [translationResult, setTranslationResult] = useState<TranslationRecord | null>(null);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Translation Studio State
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('en');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadedImage(null);
      setOcrResult(null);
      setTranslationResult(null);
      setErrorMessage(null);
    }
  };

  const handleUploadAndRunOcr = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setIsUploading(true);
    setOcrResult(null);
    setTranslationResult(null);

    try {
      // Step 1: Upload image to NestJS Backend (Cloudinary)
      const imgRes = await imageService.uploadImage(selectedFile);
      setUploadedImage(imgRes.data.image);
      setIsUploading(false);

      // Step 2: Trigger PaddleOCR Processing
      setIsOcrProcessing(true);
      const ocrRes = await ocrService.processOcr(imgRes.data.image.id);
      setOcrResult(ocrRes.data.ocrResult);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'An error occurred during OCR recognition');
    } finally {
      setIsUploading(false);
      setIsOcrProcessing(false);
    }
  };

  const handleCopyOcr = () => {
    if (ocrResult?.fullText) {
      navigator.clipboard.writeText(ocrResult.fullText);
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    }
  };

  const handleCopyTranslation = () => {
    if (translationResult?.translatedText) {
      navigator.clipboard.writeText(translationResult.translatedText);
      setCopiedTrans(true);
      setTimeout(() => setCopiedTrans(false), 2000);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      setSourceLang('en');
      setTargetLang('vi');
    } else {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
  };

  const handleTranslate = async () => {
    if (!ocrResult?.fullText) return;

    setIsTranslating(true);
    setErrorMessage(null);

    try {
      const res = await translationService.translate(
        ocrResult.fullText,
        sourceLang,
        targetLang,
      );
      setTranslationResult(res.data.translation);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    if (pct >= 95) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
          High confidence ({pct}%)
        </span>
      );
    }
    if (pct >= 80) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
          Medium confidence ({pct}%)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">
        Low confidence ({pct}%)
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100">High-Precision AI OCR & Translation Studio</h1>
        <p className="text-slate-400 text-sm mt-1">
          Multi-pass adaptive PaddleOCR text extraction with Vietnamese diacritic preservation and auto translation.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      {/* Main Grid: Left Upload & Scan / Right OCR Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Upload & Preview */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">1. Select Document / Screenshot Image</h2>

            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors relative bg-slate-950/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <div className="text-4xl">📸</div>
                <div className="text-sm font-medium text-slate-300">
                  {selectedFile ? selectedFile.name : 'Drag & drop image file or click to browse'}
                </div>
                <div className="text-xs text-slate-500">Supports PNG, JPG, JPEG, WEBP</div>
              </div>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex justify-center max-h-80">
                <img src={previewUrl} alt="Scan preview" className="object-contain max-h-72 rounded-lg" />
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleUploadAndRunOcr}
              disabled={!selectedFile || isUploading || isOcrProcessing}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin text-lg">🌀</span>
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : isOcrProcessing ? (
                <>
                  <span className="animate-spin text-lg">⚡</span>
                  <span>PaddleOCR Recognition Running...</span>
                </>
              ) : (
                <>
                  <span>✨ Start High-Precision OCR Scan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: OCR Extracted Text */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">2. Extracted Vietnamese & English Text</h2>
              {ocrResult && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs text-blue-400 hover:underline px-2 py-1 bg-blue-950/60 rounded border border-blue-900"
                  >
                    {showDebug ? 'Hide Debug' : 'Debug Mode'}
                  </button>
                  <button
                    onClick={handleCopyOcr}
                    className="px-3 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                  >
                    {copiedOcr ? '✓ Copied!' : '📋 Copy Text'}
                  </button>
                </div>
              )}
            </div>

            {/* OCR Processing Indicator */}
            {isOcrProcessing && (
              <div className="p-8 text-center space-y-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <div className="inline-block animate-spin text-3xl text-blue-400">⚡</div>
                <div className="text-sm text-slate-300 font-medium">Running Multi-Pass PaddleOCR Inference...</div>
                <div className="text-xs text-slate-500">Applying adaptive Lanczos upscaling & spatial box line ordering...</div>
              </div>
            )}

            {/* OCR Result View */}
            {!isOcrProcessing && ocrResult && (
              <div className="space-y-4">
                {/* Metrics Summary */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    ⏱️ Latency: {ocrResult.processingTimeMs} ms
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    📝 Lines: {ocrResult.lines.length}
                  </span>
                  {ocrResult.avgConfidence !== undefined && (
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      🎯 Avg Confidence: {Math.round((ocrResult.avgConfidence || 0) * 100)}%
                    </span>
                  )}
                  {ocrResult.isUncertain && (
                    <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-400 border border-amber-800">
                      ⚠️ Contains Uncertain Tokens
                    </span>
                  )}
                </div>

                {/* Full Extracted Text Box */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-sm text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed selection:bg-blue-600 selection:text-white">
                  {ocrResult.fullText || <span className="text-slate-500 italic">No text detected in image.</span>}
                </div>

                {/* Debug Info Mode */}
                {showDebug && (
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-blue-900/60 text-xs font-mono space-y-1 text-slate-300">
                    <div className="text-blue-400 font-semibold mb-1">🛠️ OCR Pipeline Debug Metadata:</div>
                    <div>Selected Pass: {ocrResult.debug?.selectedPass || 1}</div>
                    <div>Avg Confidence: {ocrResult.avgConfidence}</div>
                    <div>Min Confidence: {ocrResult.minConfidence}</div>
                    <div>Detected Lines: {ocrResult.lines.length}</div>
                    <div>Raw OCR Output: "{ocrResult.rawFullText}"</div>
                  </div>
                )}

                {/* Detected Line Confidence Badges */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  <div className="text-xs font-semibold text-slate-400">Detailed Detected Lines:</div>
                  {ocrResult.lines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                      <span className="font-mono text-slate-300 truncate max-w-xs">{line.text}</span>
                      {getConfidenceBadge(line.confidence)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isOcrProcessing && !ocrResult && (
              <div className="p-12 text-center text-slate-500 text-sm border border-slate-800/60 rounded-xl bg-slate-950/30">
                Upload an image and click "Start High-Precision OCR Scan" to view extracted text.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LOWER SECTION: AI OCR Text Translation Studio */}
      {ocrResult && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100">3. AI OCR Text Translation Studio</h2>
              <p className="text-xs text-slate-400 mt-0.5">Translate high-precision extracted OCR text between Vietnamese and English.</p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {/* Source Language */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Source:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-slate-900 text-slate-200 text-sm border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto Detect</option>
                <option value="vi">Vietnamese (vi)</option>
                <option value="en">English (en)</option>
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwapLanguages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Swap Languages"
            >
              ⇄
            </button>

            {/* Target Language */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Target:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-slate-900 text-slate-200 text-sm border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English (en)</option>
                <option value="vi">Vietnamese (vi)</option>
              </select>
            </div>

            {/* Translate Button */}
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !ocrResult.fullText}
              className="ml-auto px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center space-x-2 shadow-lg shadow-indigo-900/20"
            >
              {isTranslating ? (
                <>
                  <span className="animate-spin">🌐</span>
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <span>🌐 Translate OCR Text</span>
                </>
              )}
            </button>
          </div>

          {/* Translation Output Box */}
          {translationResult && (
            <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-indigo-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400">
                  Translated Text ({translationResult.sourceLanguage} → {translationResult.targetLanguage}):
                </span>
                <button
                  onClick={handleCopyTranslation}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
                >
                  {copiedTrans ? '✓ Copied!' : '📋 Copy Translation'}
                </button>
              </div>
              <div className="font-mono text-sm text-indigo-100 whitespace-pre-wrap leading-relaxed">
                {translationResult.translatedText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

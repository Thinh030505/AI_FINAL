import React, { useState } from 'react';
import {
  ScanText,
  Upload,
  Copy,
  Check,
  Languages,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { ocrService } from '../services/ocrService';
import { translationService } from '../services/translationService';
import { OCRResultRecord, ImageRecord, TranslationRecord } from '../types';
import { Button } from '../components/ui/Button';
import { LanguageSelector } from '../components/common/LanguageSelector';

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

  // Translation State
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>(() => localStorage.getItem('ai_vocab_target_lang') || 'vi');

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
      const imgRes = await imageService.uploadImage(selectedFile);
      setUploadedImage(imgRes.data.image);
      setIsUploading(false);

      setIsOcrProcessing(true);
      const ocrRes = await ocrService.processOcr(imgRes.data.image.id);
      setOcrResult(ocrRes.data.ocrResult);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Error during OCR scan');
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
        OCR Scanner
      </h1>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Upload & Preview (Left) / OCR & Translation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: Upload & Preview */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-6 text-center cursor-pointer transition-all relative bg-slate-50/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 mx-auto shadow-subtle">
                <Upload className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {selectedFile ? selectedFile.name : 'Choose or drop document / image'}
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 p-2 flex justify-center max-h-80">
              <img src={previewUrl} alt="Scan preview" className="object-contain max-h-72 rounded-xl" />
            </div>
          )}

          <Button
            onClick={handleUploadAndRunOcr}
            disabled={!selectedFile || isUploading || isOcrProcessing}
            isLoading={isUploading || isOcrProcessing}
            className="w-full"
            size="md"
            icon={<Sparkles className="w-4 h-4" />}
          >
            {isUploading ? 'Uploading...' : isOcrProcessing ? 'Scanning...' : 'Scan Text'}
          </Button>
        </div>

        {/* RIGHT COLUMN: OCR Extracted Text & Translation */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 space-y-5">
          
          {/* Section 1: Extracted Text */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Extracted Text
              </span>
              {ocrResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOcr}
                  icon={copiedOcr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedOcr ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>

            {isOcrProcessing ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                Scanning image...
              </div>
            ) : ocrResult ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {ocrResult.fullText}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                Extracted text will appear here.
              </div>
            )}
          </div>

          {/* Section 2: Instant Translation */}
          {ocrResult && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Translation
                </span>
                {translationResult && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTranslation}
                    icon={copiedTrans ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedTrans ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </div>

              {/* Language Selection Row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Translate to:</span>
                  <LanguageSelector
                    value={targetLang}
                    onChange={(code) => setTargetLang(code)}
                    className="w-48"
                  />
                </div>

                <Button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  isLoading={isTranslating}
                  variant="primary"
                  size="sm"
                  icon={<Languages className="w-3.5 h-3.5" />}
                  className="ml-auto"
                >
                  {isTranslating ? 'Translating...' : 'Translate'}
                </Button>
              </div>

              {/* Translation Output Box */}
              {translationResult && (
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 font-sans text-xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-subtle">
                  {translationResult.translatedText}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default OCRPage;

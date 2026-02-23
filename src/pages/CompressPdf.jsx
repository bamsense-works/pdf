import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Minimize2, ArrowRight, RefreshCw, Check, BarChart3, Leaf, Zap } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { compressPdf, getPdfPageCount } from '../utils/pdfUtils';
import { parsePageRange } from '../utils/pageRange';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';
import { loadSetting, saveSetting } from '../utils/storage';
import * as pdfjsLib from 'pdfjs-dist';
import ProgressOverlay from '../components/ProgressOverlay';

const workerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const CompressPdf = () => {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState(() => loadSetting('bamsense-compress-settings', {}).level || 'medium');
  const [quality, setQuality] = useState(() => loadSetting('bamsense-compress-settings', {}).quality || 0.6);
  const [pageCount, setPageCount] = useState(0);
  const [applyAll, setApplyAll] = useState(() => loadSetting('bamsense-compress-settings', {}).applyAll ?? true);
  const [rangeInput, setRangeInput] = useState(() => loadSetting('bamsense-compress-settings', {}).rangeInput || '');
  const [previewPage, setPreviewPage] = useState(1);
  const [compressedPreview, setCompressedPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [presets, setPresets] = useState(() => loadSetting('bamsense-compress-presets', []));
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [finalSize, setFinalSize] = useState(null);
  const { addToast } = useToast();
  const location = useLocation();
  const initialFilesProcessed = React.useRef(false);

  useEffect(() => {
    if (!initialFilesProcessed.current && location.state?.initialFiles && location.state.initialFiles.length > 0) {
      initialFilesProcessed.current = true;
      handleFileSelected(location.state.initialFiles);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    saveSetting('bamsense-compress-settings', {
      level,
      quality,
      applyAll,
      rangeInput
    });
  }, [level, quality, applyAll, rangeInput]);

  const handleFileSelected = (files) => {
    if (files.length > 0) {
      const selected = files[0];
      setFile(selected);
      setApplyAll(true);
      setRangeInput('');
      setPreviewPage(1);
      setCompressedPreview(null);
      getPdfPageCount(selected)
        .then(setPageCount)
        .catch(() => setPageCount(0));
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const estimates = useMemo(() => {
    if (!file) return {};
    return {
      low: Math.round(file.size * 0.95),
      medium: Math.round(file.size * 0.85),
      high: Math.round(file.size * 0.4) // Rasterization cuts huge amounts
    };
  }, [file]);

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      let pageIndices = null;
      if (level === 'high' && !applyAll && rangeInput.trim()) {
        const parsed = parsePageRange(rangeInput, pageCount);
        if (parsed.length === 0) {
          addToast("No valid pages in range.", "error");
          setIsProcessing(false);
          return;
        }
        pageIndices = parsed;
      }
      const options = level === 'high'
        ? { quality: parseFloat(quality), pageIndices, onProgress: setProgress }
        : {};
      const compressedBlob = await compressPdf(file, level, options);
      const url = URL.createObjectURL(compressedBlob);
      setDownloadUrl(url);
      setFinalSize(compressedBlob.size);
      
      if (compressedBlob.size < file.size) {
        addToast("Compression complete!", "success");
      } else {
        addToast("File was already optimized.", "info");
      }
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Compression failed.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const reset = () => {
    setFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setFinalSize(null);
    setLevel('medium');
    setQuality(0.6);
    setApplyAll(true);
    setRangeInput('');
    setPageCount(0);
    setPreviewPage(1);
    setCompressedPreview(null);
    setSelectedPreset('');
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets, { name, level, quality }];
    setPresets(next);
    saveSetting('bamsense-compress-presets', next);
    setPresetName('');
    addToast("Preset saved!", "success");
  };

  const applyPreset = (name) => {
    const preset = presets.find((p) => p.name === name);
    if (!preset) return;
    setLevel(preset.level);
    if (preset.quality !== undefined) setQuality(preset.quality);
  };

  const deletePreset = (name) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    saveSetting('bamsense-compress-presets', next);
    setSelectedPreset('');
  };

  useEffect(() => {
    let active = true;
    const renderPreview = async () => {
      if (!file || level !== 'high') {
        setCompressedPreview(null);
        return;
      }
      try {
        setPreviewLoading(true);
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const page = await pdf.getPage(Math.min(previewPage, pdf.numPages));
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', parseFloat(quality));
        if (active) setCompressedPreview(dataUrl);
        pdf.destroy?.();
      } catch {
        if (active) setCompressedPreview(null);
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    renderPreview();
    return () => {
      active = false;
    };
  }, [file, level, quality, previewPage]);

  if (downloadUrl) {
    const savings = file.size - finalSize;
    const savingsPercent = Math.max(0, Math.round((savings / file.size) * 100));
    const isEffective = savings > 1024; // At least 1KB saved

    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-6">
             <div className="rounded-lg overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
                <PdfThumbnail url={downloadUrl} pageIndex={0} width={200} />
             </div>
          </div>
          
          <h2 className={styles.title}>{isEffective ? "PDF Compressed!" : "Optimization Complete"}</h2>
          
          <div className="flex items-center justify-center gap-4 mb-6">
             <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Original</p>
                <p className="text-lg font-mono text-slate-500 line-through">{formatSize(file.size)}</p>
             </div>
             <ArrowRight size={20} className="text-accent-secondary" />
             <div className="text-left">
                <p className="text-xs text-accent-secondary uppercase tracking-wider font-bold">New Size</p>
                <p className="text-2xl font-mono font-bold text-accent-primary">{formatSize(finalSize)}</p>
             </div>
          </div>
          
          {isEffective ? (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full inline-block font-medium text-sm mb-6 border border-emerald-100">
               Saved {formatSize(savings)} ({savingsPercent}%)
            </div>
          ) : (
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg inline-block font-medium text-sm mb-6 border border-blue-100 text-left max-w-sm">
               <p className="font-bold mb-1">Already Optimized</p>
               <p className="text-xs opacity-80">This file is very efficient. To reduce it further, try "Extreme" mode (converts text to images).</p>
            </div>
          )}

          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto">
            <a 
              href={downloadUrl} 
              download={`bamsense_compressed_${Date.now()}.pdf`} 
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download Result
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Try another compression setting"
            >
              <RefreshCw size={16} className="mr-2" /> Try another setting
            </button>
          </div>
        </div>
      </div>
    );
  }

  const options = [
    {
      id: 'low',
      title: 'Light',
      desc: 'Removes metadata only.',
      icon: Leaf,
      color: '#10b981',
      bg: 'bg-emerald-50'
    },
    {
      id: 'medium',
      title: 'Balanced',
      desc: 'Standard optimization.',
      icon: BarChart3,
      color: '#3b82f6',
      bg: 'bg-blue-50'
    },
    {
      id: 'high',
      title: 'Extreme',
      desc: 'Rasterizes pages. Text becomes images.',
      icon: Zap,
      color: '#f59e0b',
      bg: 'bg-amber-50'
    }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
      <div className={styles.header}>
        <h2 className={styles.title}>Compress PDF</h2>
        <p className={styles.subtitle}>Reduce file size. Use "Extreme" for maximum reduction.</p>
      </div>

      {!file ? (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <FileUploader onFilesSelected={handleFileSelected} multiple={false} label="Select PDF file" buttonLabel="Select PDF file" />
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '2rem'
        }}>
          
          {/* File Badge */}
          <div style={{ 
            background: 'var(--bg-secondary)', padding: '0.75rem 1.5rem', borderRadius: '12px',
            border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', gap: '1rem'
          }}>
             <Minimize2 size={20} className="text-accent-secondary" />
             <span className="font-semibold">{file.name}</span>
             <span className="text-sm text-secondary bg-slate-100 px-2 py-1 rounded">{formatSize(file.size)}</span>
             <button onClick={reset} className="text-red-400 hover:text-red-500 ml-4">
                <RefreshCw size={16} />
             </button>
          </div>

          {/* Options Grid */}
          <div style={{ width: '100%', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Preview</span>
              <div className="flex items-center gap-2 text-sm text-secondary">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={pageCount || 1}
                  value={previewPage}
                  onChange={(e) => setPreviewPage(Math.max(1, Math.min(pageCount || 1, Number(e.target.value))))}
                  className="w-20 px-2 py-1 rounded border border-slate-200"
                  aria-label="Preview page number"
                />
                <span className="text-xs text-slate-400">/ {pageCount || 1}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: level === 'high' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                <div className="text-xs font-semibold text-slate-500 p-2 border-b border-slate-100">Original</div>
                <PdfThumbnail file={file} pageIndex={Math.max(0, previewPage - 1)} width={240} />
              </div>
              {level === 'high' && (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <div className="text-xs font-semibold text-slate-500 p-2 border-b border-slate-100">Extreme Preview</div>
                  <div className="flex items-center justify-center min-h-[240px] bg-slate-50">
                    {previewLoading && <div className="w-6 h-6 border-2 border-slate-300 border-t-accent-secondary rounded-full animate-spin" />}
                    {!previewLoading && compressedPreview && (
                      <img src={compressedPreview} alt="Compressed preview" className="block max-w-full h-auto" />
                    )}
                    {!previewLoading && !compressedPreview && (
                      <span className="text-xs text-slate-400">Preview unavailable</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {level !== 'high' && (
              <p className="text-xs text-slate-500 mt-2">Light and Balanced modes only remove metadata and optimize structure.</p>
            )}
          </div>

          <div style={{ width: '100%', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-700">Presets</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => {
                    setSelectedPreset(e.target.value);
                    applyPreset(e.target.value);
                  }}
                  className="px-2 py-1 text-sm border border-slate-200 rounded"
                >
                  <option value="">Select preset</option>
                  {presets.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
                {selectedPreset && (
                  <button onClick={() => deletePreset(selectedPreset)} className="btn text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded">
                    Delete
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="px-2 py-1 text-sm border border-slate-200 rounded"
                />
                <button onClick={savePreset} className="btn text-xs bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 px-2 py-1 rounded">
                  Save preset
                </button>
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1.5rem',
            width: '100%'
          }}>
             {options.map((opt) => (
               <div
                 key={opt.id}
                 onClick={() => setLevel(opt.id)}
                 style={{
                   cursor: 'pointer',
                   position: 'relative',
                   background: 'var(--card-bg)',
                   borderRadius: '16px',
                   border: level === opt.id ? `2px solid ${opt.color}` : '2px solid transparent',
                   padding: '1.5rem',
                   boxShadow: level === opt.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                   transition: 'all 0.2s ease',
                   transform: level === opt.id ? 'translateY(-4px)' : 'none'
                 }}
                 className="group hover:bg-slate-50"
               >
                 <div style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: level === opt.id ? `2px solid ${opt.color}` : '2px solid var(--border-color)',
                    background: level === opt.id ? opt.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', transition: 'all 0.2s'
                 }}>
                    {level === opt.id && <Check size={14} />}
                 </div>

                 <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem',
                    color: opt.color,
                    background: level === opt.id ? opt.bg : 'var(--bg-primary)'
                 }}>
                    <opt.icon size={24} />
                 </div>

                 <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{opt.title}</h3>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{opt.desc}</p>
                 
                 <div style={{ 
                    background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '8px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Target</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: opt.color }}>
                       ~{formatSize(estimates[opt.id])}
                    </span>
                 </div>
               </div>
             ))}
          </div>

          {level === 'high' && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 w-full">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-amber-800">Image Quality</label>
                <span className="text-sm font-mono text-amber-800">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full cursor-pointer"
                aria-label="Extreme compression image quality"
              />
              <p className="text-xs text-amber-700 mt-2">
                Lower quality yields smaller files. Extreme mode converts text to images, so search and copy will not work.
              </p>
              <label className="flex items-center gap-2 text-sm text-amber-800 mt-4">
                <input
                  type="checkbox"
                  checked={applyAll}
                  onChange={(e) => setApplyAll(e.target.checked)}
                />
                Rasterize all pages
              </label>
              {!applyAll && (
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="Page range (e.g. 1-3, 6)"
                  className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-amber-100 bg-white"
                  aria-label="Page range"
                />
              )}
            </div>
          )}

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px', marginTop: '1rem' }}>
             <button onClick={reset} className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)' }}>
               Cancel
             </button>
             <button onClick={handleCompress} className="btn btn-action" style={{ flex: 1.5 }}>
               Compress PDF <ArrowRight size={18} className="ml-2" />
             </button>
          </div>

        </div>
      )}
      {isProcessing && <ProgressOverlay label="Compressing..." progress={progress} />}
    </div>
  );
};

export default CompressPdf;

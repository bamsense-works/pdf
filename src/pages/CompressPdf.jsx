import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Minimize2, ArrowRight, RefreshCw, Download, Check, BarChart3, Leaf, Zap, AlertTriangle } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { compressPdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import styles from './MergePdf.module.css';

const CompressPdf = () => {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState('medium');
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

  const handleFileSelected = (files) => {
    if (files.length > 0) setFile(files[0]);
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const compressedBlob = await compressPdf(file, level);
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
      addToast("Compression failed.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setFinalSize(null);
    setLevel('medium');
  };

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
      desc: 'Rasterizes pages. Text becomes image.',
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
          <FileUploader onFilesSelected={handleFileSelected} multiple={false} />
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
      {isProcessing && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}
    </div>
  );
};

export default CompressPdf;

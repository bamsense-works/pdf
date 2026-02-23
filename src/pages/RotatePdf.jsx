import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RotateCw, RotateCcw, ArrowRight, RefreshCw, Undo2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { rotatePdf, getPdfPageCount } from '../utils/pdfUtils';
import { parsePageRange } from '../utils/pageRange';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';
import { loadSetting, saveSetting } from '../utils/storage';

const RotatePdf = () => {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [rotation, setRotation] = useState(() => loadSetting('bamsense-rotate-settings', {}).rotation || 0);
  const [applyAll, setApplyAll] = useState(() => loadSetting('bamsense-rotate-settings', {}).applyAll ?? true);
  const [rangeInput, setRangeInput] = useState(() => loadSetting('bamsense-rotate-settings', {}).rangeInput || '');
  const [previewPage, setPreviewPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
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
    saveSetting('bamsense-rotate-settings', {
      rotation,
      applyAll,
      rangeInput
    });
  }, [rotation, applyAll, rangeInput]);

  const handleFileSelected = (files) => {
    if (files.length > 0) {
      const selected = files[0];
      setFile(selected);
      setRotation(0); // Reset rotation on new file
      setApplyAll(true);
      setRangeInput('');
      setPreviewPage(1);
      getPdfPageCount(selected)
        .then((count) => {
          setPageCount(count);
          setPreviewPage(1);
        })
        .catch(() => setPageCount(0));
    }
  };

  const handleRotateLeft = () => setRotation(prev => (prev - 90) % 360);
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);
  const handleResetRotation = () => setRotation(0);

  const handleProcess = async () => {
    if (!file) return;
    if (rotation === 0) {
      addToast("No rotation selected.", "info");
      return;
    }

    let pageIndices = null;
    if (!applyAll && rangeInput.trim()) {
      const parsed = parsePageRange(rangeInput, pageCount);
      if (parsed.length === 0) {
        addToast("No valid pages in range.", "error");
        return;
      }
      pageIndices = parsed;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const rotatedBlob = await rotatePdf(file, rotation, { pageIndices });
      const url = URL.createObjectURL(rotatedBlob);
      setDownloadUrl(url);
      addToast("PDF rotated successfully!", "success");
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Rotation failed.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setRotation(0);
    setPageCount(0);
    setApplyAll(true);
    setRangeInput('');
    setPreviewPage(1);
  };

  if (downloadUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-6">
             <div className="rounded-lg overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
                <PdfThumbnail url={downloadUrl} pageIndex={0} width={240} />
             </div>
          </div>
          <h2 className={styles.title}>PDF Rotated!</h2>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto mt-6">
            <a 
              href={downloadUrl} 
              download="bamsense_rotated.pdf" 
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download PDF
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Rotate another PDF"
            >
              <RefreshCw size={16} className="mr-2" /> Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
      <div className={styles.header}>
        <h2 className={styles.title}>Rotate PDF</h2>
        <p className={styles.subtitle}>Permanently rotate your PDF pages to the correct orientation.</p>
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
          
          {/* Workboard */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '2rem', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
             
             {/* File Info Badge */}
             <div style={{ 
               position: 'absolute', top: '1rem', left: '1rem', 
               background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '20px',
               fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500
             }}>
               {file.name}
             </div>

             {/* The Preview */}
             <div style={{ 
               margin: '2rem 0',
               transition: 'all 0.3s ease',
               filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' 
             }}>
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <PdfThumbnail 
                    file={file} 
                    pageIndex={Math.max(0, previewPage - 1)} 
                    width={300} 
                    rotation={rotation}
                    className="block"
                  />
                </div>
             </div>

             {/* Rotation Controls */}
             <div style={{ 
               display: 'flex', gap: '1rem', alignItems: 'center',
               background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '12px'
             }}>
                <button 
                  onClick={handleRotateLeft}
                  className="btn"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '50px', height: '50px', padding: 0 }}
                  title="Rotate Left (-90°)"
                  aria-label="Rotate left 90 degrees"
                >
                  <RotateCcw size={20} />
                </button>

                <div style={{ 
                   width: '80px', textAlign: 'center', fontFamily: 'monospace', 
                   fontWeight: 700, color: 'var(--text-primary)' 
                }}>
                  {rotation}°
                </div>

                <button 
                  onClick={handleRotateRight}
                  className="btn"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '50px', height: '50px', padding: 0 }}
                  title="Rotate Right (+90°)"
                  aria-label="Rotate right 90 degrees"
                >
                  <RotateCw size={20} />
                </button>

                <div style={{ width: '1px', height: '30px', background: 'var(--border-color)', margin: '0 0.5rem' }} />

                <button 
                  onClick={handleResetRotation}
                  className="btn"
                  style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8rem', gap: '0.5rem' }}
                  title="Reset to 0°"
                  aria-label="Reset rotation"
                >
                  <Undo2 size={16} /> Reset
                </button>
             </div>

             <div style={{ marginTop: '1.25rem', width: '100%', maxWidth: '420px' }}>
               <div className="flex items-center gap-2 text-sm text-secondary">
                 <span>Preview page</span>
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
               <label className="flex items-center gap-2 text-sm text-secondary">
                 <input
                   type="checkbox"
                   checked={applyAll}
                   onChange={(e) => setApplyAll(e.target.checked)}
                 />
                 Apply to all pages
               </label>
               {!applyAll && (
                 <input
                   type="text"
                   value={rangeInput}
                   onChange={(e) => setRangeInput(e.target.value)}
                   placeholder="Page range (e.g. 1-3, 6)"
                   className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                   aria-label="Page range"
                 />
               )}
             </div>

          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px' }}>
             <button onClick={reset} className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)' }}>
               Cancel
             </button>
             <button onClick={handleProcess} className="btn btn-action" style={{ flex: 1.5 }}>
               Rotate PDF <ArrowRight size={18} className="ml-2" />
             </button>
          </div>

        </div>
      )}
      {isProcessing && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}
    </div>
  );
};

export default RotatePdf;

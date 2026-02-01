import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Scissors, ArrowRight, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { splitPdf, getPdfPageCount } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import styles from './MergePdf.module.css';

const SplitPdf = () => {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
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

  const handleFileSelected = async (files) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      const count = await getPdfPageCount(selectedFile);
      setPageCount(count);
      setSelectedPages(new Set()); 
    }
  };

  const togglePage = (index) => {
    const newSet = new Set(selectedPages);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedPages(newSet);
  };

  const getRangeString = () => {
    const sorted = Array.from(selectedPages).sort((a, b) => a - b);
    return sorted.map(i => i + 1).join(', ');
  };

  const handleSplit = async () => {
    const range = getRangeString();
    if (!file || !range) return;
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const splitBlob = await splitPdf(file, range);
      const url = URL.createObjectURL(splitBlob);
      setDownloadUrl(url);
      addToast("Pages extracted successfully!", "success");
    } catch (error) {
      console.error(error);
      addToast("Selection failed.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setSelectedPages(new Set());
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  };

  if (downloadUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-4">
             <div className="rounded-lg overflow-hidden shadow-lg border border-slate-200 bg-white">
                <PdfThumbnail url={downloadUrl} pageIndex={0} width={200} />
             </div>
          </div>
          <h2 className={styles.title}>Split Complete!</h2>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto mt-6">
            <a 
              href={downloadUrl} 
              download="bamsense_extracted.pdf" 
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download PDF
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" /> Split another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Split PDF</h2>
        <p className={styles.subtitle}>Select the pages you want to extract.</p>
      </div>

      {!file ? (
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6 px-4">
             <div className="flex items-center gap-2">
                <Scissors size={20} className="text-accent-secondary" />
                <span className="font-semibold">{file.name}</span>
             </div>
             <button 
               onClick={reset} 
               className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
             >
               <Trash2 size={16} /> Change file
             </button>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-secondary">
              Selected: <span className="font-bold text-accent-primary">{selectedPages.size > 0 ? getRangeString() : "None"}</span>
            </p>
          </div>

          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              maxHeight: '60vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-secondary)', // Use variable for theme support
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}
          >
            {Array.from({ length: pageCount }).map((_, i) => {
              const isSelected = selectedPages.has(i);
              return (
                <div 
                  key={i}
                  onClick={() => togglePage(i)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 border-2 group ${isSelected ? 'border-accent-secondary ring-2 ring-accent-secondary/20' : 'border-transparent hover:border-slate-300'}`}
                >
                  <PdfThumbnail 
                    file={file} 
                    pageIndex={i} 
                    width={150} 
                    className="w-full pointer-events-none" 
                  />
                  
                  {/* Selection Overlay */}
                  <div className={`absolute inset-0 transition-opacity duration-200 ${isSelected ? 'bg-accent-secondary/20 opacity-100' : 'bg-black/0 opacity-0 group-hover:bg-black/5'}`} />

                  {/* Checkbox Indicator */}
                  <div className={`absolute top-2 right-2 transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${isSelected ? 'bg-accent-secondary text-white' : 'bg-white text-slate-300 border border-slate-200'}`}>
                      {isSelected ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                    </div>
                  </div>
                  
                  <div className={`absolute bottom-0 inset-x-0 p-1 text-center text-xs font-bold transition-colors ${isSelected ? 'bg-accent-secondary text-white' : 'bg-black/50 text-white'}`}>
                    Page {i + 1}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.actionBar}>
             <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>Cancel</button>
             <button onClick={handleSplit} className="btn btn-action" disabled={selectedPages.size === 0}>
               Extract Selection <ArrowRight size={18} className="ml-2" />
             </button>
          </div>
        </div>
      )}
      {isProcessing && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}
    </div>
  );
};

export default SplitPdf;

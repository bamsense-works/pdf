import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Scissors, ArrowRight, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { splitPdf, splitPdfToZip, getPdfPageCount } from '../utils/pdfUtils';
import { parsePageRange, toPageRangeString } from '../utils/pageRange';
import { classifyPdfError } from '../utils/pdfErrors';
import { useToast } from '../components/ToastProvider';
import styles from './ToolPage.module.css';
import { loadSetting, saveSetting } from '../utils/storage';
import ProgressOverlay from '../components/ProgressOverlay';

const SplitPdf = () => {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [lowRes, setLowRes] = useState(() => loadSetting('bamsense-split-settings', {}).lowRes ?? window.innerWidth < 640);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [progress, setProgress] = useState(null);
  const [downloadName, setDownloadName] = useState('bamsense_extracted.pdf');
  const [mode, setMode] = useState(() => loadSetting('bamsense-split-settings', {}).mode || 'selection');
  const [chunkSize, setChunkSize] = useState(() => loadSetting('bamsense-split-settings', {}).chunkSize || 2);
  const [groupRanges, setGroupRanges] = useState(() => loadSetting('bamsense-split-settings', {}).groupRanges || '');
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
    saveSetting('bamsense-split-settings', {
      mode,
      chunkSize,
      groupRanges,
      lowRes
    });
  }, [mode, chunkSize, groupRanges, lowRes]);

  const handleFileSelected = async (files) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      try {
        setFile(selectedFile);
        const count = await getPdfPageCount(selectedFile);
        setPageCount(count);
        setSelectedPages(new Set());
        setRangeInput('');
        setMode('selection');
        setChunkSize(2);
        setGroupRanges('');
      } catch (error) {
        console.error(error);
        const { message, type } = classifyPdfError(error, "Failed to read the PDF.");
        addToast(message, type);
        setFile(null);
        setPageCount(0);
        setSelectedPages(new Set());
        setRangeInput('');
        setMode('selection');
        setChunkSize(2);
        setGroupRanges('');
      }
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

  useEffect(() => {
    if (selectedPages.size === 0) {
      setRangeInput('');
      return;
    }
    setRangeInput(toPageRangeString(selectedPages));
  }, [selectedPages]);

  const handleSplit = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      if (mode === 'selection') {
        const range = toPageRangeString(selectedPages);
        if (!range) {
          addToast("Select at least one page.", "info");
          setIsProcessing(false);
          return;
        }
        const splitBlob = await splitPdf(file, range);
        const url = URL.createObjectURL(splitBlob);
        setDownloadUrl(url);
        setDownloadName('bamsense_extracted.pdf');
        addToast("Pages extracted successfully!", "success");
      } else if (mode === 'every') {
        const groups = Array.from({ length: pageCount }, (_, i) => [i]);
        const zipBlob = await splitPdfToZip(file, groups, { baseName: 'page', onProgress: setProgress });
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName('bamsense_pages.zip');
        addToast("Split into individual pages!", "success");
      } else if (mode === 'chunk') {
        const size = Math.max(1, Number(chunkSize));
        const groups = [];
        for (let i = 0; i < pageCount; i += size) {
          const group = [];
          for (let j = i; j < Math.min(pageCount, i + size); j += 1) group.push(j);
          groups.push(group);
        }
        const zipBlob = await splitPdfToZip(file, groups, { baseName: 'chunk', onProgress: setProgress });
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName('bamsense_chunks.zip');
        addToast("Split into chunks!", "success");
      } else if (mode === 'ranges') {
        const parts = groupRanges.split(';').map((p) => p.trim()).filter(Boolean);
        const groups = parts
          .map((part) => parsePageRange(part, pageCount))
          .filter((group) => group.length > 0);
        if (groups.length === 0) {
          addToast("No valid ranges found.", "error");
          setIsProcessing(false);
          return;
        }
        const zipBlob = await splitPdfToZip(file, groups, { baseName: 'range', onProgress: setProgress });
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName('bamsense_ranges.zip');
        addToast("Split into ranges!", "success");
      }
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Selection failed.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setSelectedPages(new Set());
    setRangeInput('');
    setMode('selection');
    setChunkSize(2);
    setGroupRanges('');
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setDownloadName('bamsense_extracted.pdf');
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const invertSelection = () => {
    const next = new Set();
    for (let i = 0; i < pageCount; i += 1) {
      if (!selectedPages.has(i)) next.add(i);
    }
    setSelectedPages(next);
  };

  const applyRange = () => {
    if (!rangeInput.trim()) {
      addToast("Enter a page range first.", "info");
      return;
    }
    const parsed = parsePageRange(rangeInput, pageCount);
    if (parsed.length === 0) {
      addToast("No valid pages found in that range.", "error");
      return;
    }
    setSelectedPages(new Set(parsed));
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
              download={downloadName}
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              {downloadName.endsWith('.zip') ? 'Download ZIP' : 'Download PDF'}
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Split another PDF"
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
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} label="Select PDF file" buttonLabel="Select PDF file" />
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
              Selected: <span className="font-bold text-accent-primary">{selectedPages.size > 0 ? toPageRangeString(selectedPages) : "None"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-secondary font-semibold">Split mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="px-2 py-1 text-sm border border-slate-200 rounded"
              >
                <option value="selection">Selected pages</option>
                <option value="every">Every page</option>
                <option value="chunk">Chunks</option>
                <option value="ranges">Ranges</option>
              </select>
            </div>
            {mode === 'chunk' && (
              <div className="flex items-center gap-2 text-sm">
                <label className="text-xs text-secondary">Pages per file</label>
                <input
                  type="number"
                  min={1}
                  max={pageCount || 1}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(e.target.value)}
                  className="w-20 px-2 py-1 text-sm border border-slate-200 rounded"
                />
              </div>
            )}
            {mode === 'ranges' && (
              <div className="flex items-center gap-2 text-sm">
                <label className="text-xs text-secondary">Ranges</label>
                <input
                  type="text"
                  value={groupRanges}
                  onChange={(e) => setGroupRanges(e.target.value)}
                  placeholder="e.g. 1-3; 4-6; 8"
                  className="w-56 px-2 py-1 text-sm border border-slate-200 rounded"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-4">
            <div className="flex flex-wrap gap-2">
              <button onClick={selectAll} className="btn text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg">Select all</button>
              <button onClick={clearSelection} className="btn text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg">Clear</button>
              <button onClick={invertSelection} className="btn text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg">Invert</button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="e.g. 1-3, 6, 9-12"
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white w-56"
                aria-label="Page range input"
              />
              <button onClick={applyRange} className="btn text-xs bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 px-3 py-1.5 rounded-lg">
                Apply range
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-secondary">
              <input type="checkbox" checked={lowRes} onChange={(e) => setLowRes(e.target.checked)} />
              Low-res previews
            </label>
          </div>

          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${lowRes ? 110 : 140}px, 1fr))`,
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      togglePage(i);
                    }
                  }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 border-2 group ${isSelected ? 'border-accent-secondary ring-2 ring-accent-secondary/20' : 'border-transparent hover:border-slate-300'}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Page ${i + 1}`}
                >
                  <PdfThumbnail 
                    file={file} 
                    pageIndex={i} 
                    width={lowRes ? 120 : 150} 
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
      {isProcessing && <ProgressOverlay label="Splitting..." progress={progress} />}
    </div>
  );
};

export default SplitPdf;

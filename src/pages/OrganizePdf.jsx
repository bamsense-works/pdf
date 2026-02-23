import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { LayoutGrid, X, ArrowRight, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { getPdfPageCount, organizePdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';

const OrganizePdf = () => {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [lowRes, setLowRes] = useState(() => window.innerWidth < 640);
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

  const handleFileSelected = async (files) => {
    if (files.length > 0) {
      const selected = files[0];
      try {
        setFile(selected);
        const count = await getPdfPageCount(selected);
        const pageArray = Array.from({ length: count }, (_, i) => ({
          id: `page-${i}`,
          originalIndex: i,
          rotation: 0
        }));
        setPages(pageArray);
      } catch (error) {
        console.error(error);
        const { message, type } = classifyPdfError(error, "Failed to read the PDF.");
        addToast(message, type);
        setFile(null);
        setPages([]);
      }
    }
  };

  const removePage = (id) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const rotatePage = (id) => {
    setPages(prev => prev.map(p => 
      p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
    ));
  };

  const handleOrganize = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const newPdfBlob = await organizePdf(file, pages);
      const url = URL.createObjectURL(newPdfBlob);
      setDownloadUrl(url);
      addToast("PDF organized successfully!", "success");
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Failed to organize PDF.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPages([]);
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
          <h2 className={styles.title}>PDF Organized!</h2>
          <div className="flex flex-col gap-4 items-center">
            <a href={downloadUrl} download="bamsense_organized.pdf" className="btn btn-action w-full max-w-[300px]">Download PDF</a>
            <button onClick={reset} className="btn text-secondary"><RefreshCw size={16} className="mr-2" /> Organize another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Organize PDF</h2>
        <p className={styles.subtitle}>Sort, rotate, or delete pages visually.</p>
      </div>

      {!file ? (
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} label="Select PDF file" buttonLabel="Select PDF file" />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6 px-4">
             <div className="flex items-center gap-2">
                <LayoutGrid size={20} className="text-accent-secondary" />
                <span className="font-semibold">{file.name}</span>
             </div>
             <button 
               onClick={reset} 
               className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
             >
                <Trash2 size={16} /> Remove file
             </button>
          </div>

          <p className="text-sm text-secondary text-center mb-4">
            Drag pages to reorder. Hover for rotate/delete.
          </p>
          <div className="flex justify-center mb-3">
            <label className="flex items-center gap-2 text-xs text-secondary">
              <input type="checkbox" checked={lowRes} onChange={(e) => setLowRes(e.target.checked)} />
              Low-res previews
            </label>
          </div>

          <Reorder.Group
            axis="y"
            values={pages}
            onReorder={setPages}
            className={styles.pageGrid}
          >
            <AnimatePresence>
              {pages.map((page, index) => (
                <Reorder.Item
                  layout
                  key={page.id}
                  value={page}
                  className="relative group"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <div
                    className="rounded-lg overflow-hidden shadow-sm border-2 border-transparent hover:border-accent-tertiary transition-all bg-white"
                  >
                    <PdfThumbnail
                      file={file}
                      pageIndex={page.originalIndex}
                      width={lowRes ? 140 : 180}
                      rotation={page.rotation}
                      className="w-full"
                    />
                  </div>

                  <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => rotatePage(page.id)}
                      className="p-2 bg-white/90 hover:bg-blue-50 text-accent-primary rounded-lg shadow-sm backdrop-blur-sm border border-slate-200 transition-colors"
                      title="Rotate 90°"
                      aria-label="Rotate page 90 degrees"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>

                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => removePage(page.id)}
                      className="p-2 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg shadow-sm backdrop-blur-sm border border-slate-200 transition-colors"
                      title="Delete Page"
                      aria-label="Delete page"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">
                    {index + 1}
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <div className={styles.actionBar}>
             <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>Cancel</button>
             <button onClick={handleOrganize} className="btn btn-action" disabled={pages.length === 0}>
               Save Changes <ArrowRight size={18} className="ml-2" />
             </button>
          </div>
        </div>
      )}
      {isProcessing && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}
    </div>
  );
};

export default OrganizePdf;

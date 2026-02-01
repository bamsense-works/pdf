import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, X, ArrowRight, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { getPdfPageCount, organizePdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import styles from './MergePdf.module.css';

const OrganizePdf = () => {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const { addToast } = useToast();

  const handleFileSelected = async (files) => {
    if (files.length > 0) {
      const selected = files[0];
      setFile(selected);
      const count = await getPdfPageCount(selected);
      const pageArray = Array.from({ length: count }, (_, i) => ({
        id: `page-${i}`,
        originalIndex: i,
        displayNum: i + 1,
        rotation: 0
      }));
      setPages(pageArray);
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
      addToast("Failed to organize PDF.", "error");
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
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} />
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
            Hover pages for options.
          </p>

          <motion.div 
            layout 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '1rem',
              padding: '1rem'
            }}
          >
            <AnimatePresence>
              {pages.map((page) => (
                <motion.div 
                  layout
                  key={page.id} 
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
                      width={180} 
                      rotation={page.rotation}
                      className="w-full"
                    />
                  </div>

                  {/* Overlay Controls - Split Layout */}
                  <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => rotatePage(page.id)} 
                      className="p-2 bg-white/90 hover:bg-blue-50 text-accent-primary rounded-lg shadow-sm backdrop-blur-sm border border-slate-200 transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>

                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => removePage(page.id)} 
                      className="p-2 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg shadow-sm backdrop-blur-sm border border-slate-200 transition-colors"
                      title="Delete Page"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">
                    {page.displayNum}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

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
import React, { useState } from 'react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { FileText, X, ArrowRight, Download, RefreshCw, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { mergePdfs } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import styles from './MergePdf.module.css';

const MergePdf = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const { addToast } = useToast();

  const handleFilesSelected = (newFiles) => {
    const filesWithId = Array.from(newFiles).map(file => ({
      file,
      id: uuidv4(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }));
    setFiles(prev => [...prev, ...filesWithId]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const mergedBlob = await mergePdfs(files.map(f => f.file));
      const url = URL.createObjectURL(mergedBlob);
      setDownloadUrl(url);
      addToast("PDFs merged successfully!", "success");
    } catch (error) {
      console.error("Merge failed", error);
      addToast("Failed to merge PDFs. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
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
          
          <h2 className={styles.title}>PDFs Merged!</h2>
          <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
            Preview of your new file.
          </p>
          
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto">
            <a 
              href={downloadUrl} 
              download={`bamsense_merged_${Date.now()}.pdf`}
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download Merged PDF
            </a>
            
            <button 
              onClick={reset}
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" />
              Merge more PDFs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Merge PDF files</h2>
        <p className={styles.subtitle}>
          Combine PDFs in the order you want with the easiest PDF merger available.
        </p>
      </div>

      {files.length === 0 ? (
        <FileUploader onFilesSelected={handleFilesSelected} />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4 px-2">
             <span className="text-sm font-medium text-secondary flex items-center gap-2">
               <ArrowRight size={16} className="text-accent-secondary" /> Drag items to reorder
             </span>
             <div className="flex gap-2">
               <button 
                  onClick={() => document.getElementById('add-more-input').click()}
                  className="btn text-xs bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
               >
                  <Plus size={14} /> Add more
               </button>
               <button 
                  onClick={reset}
                  className="btn text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
               >
                  <Trash2 size={14} /> Clear all
               </button>
             </div>
             <input 
                id="add-more-input" 
                type="file" 
                accept=".pdf" 
                multiple 
                hidden 
                onChange={(e) => handleFilesSelected(e.target.files)} 
             />
          </div>

          <Reorder.Group axis="y" values={files} onReorder={setFiles} className={styles.fileList}>
            <AnimatePresence>
              {files.map((item) => (
                <Reorder.Item key={item.id} value={item} className={styles.fileItem}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-14 bg-slate-100 shrink-0 border border-slate-200 rounded overflow-hidden">
                      <PdfThumbnail file={item.file} pageIndex={0} width={40} />
                    </div>
                    <div className="flex flex-col">
                      <span className={styles.fileName}>{item.name}</span>
                      <span className={styles.fileSize}>{item.size}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFile(item.id)} className={styles.removeBtn}>
                    <X size={18} />
                  </button>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <div className={styles.actionBar}>
             <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>
               Cancel
             </button>
             <button 
               onClick={handleMerge} 
               disabled={files.length < 2}
               className="btn btn-action"
               style={{ opacity: files.length < 2 ? 0.5 : 1 }}
             >
               Merge PDF <ArrowRight size={18} className="ml-2" />
             </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p className="mt-4 font-medium text-primary">Merging your files...</p>
        </div>
      )}
    </div>
  );
};

export default MergePdf;
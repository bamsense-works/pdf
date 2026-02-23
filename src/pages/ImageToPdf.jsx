import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Reorder, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, RefreshCw, Plus, Trash2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { imagesToPdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';

const generateId = () => Math.random().toString(36).substring(2, 15);

const ImageToPdf = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [previewItem, setPreviewItem] = useState(null);
  const { addToast } = useToast();
  const filesRef = React.useRef([]);
  const downloadUrlRef = React.useRef(null);
  const location = useLocation();
  const initialFilesProcessed = React.useRef(false);

  useEffect(() => {
    if (!initialFilesProcessed.current && location.state?.initialFiles && location.state.initialFiles.length > 0) {
      initialFilesProcessed.current = true;
      handleFilesSelected(location.state.initialFiles);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    downloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach(f => URL.revokeObjectURL(f.preview));
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleFilesSelected = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    const filesWithId = validFiles.map(file => ({
      file,
      id: generateId(),
      name: file.name,
      preview: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...filesWithId]);
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const pdfBlob = await imagesToPdf(files.map(f => f.file));
      const url = URL.createObjectURL(pdfBlob);
      setDownloadUrl(url);
      addToast("PDF created successfully!", "success");
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Failed to create PDF.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setPreviewItem(null);
  };

  if (downloadUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-6">
             <div className="rounded-lg overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
                <PdfThumbnail url={downloadUrl} pageIndex={0} width={200} />
             </div>
          </div>
          <h2 className={styles.title}>PDF Created!</h2>
          <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
            Your images have been combined into a PDF.
          </p>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto">
            <a 
              href={downloadUrl} 
              download="bamsense_images.pdf" 
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download PDF
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" /> Convert more
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>JPG to PDF</h2>
        <p className={styles.subtitle}>Convert JPG and PNG images to PDF.</p>
      </div>

      {files.length === 0 ? (
        <FileUploader 
          onFilesSelected={handleFilesSelected} 
          accept={{'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png']}}
          label="Select image files"
          buttonLabel="Select image files"
        />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-sm font-medium text-secondary flex items-center gap-2">
              <ArrowRight size={16} className="text-accent-secondary" /> Drag items to reorder
            </span>
            <div className="flex gap-2">
               <button
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                  className="btn text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
               >
                  {viewMode === 'list' ? 'Grid view' : 'List view'}
               </button>
               <button 
                  onClick={() => document.getElementById('add-img-input').click()} 
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
             <input id="add-img-input" type="file" accept=".jpg,.jpeg,.png" multiple hidden onChange={(e) => handleFilesSelected(e.target.files)} />
          </div>

          <Reorder.Group
            axis="y"
            values={files}
            onReorder={setFiles}
            className={styles.fileList}
            style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' } : {}}
          >
            <AnimatePresence>
              {files.map((item) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className={styles.fileItem}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={viewMode === 'grid' ? { flexDirection: 'column', alignItems: 'stretch' } : {}}
                >
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="flex items-center gap-3 overflow-hidden text-left"
                    style={viewMode === 'grid' ? { flexDirection: 'column', alignItems: 'stretch' } : {}}
                    aria-label={`Preview ${item.name}`}
                  >
                    <img
                      src={item.preview}
                      alt=""
                      className={viewMode === 'grid' ? 'w-full h-40 object-cover rounded border border-slate-200 bg-slate-50' : 'w-10 h-14 object-cover rounded border border-slate-200 bg-slate-50'}
                    />
                    <span className={styles.fileName}>{item.name}</span>
                  </button>
                  <button onClick={() => removeFile(item.id)} className={styles.removeBtn} aria-label={`Remove ${item.name}`}><X size={18} /></button>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <div className={styles.actionBar}>
             <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>Cancel</button>
             <button onClick={handleConvert} className="btn btn-action">
               Convert to PDF <ArrowRight size={18} className="ml-2" />
             </button>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p className="mt-4 font-medium text-primary">Generating PDF...</p>
        </div>
      )}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-3xl w-[90%]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold">{previewItem.name}</span>
              <button onClick={() => setPreviewItem(null)} className="text-slate-500 hover:text-slate-700">Close</button>
            </div>
            <img src={previewItem.preview} alt="" className="w-full max-h-[70vh] object-contain bg-slate-50 rounded" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageToPdf;

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Image, ArrowRight, Download, RefreshCw, Trash2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { pdfToImages } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import styles from './MergePdf.module.css';

const PdfToImage = () => {
  const [file, setFile] = useState(null);
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

  const handleFileSelected = (files) => {
    if (files.length > 0) setFile(files[0]);
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      const zipBlob = await pdfToImages(file);
      const url = URL.createObjectURL(zipBlob);
      setDownloadUrl(url);
      addToast("Conversion successful!", "success");
    } catch (error) {
      console.error(error);
      addToast("Conversion failed. Ensure the PDF is not password protected.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  };

  if (downloadUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-6">
             <div className="rounded-lg overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
                <PdfThumbnail url={URL.createObjectURL(file)} pageIndex={0} width={200} />
             </div>
          </div>
          <h2 className={styles.title}>Conversion Complete!</h2>
          <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
            Your images are ready in a ZIP archive.
          </p>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto">
            <a 
              href={downloadUrl} 
              download="bamsense_images.zip" 
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download Images (ZIP)
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" /> Convert another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>PDF to JPG</h2>
        <p className={styles.subtitle}>Convert every page of this PDF to high-quality JPG images.</p>
      </div>

      {!file ? (
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} />
      ) : (
        <div className="max-w-xl mx-auto">
          <div className={styles.fileItem}>
             <div className="flex items-center gap-3">
                <div className="w-10 h-14 bg-slate-100 shrink-0 border border-slate-200 rounded overflow-hidden">
                  <PdfThumbnail file={file} pageIndex={0} width={40} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
             </div>
             <button 
               onClick={reset} 
               className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
             >
               <Trash2 size={16} /> Change
             </button>
          </div>

          <div className={styles.actionBar}>
             <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>Cancel</button>
             <button onClick={handleConvert} className="btn btn-action">
               Convert to JPG <ArrowRight size={18} className="ml-2" />
             </button>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p className="mt-4 font-medium text-primary">Rendering pages...</p>
        </div>
      )}
    </div>
  );
};

export default PdfToImage;
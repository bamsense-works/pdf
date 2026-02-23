import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, ArrowRight, RefreshCw, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { protectPdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';
import ProgressOverlay from '../components/ProgressOverlay';

const ProtectPdf = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [progress, setProgress] = useState(null);
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

  const handleFileSelected = (files) => {
    if (files.length > 0) setFile(files[0]);
  };

  const handleProtect = async () => {
    if (!file || !password) return;
    
    setIsProcessing(true);
    setProgress(0);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const protectedBlob = await protectPdf(file, password, { onProgress: setProgress });
      const url = URL.createObjectURL(protectedBlob);
      setDownloadUrl(url);
      addToast("File encrypted successfully!", "success");
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Encryption failed.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const reset = () => {
    setFile(null);
    setPassword('');
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  };

  if (downloadUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-6">
             <div className="bg-emerald-50 p-6 rounded-full">
                <ShieldCheck size={48} className="text-emerald-600" />
             </div>
          </div>
          <h2 className={styles.title}>PDF Protected!</h2>
          <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
            Your file is now encrypted with AES-256.
          </p>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto">
            <a 
              href={downloadUrl} 
              download={`protected_${file.name}`}
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download Protected PDF
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Protect another PDF"
            >
              <RefreshCw size={16} className="mr-2" /> Protect another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Protect PDF</h2>
        <p className={styles.subtitle}>Encrypt your PDF with a password. All processing happens on your device.</p>
      </div>

      {!file ? (
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} label="Select PDF file" buttonLabel="Select PDF file" />
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
             <button onClick={reset} className="btn text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg">Change</button>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8">
             <label htmlFor="pdf-password" className="block text-sm font-bold text-slate-700 mb-2">Set a Password</label>
             <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 id="pdf-password"
                 type={showPassword ? "text" : "password"}
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-accent-secondary"
                 placeholder="Enter strong password..."
               />
               <button 
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                 aria-label={showPassword ? "Hide password" : "Show password"}
               >
                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
               </button>
             </div>
             <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
               <ShieldCheck size={12} /> Files are encrypted locally using standard AES-256.
             </p>
          </div>

          <div className={styles.actionBar}>
             <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>Cancel</button>
             <button onClick={handleProtect} className="btn btn-action" disabled={!password}>
               Encrypt PDF <ArrowRight size={18} className="ml-2" />
             </button>
          </div>
        </div>
      )}
      {isProcessing && <ProgressOverlay label="Encrypting..." progress={progress} />}
    </div>
  );
};

export default ProtectPdf;

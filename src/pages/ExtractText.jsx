import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, RefreshCw, Copy } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { extractPdfText } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';
import ProgressOverlay from '../components/ProgressOverlay';

const ExtractText = () => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
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
    if (files.length > 0) {
      setFile(files[0]);
      setText('');
      setDownloadUrl(null);
    }
  };

  useEffect(() => {
    if (!file || isProcessing) return;
    handleExtract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleExtract = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      const extracted = await extractPdfText(file, { onProgress: setProgress });
      setText(extracted);
      const blob = new Blob([extracted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      addToast("Text extracted!", "success");
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Failed to extract text.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const reset = () => {
    setFile(null);
    setText('');
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  };

  const copyText = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    addToast("Copied to clipboard", "success");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Extract Text</h2>
        <p className={styles.subtitle}>Pull text content from your PDF locally.</p>
      </div>

      {!file ? (
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} label="Select PDF file" buttonLabel="Select PDF file" />
      ) : (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Extracted text will appear here..."
              className="w-full min-h-[260px] p-3 text-sm rounded-lg border border-slate-200"
            />
            <div className="flex items-center gap-2 mt-3">
              <button onClick={copyText} className="btn text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Copy size={14} /> Copy
              </button>
              {downloadUrl && (
                <a href={downloadUrl} download={`text_${file.name}.txt`} className="btn text-xs bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 px-3 py-1.5 rounded-lg">
                  Download .txt
                </a>
              )}
            </div>
          </div>

          <div className={styles.actionBar}>
            <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>
              Cancel
            </button>
            <button onClick={handleExtract} className="btn btn-action">
              Extract Text <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      )}

      {isProcessing && <ProgressOverlay label="Extracting text..." progress={progress} />}
    </div>
  );
};

export default ExtractText;

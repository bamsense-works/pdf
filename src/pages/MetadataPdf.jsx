import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, RefreshCw, Tag } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { editPdfMetadata, getPdfMetadata } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';

const MetadataPdf = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [creator, setCreator] = useState('');
  const [producer, setProducer] = useState('');
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

  const handleFileSelected = (files) => {
    if (files.length > 0) {
      const selected = files[0];
      setFile(selected);
      getPdfMetadata(selected)
        .then((data) => {
          setTitle(data.title || '');
          setAuthor(data.author || '');
          setSubject(data.subject || '');
          setKeywords(data.keywords || '');
          setCreator(data.creator || '');
          setProducer(data.producer || '');
        })
        .catch(() => {
          setTitle('');
          setAuthor('');
          setSubject('');
          setKeywords('');
          setCreator('');
          setProducer('');
        });
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const blob = await editPdfMetadata(file, {
        title,
        author,
        subject,
        keywords,
        creator,
        producer
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      addToast("Metadata updated!", "success");
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Failed to update metadata.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setTitle('');
    setAuthor('');
    setSubject('');
    setKeywords('');
    setCreator('');
    setProducer('');
  };

  if (downloadUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-50 p-6 rounded-full">
              <Tag size={48} className="text-emerald-600" />
            </div>
          </div>
          <h2 className={styles.title}>Metadata Updated!</h2>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto mt-6">
            <a href={downloadUrl} download={`metadata_${file.name}`} className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
              Download PDF
            </a>
            <button onClick={reset} className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              <RefreshCw size={16} className="mr-2" /> Edit another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Edit Metadata</h2>
        <p className={styles.subtitle}>Update PDF title, author, and other document details.</p>
      </div>

      {!file ? (
        <FileUploader onFilesSelected={handleFileSelected} multiple={false} label="Select PDF file" buttonLabel="Select PDF file" />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Author</label>
                <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Keywords (comma separated)</label>
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Creator</label>
                <input value={creator} onChange={(e) => setCreator(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Producer</label>
                <input value={producer} onChange={(e) => setProducer(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
            </div>
          </div>

          <div className={styles.actionBar}>
            <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>
              Cancel
            </button>
            <button onClick={handleApply} className="btn btn-action" disabled={isProcessing}>
              Save Metadata <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      )}

      {isProcessing && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}
    </div>
  );
};

export default MetadataPdf;

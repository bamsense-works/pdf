import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layers, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import FileUploader from '../components/FileUploader';
import { compressPdf, rotatePdf, watermarkPdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import { classifyPdfError } from '../utils/pdfErrors';
import styles from './ToolPage.module.css';
import { rgb } from 'pdf-lib';
import ProgressOverlay from '../components/ProgressOverlay';

const generateId = () => Math.random().toString(36).substring(2, 15);

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

const BatchPdf = () => {
  const [files, setFiles] = useState([]);
  const [operation, setOperation] = useState('rotate');
  const [rotation, setRotation] = useState(90);
  const [level, setLevel] = useState('medium');
  const [quality, setQuality] = useState(0.6);
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmColor, setWmColor] = useState('#ef4444');
  const [wmOpacity, setWmOpacity] = useState(0.5);
  const [wmSize, setWmSize] = useState(50);
  const [wmRotation, setWmRotation] = useState(45);
  const [wmTiled, setWmTiled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [progress, setProgress] = useState(null);
  const { addToast } = useToast();
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
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleFilesSelected = (newFiles) => {
    const next = Array.from(newFiles).map(file => ({
      file,
      id: generateId(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }));
    setFiles(prev => [...prev, ...next]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getBaseName = (name) => name.replace(/\.pdf$/i, '');

  const handleBatch = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      for (let i = 0; i < files.length; i += 1) {
        const item = files[i];
        let blob;
        if (operation === 'rotate') {
          blob = await rotatePdf(item.file, rotation);
          zip.file(`${getBaseName(item.name)}_rotated.pdf`, blob);
        } else if (operation === 'compress') {
          const options = level === 'high' ? { quality: parseFloat(quality) } : {};
          blob = await compressPdf(item.file, level, options);
          zip.file(`${getBaseName(item.name)}_compressed.pdf`, blob);
        } else if (operation === 'watermark') {
          blob = await watermarkPdf(item.file, wmText, {
            size: parseInt(wmSize),
            opacity: parseFloat(wmOpacity),
            color: hexToRgb(wmColor),
            position: wmTiled ? 'tiled' : 'center',
            rotation: parseInt(wmRotation)
          });
          zip.file(`${getBaseName(item.name)}_watermarked.pdf`, blob);
        }
        setProgress(((i + 1) / files.length) * 100);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      setDownloadUrl(url);
      addToast("Batch processing complete!", "success");
    } catch (error) {
      console.error(error);
      const { message, type } = classifyPdfError(error, "Batch processing failed.");
      addToast(message, type);
    } finally {
      setIsProcessing(false);
      setProgress(null);
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
          <div className="flex justify-center mb-6">
            <div className="bg-blue-50 p-6 rounded-full">
              <Layers size={48} className="text-blue-600" />
            </div>
          </div>
          <h2 className={styles.title}>Batch Complete!</h2>
          <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
            Your processed files are ready in a ZIP archive.
          </p>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto">
            <a href={downloadUrl} download="bamsense_batch.zip" className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
              Download ZIP
            </a>
            <button onClick={reset} className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              <RefreshCw size={16} className="mr-2" /> Start another batch
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Batch PDF</h2>
        <p className={styles.subtitle}>Apply the same operation to multiple PDFs and download a ZIP.</p>
      </div>

      {files.length === 0 ? (
        <FileUploader onFilesSelected={handleFilesSelected} label="Select PDF files" buttonLabel="Select PDF files" />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-sm font-medium text-secondary">Files selected: {files.length}</span>
            <div className="flex gap-2">
              <button onClick={() => document.getElementById('batch-add-input').click()} className="btn text-xs bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                Add more
              </button>
              <button onClick={reset} className="btn text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                <Trash2 size={14} /> Clear all
              </button>
              <input id="batch-add-input" type="file" accept=".pdf" multiple hidden onChange={(e) => handleFilesSelected(e.target.files)} />
            </div>
          </div>

          <ul className={styles.fileList}>
            {files.map((item) => (
              <li key={item.id} className={styles.fileItem}>
                <div className="flex flex-col">
                  <span className={styles.fileName}>{item.name}</span>
                  <span className={styles.fileSize}>{item.size}</span>
                </div>
                <button onClick={() => removeFile(item.id)} className={styles.removeBtn} aria-label={`Remove ${item.name}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Operation</label>
            <select value={operation} onChange={(e) => setOperation(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option value="rotate">Rotate</option>
              <option value="compress">Compress</option>
              <option value="watermark">Watermark</option>
            </select>

            {operation === 'rotate' && (
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-2">Rotation</label>
                <div className="flex gap-2">
                  {[90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => setRotation(deg)}
                      className={`btn text-xs px-3 py-1.5 rounded-lg ${rotation === deg ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {operation === 'compress' && (
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-2">Compression level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200">
                  <option value="low">Light</option>
                  <option value="medium">Balanced</option>
                  <option value="high">Extreme</option>
                </select>
                {level === 'high' && (
                  <div className="mt-3">
                    <label className="block text-sm text-slate-600 mb-1">Quality</label>
                    <input type="range" min="0.3" max="0.9" step="0.05" value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full" />
                  </div>
                )}
              </div>
            )}

            {operation === 'watermark' && (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <input value={wmText} onChange={(e) => setWmText(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Watermark text" />
                <div className="flex gap-3 items-center">
                  <input type="color" value={wmColor} onChange={(e) => setWmColor(e.target.value)} />
                  <span className="text-xs text-slate-500">{wmColor}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <label className="text-xs text-slate-600">Opacity</label>
                  <input type="range" min="0.1" max="1" step="0.1" value={wmOpacity} onChange={(e) => setWmOpacity(e.target.value)} className="flex-1" />
                </div>
                <div className="flex gap-3 items-center">
                  <label className="text-xs text-slate-600">Size</label>
                  <input type="range" min="20" max="120" value={wmSize} onChange={(e) => setWmSize(e.target.value)} className="flex-1" />
                </div>
                <div className="flex gap-3 items-center">
                  <label className="text-xs text-slate-600">Rotation</label>
                  <input type="range" min="-90" max="90" value={wmRotation} onChange={(e) => setWmRotation(e.target.value)} className="flex-1" />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={wmTiled} onChange={(e) => setWmTiled(e.target.checked)} />
                  Tiled
                </label>
              </div>
            )}
          </div>

          <div className={styles.actionBar}>
            <button onClick={reset} className="btn" style={{ background: 'var(--bg-tertiary)' }}>
              Cancel
            </button>
            <button onClick={handleBatch} className="btn btn-action">
              Process Batch <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      )}

      {isProcessing && <ProgressOverlay label="Processing batch..." progress={progress} />}
    </div>
  );
};

export default BatchPdf;

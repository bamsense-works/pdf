import React, { useState } from 'react';
import { RotateCw, RotateCcw, ArrowRight, RefreshCw, Undo2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { rotatePdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import styles from './MergePdf.module.css';

const RotatePdf = () => {
  const [file, setFile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const { addToast } = useToast();

  const handleFileSelected = (files) => {
    if (files.length > 0) {
      setFile(files[0]);
      setRotation(0); // Reset rotation on new file
    }
  };

  const handleRotateLeft = () => setRotation(prev => (prev - 90) % 360);
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);
  const handleResetRotation = () => setRotation(0);

  const handleProcess = async () => {
    if (!file) return;
    if (rotation === 0) {
      addToast("No rotation selected.", "info");
      return;
    }
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const rotatedBlob = await rotatePdf(file, rotation);
      const url = URL.createObjectURL(rotatedBlob);
      setDownloadUrl(url);
      addToast("PDF rotated successfully!", "success");
    } catch (error) {
      console.error(error);
      addToast("Rotation failed.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setRotation(0);
  };

  if (downloadUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className="flex justify-center mb-6">
             <div className="rounded-lg overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
                <PdfThumbnail url={downloadUrl} pageIndex={0} width={240} />
             </div>
          </div>
          <h2 className={styles.title}>PDF Rotated!</h2>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto mt-6">
            <a 
              href={downloadUrl} 
              download="bamsense_rotated.pdf" 
              className="btn btn-action w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Download PDF
            </a>
            <button 
              onClick={reset} 
              className="btn w-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" /> Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
      <div className={styles.header}>
        <h2 className={styles.title}>Rotate PDF</h2>
        <p className={styles.subtitle}>Permanently rotate your PDF pages to the correct orientation.</p>
      </div>

      {!file ? (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <FileUploader onFilesSelected={handleFileSelected} multiple={false} />
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '2rem'
        }}>
          
          {/* Workboard */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '2rem', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
             
             {/* File Info Badge */}
             <div style={{ 
               position: 'absolute', top: '1rem', left: '1rem', 
               background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '20px',
               fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500
             }}>
               {file.name}
             </div>

             {/* The Preview */}
             <div style={{ 
               margin: '2rem 0',
               transition: 'all 0.3s ease',
               filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' 
             }}>
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <PdfThumbnail 
                    file={file} 
                    pageIndex={0} 
                    width={300} 
                    rotation={rotation}
                    className="block"
                  />
                </div>
             </div>

             {/* Rotation Controls */}
             <div style={{ 
               display: 'flex', gap: '1rem', alignItems: 'center',
               background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '12px'
             }}>
                <button 
                  onClick={handleRotateLeft}
                  className="btn"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '50px', height: '50px', padding: 0 }}
                  title="Rotate Left (-90°)"
                >
                  <RotateCcw size={20} />
                </button>

                <div style={{ 
                   width: '80px', textAlign: 'center', fontFamily: 'monospace', 
                   fontWeight: 700, color: 'var(--text-primary)' 
                }}>
                  {rotation}°
                </div>

                <button 
                  onClick={handleRotateRight}
                  className="btn"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '50px', height: '50px', padding: 0 }}
                  title="Rotate Right (+90°)"
                >
                  <RotateCw size={20} />
                </button>

                <div style={{ width: '1px', height: '30px', background: 'var(--border-color)', margin: '0 0.5rem' }} />

                <button 
                  onClick={handleResetRotation}
                  className="btn"
                  style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8rem', gap: '0.5rem' }}
                  title="Reset to 0°"
                >
                  <Undo2 size={16} /> Reset
                </button>
             </div>

          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px' }}>
             <button onClick={reset} className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)' }}>
               Cancel
             </button>
             <button onClick={handleProcess} className="btn btn-action" style={{ flex: 1.5 }}>
               Rotate PDF <ArrowRight size={18} className="ml-2" />
             </button>
          </div>

        </div>
      )}
      {isProcessing && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}
    </div>
  );
};

export default RotatePdf;
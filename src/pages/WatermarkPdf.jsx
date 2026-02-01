import React, { useState } from 'react';
import { Stamp, ArrowRight, RefreshCw, Type, Palette, Droplets, Maximize, RotateCw, Grid, Square } from 'lucide-react';
import { rgb } from 'pdf-lib';
import FileUploader from '../components/FileUploader';
import PdfThumbnail from '../components/PdfThumbnail';
import { watermarkPdf } from '../utils/pdfUtils';
import { useToast } from '../components/ToastProvider';
import styles from './MergePdf.module.css';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

const WatermarkPdf = () => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [color, setColor] = useState('#ef4444');
  const [opacity, setOpacity] = useState(0.5);
  const [fontSize, setFontSize] = useState(60);
  const [rotation, setRotation] = useState(45); // Standard diagonal
  const [isTiled, setIsTiled] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const { addToast } = useToast();

  const handleFileSelected = (files) => {
    if (files.length > 0) setFile(files[0]);
  };

  const handleWatermark = async () => {
    if (!file || !text) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const pdfColor = hexToRgb(color);
      const settings = {
        size: parseInt(fontSize),
        opacity: parseFloat(opacity),
        color: pdfColor,
        position: isTiled ? 'tiled' : 'center',
        rotation: parseInt(rotation)
      };

      const watermarkedBlob = await watermarkPdf(file, text, settings);
      const url = URL.createObjectURL(watermarkedBlob);
      setDownloadUrl(url);
      addToast("Watermark added successfully!", "success");
    } catch (error) {
      console.error(error);
      addToast("Watermarking failed.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setText('CONFIDENTIAL');
  };

  // Generate preview elements
  const renderPreviewElements = () => {
    const style = {
      position: 'absolute',
      color: color,
      opacity: opacity,
      fontSize: `${fontSize * 0.6}px`, // Scale down for preview relative size
      fontWeight: 'bold',
      fontFamily: 'Helvetica, sans-serif',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 10,
      transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
    };

    if (!isTiled) {
      return (
        <div style={{ ...style, top: '50%', left: '50%' }}>
          {text}
        </div>
      );
    }

    // Grid for tiled view
    // Use fewer, more spaced out items to avoid visual clutter/overlap in preview
    const items = [];
    // Start with a simple 3x3 grid that covers the center well
    const positions = [
      { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 },
      { x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 },
      { x: 20, y: 80 }, { x: 50, y: 80 }, { x: 80, y: 80 }
    ];

    return positions.map((pos, i) => (
       <div key={i} style={{ ...style, top: `${pos.y}%`, left: `${pos.x}%` }}>
         {text}
       </div>
    ));
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
          <h2 className={styles.title}>Watermark Ready!</h2>
          <div className="flex flex-col gap-6 items-center w-full max-w-[300px] mx-auto mt-6">
            <a 
              href={downloadUrl} 
              download="bamsense_watermarked.pdf" 
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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
      <div className={styles.header}>
        <h2 className={styles.title}>Watermark Studio</h2>
        <p className={styles.subtitle}>Design and apply professional stamps to your documents.</p>
      </div>

      {!file ? (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <FileUploader onFilesSelected={handleFileSelected} multiple={false} />
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '2rem',
          alignItems: 'start' 
        }}>
          
          {/* LEFT PANEL: Controls */}
          <div style={{ 
            backgroundColor: 'var(--card-bg)', 
            padding: '2rem', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(181, 70, 90, 0.1)', color: 'var(--accent-secondary)', borderRadius: '8px' }}>
                  <Stamp size={24} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Configuration</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{file.name}</p>
                </div>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               {/* Text */}
               <div>
                 <label htmlFor="wm-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                   <Type size={16} color="var(--accent-secondary)" /> Watermark Text
                 </label>
                 <input 
                    id="wm-text"
                    name="watermarkText"
                    type="text" 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ 
                      width: '100%', padding: '0.75rem', borderRadius: '8px', 
                      border: '1px solid var(--border-color)', 
                      background: 'var(--bg-primary)',
                      fontSize: '1rem', fontWeight: 500, outline: 'none'
                    }}
                    placeholder="e.g. DRAFT"
                    autoComplete="off"
                 />
               </div>

               {/* Mode Toggle */}
               <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '8px', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setIsTiled(false)}
                    style={{ 
                      flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500,
                      background: !isTiled ? 'var(--card-bg)' : 'transparent',
                      boxShadow: !isTiled ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      color: !isTiled ? 'var(--text-primary)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                  >
                    <Square size={16} /> Single
                  </button>
                  <button 
                    onClick={() => setIsTiled(true)}
                    style={{ 
                      flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500,
                      background: isTiled ? 'var(--card-bg)' : 'transparent',
                      boxShadow: isTiled ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      color: isTiled ? 'var(--text-primary)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                  >
                    <Grid size={16} /> Tiled
                  </button>
               </div>

               {/* Appearance Card */}
               <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 
                 {/* Row 1: Color & Opacity */}
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div>
                      <label htmlFor="wm-color" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <Palette size={14} /> Color
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          id="wm-color"
                          name="watermarkColor"
                          type="color" 
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
                        />
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{color}</span>
                      </div>
                   </div>

                   <div>
                      <label htmlFor="wm-opacity" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <Droplets size={14} /> Opacity: {Math.round(opacity * 100)}%
                      </label>
                      <input 
                        id="wm-opacity"
                        name="watermarkOpacity"
                        type="range" 
                        min="0.1" 
                        max="1" 
                        step="0.1" 
                        value={opacity}
                        onChange={(e) => setOpacity(e.target.value)}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                   </div>
                 </div>

                 {/* Row 2: Size & Rotation */}
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label htmlFor="wm-size" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <Maximize size={14} /> Size: {fontSize}px
                        </label>
                        <input 
                        id="wm-size"
                        name="watermarkSize"
                        type="range" 
                        min="20" 
                        max="150" 
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value)}
                        style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="wm-rotate" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <RotateCw size={14} /> Rotation: {rotation}°
                        </label>
                        <input 
                        id="wm-rotate"
                        name="watermarkRotation"
                        type="range" 
                        min="-90" 
                        max="90" 
                        value={rotation}
                        onChange={(e) => setRotation(e.target.value)}
                        style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={reset} className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)' }}>
                    Cancel
                  </button>
                  <button onClick={handleWatermark} className="btn btn-action" style={{ flex: 2 }}>
                    Apply <ArrowRight size={18} className="ml-2" />
                  </button>
               </div>

             </div>
          </div>

          {/* RIGHT PANEL: Workboard */}
          <div style={{ 
            background: '#0f172a', 
            padding: '2rem', 
            borderRadius: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            minHeight: '600px',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
          }}>
            <div style={{ marginBottom: '1rem', width: '100%', display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Preview Mode</span>
              <span>Page 1</span>
            </div>

            {/* The Document */}
            <div style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
               <PdfThumbnail 
                 file={file} 
                 pageIndex={0} 
                 width={400} 
                 className="block"
               >
                 {renderPreviewElements()}
               </PdfThumbnail>
            </div>
          </div>

        </div>
      )}
      {isProcessing && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}
    </div>
  );
};

export default WatermarkPdf;

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Reliable worker loading for Vite
const workerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const PdfThumbnail = ({ file, url, pageIndex, width = 200, rotation = 0, className = "", children }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.414);

  useEffect(() => {
    let active = true;
    let pdfDoc = null;

    const renderPage = async () => {
      try {
        if (!file && !url) return;

        setLoading(true);
        setError(false);
        
        let loadingTask;
        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, eventBus: null });
        } else {
          loadingTask = pdfjsLib.getDocument({ url: url, eventBus: null });
        }

        pdfDoc = await loadingTask.promise;
        
        if (!active) return;

        const page = await pdfDoc.getPage(pageIndex + 1);
        
        if (!active) return;

        const viewport = page.getViewport({ scale: 1, rotation: rotation });
        setAspectRatio(viewport.height / viewport.width);
        
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale, rotation: rotation });

        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.height = scaledViewport.height;
          canvas.width = scaledViewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: scaledViewport,
          };
          
          await page.render(renderContext).promise;
          if (active) setLoading(false);
        }
      } catch (err) {
        console.error("Thumbnail render error:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      active = false;
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {});
      }
    };
  }, [file, url, pageIndex, width, rotation]);

  return (
    <div 
      className={`relative bg-white shadow-sm ${className}`} 
      style={{ 
        width, 
        minHeight: '40px',
        height: loading ? width * aspectRatio : 'auto',
        transition: 'height 0.3s ease'
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-auto" />
      
      {children && !loading && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {children}
        </div>
      )}
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-[2px]">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-accent-secondary rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-red-400 p-2 text-center leading-tight">
          Preview failed
        </div>
      )}
    </div>
  );
};

export default PdfThumbnail;
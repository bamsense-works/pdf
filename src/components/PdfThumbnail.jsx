import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Explicitly import the worker using Vite's URL import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Ensure worker is set up (in case utils hasn't run yet)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PdfThumbnail = ({ file, url, pageIndex, width = 200, rotation = 0, className = "", children }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.414); // Default A4 aspect ratio

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
          loadingTask = pdfjsLib.getDocument(arrayBuffer);
        } else {
          loadingTask = pdfjsLib.getDocument(url);
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
          setLoading(false);
        }
      } catch (err) {
        console.error("Thumbnail render error:", err);
        if (active) setError(true);
      }
    };

    renderPage();

    return () => {
      active = false;
      if (pdfDoc) pdfDoc.destroy();
    };
  }, [file, url, pageIndex, width, rotation]);

  return (
    <div 
      className={`relative bg-white shadow-sm ${className}`} 
      style={{ width, height: loading ? width * aspectRatio : 'auto' }}
    >
      <canvas ref={canvasRef} className="block w-full h-auto" />
      
      {/* Overlay Children (Watermark, etc.) */}
      {children && !loading && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {children}
        </div>
      )}
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-accent-secondary rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-red-400 p-2 text-center">
          Preview unavailable
        </div>
      )}
    </div>
  );
};

export default PdfThumbnail;

import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
// Explicitly import the worker using Vite's URL import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Merge multiple PDFs into one.
 */
export const mergePdfs = async (files) => {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const fileBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(fileBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes], { type: 'application/pdf' });
};

/**
 * Split PDF: Extract specific pages or ranges.
 * ranges: string like "1-5, 8, 11-13" (1-based index from UI)
 */
export const splitPdf = async (file, rangeString) => {
  const fileBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBuffer);
  const newPdf = await PDFDocument.create();
  const totalPages = srcPdf.getPageCount();

  // Parse range string
  const pagesToKeep = new Set();
  const parts = rangeString.split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) pagesToKeep.add(i - 1); // 0-based
        }
      }
    } else {
      const page = parseInt(part);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pagesToKeep.add(page - 1);
      }
    }
  }

  const indices = Array.from(pagesToKeep).sort((a, b) => a - b);
  if (indices.length === 0) throw new Error("No valid pages selected");

  const copiedPages = await newPdf.copyPages(srcPdf, indices);
  copiedPages.forEach(page => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Compress PDF: Basic vs Extreme optimization.
 */
export const compressPdf = async (file, level = 'medium') => {
  // HIGH LEVEL: Rasterize pages to images (Heavy compression, text becomes image)
  if (level === 'high') {
    const fileBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
    const newPdf = await PDFDocument.create();
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 }); // Standard scale (72 DPI approx)
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      // Convert to low-quality JPG
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.5));
      const arrayBuffer = await blob.arrayBuffer();
      const image = await newPdf.embedJpg(arrayBuffer);

      const newPage = newPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(image, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }
    
    const pdfBytes = await newPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // LOW/MEDIUM: Metadata stripping & Object Streams (Lossless-ish)
  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);
  
  // Aggressively strip metadata
  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setProducer('');
  pdf.setCreator('');
  pdf.setCreationDate(new Date());
  pdf.setModificationDate(new Date());

  const pdfBytes = await pdf.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Rotate PDF: Rotate specific pages or all pages.
 * rotation: degrees (90, 180, 270)
 */
export const rotatePdf = async (file, rotation) => {
  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);
  const pages = pdf.getPages();

  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + rotation));
  });

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Organize PDF: Reorder, rotate, or delete pages.
 * pageOrder: array of objects { originalIndex, id, rotation (optional) }
 */
export const organizePdf = async (file, pageOrder) => {
  const fileBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBuffer);
  const newPdf = await PDFDocument.create();

  // We need to copy pages individually to apply specific rotations
  const indices = pageOrder.map(p => p.originalIndex);
  const copiedPages = await newPdf.copyPages(srcPdf, indices);

  copiedPages.forEach((page, i) => {
    const pageConfig = pageOrder[i];
    if (pageConfig.rotation) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + pageConfig.rotation));
    }
    newPdf.addPage(page);
  });

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Images to PDF: Convert JPG/PNG to PDF.
 */
export const imagesToPdf = async (imageFiles) => {
  const pdf = await PDFDocument.create();

  for (const file of imageFiles) {
    const buffer = await file.arrayBuffer();
    let image;
    if (file.type === 'image/jpeg') {
      image = await pdf.embedJpg(buffer);
    } else if (file.type === 'image/png') {
      image = await pdf.embedPng(buffer);
    } else {
      continue;
    }

    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * PDF to Images: Convert PDF pages to zipped images (JPG).
 */
export const pdfToImages = async (file) => {
  const fileBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
  const zip = new JSZip();
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High res
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    zip.file(`page-${i}.jpg`, blob);
  }

  return await zip.generateAsync({ type: "blob" });
};

/**
 * Add Watermark: Add text to pages.
 */
export const watermarkPdf = async (file, text, settings = {}) => {
  const { 
    size = 50, 
    opacity = 0.5, 
    color = rgb(0.75, 0.2, 0.2),
    position = 'center', // 'center' or 'tiled'
    rotation = -45 // degrees
  } = settings;

  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  pages.forEach(page => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = font.heightAtSize(size);

    const drawMark = (cx, cy) => {
      // Calculate start point (x, y) such that the center of the text ends up at (cx, cy)
      // Vector from TextOrigin to TextCenter in unrotated space: V = (w/2, h/2)
      // Rotate this vector: V'
      // Origin = Center - V'
      
      // Note: textHeight is approx. Centering on font bounding box is tricky, 
      // but size/2 is a reasonable approximation for visual center relative to baseline.
      const vX = (textWidth / 2) * cos - (size / 3) * sin; 
      const vY = (textWidth / 2) * sin + (size / 3) * cos;

      const x = cx - vX;
      const y = cy - vY;

      page.drawText(text, {
        x,
        y,
        size,
        font,
        color: color,
        opacity: opacity,
        rotate: degrees(rotation),
      });
    };

    if (position === 'tiled') {
      // Create a dynamic grid based on text dimensions
      const gapX = textWidth + (size * 2); // Text width + 2x font size margin
      const gapY = size * 6; // Vertical spacing
      
      // Expand loop range to cover rotation edges
      for (let ix = -width; ix < width * 2; ix += gapX) {
        for (let iy = -height; iy < height * 2; iy += gapY) {
            drawMark(ix, iy);
        }
      }
    } else {
      // Center
      drawMark(width / 2, height / 2);
    }
  });

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

// Helper: Get PDF Page count for UI
export const getPdfPageCount = async (file) => {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  return pdf.getPageCount();
};
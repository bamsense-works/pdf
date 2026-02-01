import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Reliable worker loading for Vite
const workerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

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
 */
export const splitPdf = async (file, rangeString) => {
  const fileBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBuffer);
  const newPdf = await PDFDocument.create();
  const totalPages = srcPdf.getPageCount();

  const pagesToKeep = new Set();
  const parts = rangeString.split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) pagesToKeep.add(i - 1);
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
  if (level === 'high') {
    const fileBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    const newPdf = await PDFDocument.create();
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
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

  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);
  
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
 * Rotate PDF
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
 * Organize PDF
 */
export const organizePdf = async (file, pageOrder) => {
  const fileBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBuffer);
  const newPdf = await PDFDocument.create();

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
 * Images to PDF
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
 * PDF to Images
 */
export const pdfToImages = async (file) => {
  const fileBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  const zip = new JSZip();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
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
 * Add Watermark
 */
export const watermarkPdf = async (file, text, settings = {}) => {
  const { 
    size = 50, 
    opacity = 0.5, 
    color = rgb(0.75, 0.2, 0.2),
    position = 'center',
    rotation = -45
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

    const drawMark = (cx, cy) => {
      const vX = (textWidth / 2) * cos - (size / 3) * sin; 
      const vY = (textWidth / 2) * sin + (size / 3) * cos;

      page.drawText(text, {
        x: cx - vX,
        y: cy - vY,
        size,
        font,
        color: color,
        opacity: opacity,
        rotate: degrees(rotation),
      });
    };

    if (position === 'tiled') {
      const gapX = textWidth + (size * 2);
      const gapY = size * 6;
      for (let ix = -width; ix < width * 2; ix += gapX) {
        for (let iy = -height; iy < height * 2; iy += gapY) {
            drawMark(ix, iy);
        }
      }
    } else {
      drawMark(width / 2, height / 2);
    }
  });

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const getPdfPageCount = async (file) => {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  return pdf.getPageCount();
};

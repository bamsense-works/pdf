import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { parsePageRange } from './pageRange';

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

  const indices = parsePageRange(rangeString, totalPages);
  if (indices.length === 0) throw new Error("No valid pages selected");

  const copiedPages = await newPdf.copyPages(srcPdf, indices);
  copiedPages.forEach(page => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Split PDF into multiple files (returned as ZIP).
 */
export const splitPdfToZip = async (file, groups, options = {}) => {
  const { baseName = 'bamsense_split', onProgress } = options;
  const fileBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBuffer);
  const zip = new JSZip();

  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    if (!group || group.length === 0) continue;
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(srcPdf, group);
    copiedPages.forEach((page) => newPdf.addPage(page));
    const pdfBytes = await newPdf.save();
    zip.file(`${baseName}_${i + 1}.pdf`, pdfBytes);
    if (onProgress) onProgress(((i + 1) / groups.length) * 100);
  }

  return await zip.generateAsync({ type: 'blob' });
};

/**
 * Compress PDF: Basic vs Extreme optimization.
 */
export const compressPdf = async (file, level = 'medium', options = {}) => {
  const { quality = 0.55, scale = 1.0, pageIndices = null, onProgress } = options;
  if (level === 'high') {
    const fileBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    const srcPdf = await PDFDocument.load(fileBuffer);
    const newPdf = await PDFDocument.create();
    const pageSet = pageIndices ? new Set(pageIndices) : null;
    
    for (let i = 0; i < pdf.numPages; i += 1) {
      if (pageSet && !pageSet.has(i)) {
        const [copied] = await newPdf.copyPages(srcPdf, [i]);
        newPdf.addPage(copied);
        if (onProgress) onProgress(((i + 1) / pdf.numPages) * 100);
        continue;
      }

      const page = await pdf.getPage(i + 1);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('Failed to rasterize page'))),
          'image/jpeg',
          quality
        )
      );
      const arrayBuffer = await blob.arrayBuffer();
      const image = await newPdf.embedJpg(arrayBuffer);

      const newPage = newPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(image, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
      if (onProgress) onProgress(((i + 1) / pdf.numPages) * 100);
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
export const rotatePdf = async (file, rotation, options = {}) => {
  const { pageIndices = null } = options;
  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);
  const pages = pdf.getPages();
  const pageSet = pageIndices ? new Set(pageIndices) : null;

  pages.forEach((page, index) => {
    if (pageSet && !pageSet.has(index)) return;
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
export const pdfToImages = async (file, options = {}) => {
  const { onProgress } = options;
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
    if (onProgress) onProgress((i / pdf.numPages) * 100);
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
    rotation = -45,
    pageIndices = null
  } = settings;

  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const pageSet = pageIndices ? new Set(pageIndices) : null;

  pages.forEach((page, index) => {
    if (pageSet && !pageSet.has(index)) return;
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

import { jsPDF } from 'jspdf';

/**
 * Protect PDF: Encrypt with password using jsPDF (Reliable re-print method).
 */
export const protectPdf = async (file, password, options = {}) => {
  const { onProgress } = options;
  const fileBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  
  // Create first page to init doc
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
    encryption: {
      userPassword: password,
      ownerPassword: password + '_owner',
      userPermissions: ['print', 'modify', 'copy', 'annot-forms']
    }
  });
  
  // We need to remove the default first page if we want to match exact dimensions,
  // but usually we just add pages. Ideally we match dimensions page by page.
  // Actually, let's create the doc inside the loop or set it up dynamically.
  // jsPDF constructor creates one page. We'll clear it or reuse it.
  
  // Re-render strategy:
  const totalPages = pdf.numPages;
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // Good quality
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const imgData = canvas.toDataURL('image/jpeg', 0.75);
    
    if (i > 1) {
      doc.addPage([viewport.width, viewport.height]);
    } else {
      // Resize first page
      doc.deletePage(1);
      doc.addPage([viewport.width, viewport.height]);
    }
    
    doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
    if (onProgress) onProgress((i / totalPages) * 100);
  }
  
  return doc.output('blob');
};

export const getPdfPageCount = async (file) => {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  return pdf.getPageCount();
};

/**
 * Edit PDF metadata.
 */
export const editPdfMetadata = async (file, metadata = {}) => {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);

  const {
    title,
    author,
    subject,
    keywords,
    creator,
    producer
  } = metadata;

  if (title !== undefined) pdf.setTitle(title);
  if (author !== undefined) pdf.setAuthor(author);
  if (subject !== undefined) pdf.setSubject(subject);
  if (keywords !== undefined) {
    const list = Array.isArray(keywords)
      ? keywords
      : String(keywords)
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);
    pdf.setKeywords(list);
  }
  if (creator !== undefined) pdf.setCreator(creator);
  if (producer !== undefined) pdf.setProducer(producer);

  pdf.setModificationDate(new Date());

  const pdfBytes = await pdf.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Read PDF metadata.
 */
export const getPdfMetadata = async (file) => {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  return {
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
    subject: pdf.getSubject() || '',
    keywords: (pdf.getKeywords() || []).join(', '),
    creator: pdf.getCreator() || '',
    producer: pdf.getProducer() || ''
  };
};

/**
 * Extract text content from PDF.
 */
export const extractPdfText = async (file, options = {}) => {
  const { onProgress } = options;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const chunks = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    chunks.push(pageText);
    if (onProgress) onProgress((i / pdf.numPages) * 100);
  }

  return chunks.join('\n\n');
};

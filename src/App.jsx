import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import { ToastProvider } from './components/ToastProvider';
import { ThemeProvider } from './components/ThemeProvider';

// Lazy load pages for performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MergePdf = lazy(() => import('./pages/MergePdf'));
const SplitPdf = lazy(() => import('./pages/SplitPdf'));
const CompressPdf = lazy(() => import('./pages/CompressPdf'));
const PdfToImage = lazy(() => import('./pages/PdfToImage'));
const ImageToPdf = lazy(() => import('./pages/ImageToPdf'));
const RotatePdf = lazy(() => import('./pages/RotatePdf'));
const OrganizePdf = lazy(() => import('./pages/OrganizePdf'));
const WatermarkPdf = lazy(() => import('./pages/WatermarkPdf'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-accent-secondary rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/merge" element={<MergePdf />} />
                <Route path="/split" element={<SplitPdf />} />
                <Route path="/compress" element={<CompressPdf />} />
                <Route path="/pdf-to-jpg" element={<PdfToImage />} />
                <Route path="/jpg-to-pdf" element={<ImageToPdf />} />
                <Route path="/rotate" element={<RotatePdf />} />
                <Route path="/organize" element={<OrganizePdf />} />
                <Route path="/watermark" element={<WatermarkPdf />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
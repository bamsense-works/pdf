import React, { useState, useMemo } from 'react';
import { 
  Combine, Scissors, Minimize2, Image, FileImage, 
  RotateCw, LayoutGrid, Stamp, Search, ShieldCheck, 
  Zap, ArrowRight, FileText, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import ToolCard from '../components/ToolCard';

const tools = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one unified document. Drag and drop to reorder.',
    icon: Combine,
    to: '/merge',
    category: 'organize',
    popular: true
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract pages or split your PDF into multiple files.',
    icon: Scissors,
    to: '/split',
    category: 'organize',
    popular: true
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce file size while maintaining the best possible quality.',
    icon: Minimize2,
    to: '/compress',
    category: 'optimize',
    popular: true
  },
  {
    id: 'organize',
    title: 'Organize PDF',
    description: 'Sort pages of your PDF file, add new pages or delete them.',
    icon: LayoutGrid,
    to: '/organize',
    category: 'organize'
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate your PDF pages. Select specific pages or rotate the whole document.',
    icon: RotateCw,
    to: '/rotate',
    category: 'organize'
  },
  {
    id: 'pdf-to-img',
    title: 'PDF to JPG',
    description: 'Convert each page of your PDF into an isolated image.',
    icon: Image,
    to: '/pdf-to-jpg',
    category: 'convert'
  },
  {
    id: 'img-to-pdf',
    title: 'JPG to PDF',
    description: 'Convert your images into a single PDF file in seconds.',
    icon: FileImage,
    to: '/jpg-to-pdf',
    category: 'convert'
  },
  {
    id: 'watermark',
    title: 'Add Watermark',
    description: 'Stamp an image or text over your PDF in seconds.',
    icon: Stamp,
    to: '/watermark',
    category: 'edit'
  }
];

const categories = [
  { id: 'all', label: 'All Tools' },
  { id: 'organize', label: 'Organize' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'convert', label: 'Convert' },
  { id: 'edit', label: 'Edit' }
];

const Dashboard = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  // Smart Dropzone Logic
  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const isAllPdf = acceptedFiles.every(f => f.type === 'application/pdf');
    const isAllImg = acceptedFiles.every(f => f.type.startsWith('image/'));

    if (acceptedFiles.length > 1 && isAllPdf) {
      navigate('/merge', { state: { initialFiles: acceptedFiles } });
    } else if (isAllImg) {
      navigate('/jpg-to-pdf', { state: { initialFiles: acceptedFiles } });
    } else if (acceptedFiles.length === 1 && isAllPdf) {
      navigate('/compress', { state: { initialFiles: acceptedFiles } });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true // Only allow drag-drop to avoid conflict with tool clicks
  });

  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchesSearch = tool.title.toLowerCase().includes(search.toLowerCase()) || 
                           tool.description.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === 'all' || tool.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [search, activeTab]);

  return (
    <div {...getRootProps()} className="relative min-h-screen pb-20">
      <input {...getInputProps()} />

      {/* 2. Smart Action Header */}
      <motion.div 
        animate={{ 
          borderColor: isDragActive ? 'var(--accent-secondary)' : 'var(--border-color)',
          backgroundColor: isDragActive ? 'rgba(181, 70, 90, 0.05)' : 'var(--card-bg)'
        }}
        style={{ 
          border: '2px dashed var(--border-color)',
          borderRadius: '24px',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <UploadCloud size={40} style={{ color: isDragActive ? 'var(--accent-secondary)' : 'var(--text-muted)', margin: '0 auto 0.75rem', transition: 'all 0.3s' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {isDragActive ? "Drop to start magic!" : "What do you want to do today?"}
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
          Drop files here to automatically trigger the right tool, or browse the collection below.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Search tools (e.g. 'merge', 'convert')..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1rem 1rem 1rem 3rem', 
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
        </div>
      </motion.div>

      {/* 3. Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            style={{ 
              whiteSpace: 'nowrap',
              padding: '0.6rem 1.25rem',
              borderRadius: '100px',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              background: activeTab === cat.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeTab === cat.id ? 'white' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: activeTab === cat.id ? 'var(--accent-primary)' : 'var(--border-color)'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. Tools Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool) => (
            <motion.div
              layout
              key={tool.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <ToolCard 
                icon={tool.icon}
                title={tool.title}
                description={tool.description}
                to={tool.to}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty Search State */}
      {filteredTools.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
           <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No tools match your search.</p>
           <button onClick={() => {setSearch(''); setActiveTab('all')}} style={{ color: 'var(--accent-secondary)', fontWeight: 700, marginTop: '1rem' }}>Show all tools</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
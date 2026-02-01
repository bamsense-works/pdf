import React from 'react';
import { 
  Combine, 
  Scissors, 
  Minimize2, 
  Image, 
  FileImage, 
  RotateCw, 
  LayoutGrid, 
  Stamp 
} from 'lucide-react';
import ToolCard from '../components/ToolCard';
import styles from './Dashboard.module.css';

const tools = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one unified document. Drag and drop to reorder.',
    icon: Combine,
    to: '/merge'
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract pages or split your PDF into multiple files.',
    icon: Scissors,
    to: '/split'
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce file size while maintaining the best possible quality.',
    icon: Minimize2,
    to: '/compress'
  },
  {
    id: 'pdf-to-img',
    title: 'PDF to JPG',
    description: 'Convert each page of your PDF into an isolated image.',
    icon: Image,
    to: '/pdf-to-jpg'
  },
  {
    id: 'img-to-pdf',
    title: 'JPG to PDF',
    description: 'Convert your images into a single PDF file in seconds.',
    icon: FileImage,
    to: '/jpg-to-pdf'
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate your PDF pages. Select specific pages or rotate the whole document.',
    icon: RotateCw,
    to: '/rotate'
  },
  {
    id: 'organize',
    title: 'Organize PDF',
    description: 'Sort pages of your PDF file, add new pages or delete them.',
    icon: LayoutGrid,
    to: '/organize'
  },
  {
    id: 'watermark',
    title: 'Add Watermark',
    description: 'Stamp an image or text over your PDF in seconds.',
    icon: Stamp,
    to: '/watermark'
  }
];

const Dashboard = () => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '1.5rem',
      padding: '1rem'
    }}>
      {tools.map((tool) => (
        <ToolCard 
          key={tool.id}
          icon={tool.icon}
          title={tool.title}
          description={tool.description}
          to={tool.to}
        />
      ))}
    </div>
  );
};

export default Dashboard;

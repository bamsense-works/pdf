import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Combine, Scissors, Minimize2, Image, FileImage, 
  RotateCw, LayoutGrid, Stamp, Home, Moon, Sun 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './ThemeProvider';

const navItems = [
  { id: 'home', icon: Home, label: 'Dashboard', to: '/' },
  { id: 'merge', icon: Combine, label: 'Merge PDF', to: '/merge' },
  { id: 'split', icon: Scissors, label: 'Split PDF', to: '/split' },
  { id: 'compress', icon: Minimize2, label: 'Compress', to: '/compress' },
  { id: 'organize', icon: LayoutGrid, label: 'Organize', to: '/organize' },
  { id: 'rotate', icon: RotateCw, label: 'Rotate', to: '/rotate' },
  { id: 'pdf-to-img', icon: Image, label: 'PDF to JPG', to: '/pdf-to-jpg' },
  { id: 'img-to-pdf', icon: FileImage, label: 'JPG to PDF', to: '/jpg-to-pdf' },
  { id: 'watermark', icon: Stamp, label: 'Watermark', to: '/watermark' },
];

const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  const [hovered, setHovered] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const isDark = theme === 'dark';

  // Handle Resize manually to ensure CSS classes don't conflict
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isDesktop) {
    return (
      <nav style={{
        position: 'fixed', left: 0, top: 0, height: '100vh', width: '80px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}>
        <div style={{
          background: isDark ? '#1e293b' : 'white',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: '16px', padding: '0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          pointerEvents: 'auto'
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              style={({ isActive }) => ({
                position: 'relative', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '10px', transition: 'all 0.2s',
                color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(181, 70, 90, 0.1)' : 'transparent',
                textDecoration: 'none'
              })}
            >
              <item.icon size={20} />
              
              <AnimatePresence>
                {hovered === item.id && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    style={{
                      position: 'absolute', left: '55px', whiteSpace: 'nowrap',
                      background: '#1e293b', color: 'white', padding: '4px 10px',
                      borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)', pointerEvents: 'none',
                      zIndex: 1001
                    }}
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
          
          <div style={{ height: '1px', background: isDark ? '#334155' : '#e2e8f0', margin: '4px 0' }} />
          
          <button 
            onClick={toggleTheme}
            style={{
              width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>
    );
  }

  // Mobile Bottom Bar (Only renders if NOT Desktop)
  return (
    <nav style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, width: '90%', maxWidth: '400px'
    }}>
      <div style={{
        background: isDark ? '#1e293b' : 'white',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        borderRadius: '30px', padding: '0.5rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        {navItems.slice(0, 4).map((item) => (
           <NavLink
             key={item.id}
             to={item.to}
             style={({ isActive }) => ({
               padding: '0.75rem', borderRadius: '50%', transition: 'all 0.2s',
               color: isActive ? 'var(--accent-secondary)' : '#94a3b8',
               background: isActive ? 'rgba(181, 70, 90, 0.1)' : 'transparent',
               display: 'flex'
             })}
           >
             <item.icon size={22} />
           </NavLink>
        ))}
        <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', padding: '0.75rem', color: '#94a3b8' }}>
           {isDark ? <Sun size={22} /> : <Moon size={22} />}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;

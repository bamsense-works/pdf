import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Combine, Scissors, Minimize2, Image, FileImage, 
  RotateCw, LayoutGrid, Stamp, Home, Moon, Sun 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import styles from './Navigation.module.css';

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
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className={styles.sidebar}>
        <div className={styles.dockContainer}>
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              className={({ isActive }) => 
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <div className={styles.iconWrapper}>
                <item.icon size={22} strokeWidth={2} />
              </div>
              <span className={styles.tooltip}>{item.label}</span>
              {location.pathname === item.to && (
                <motion.div 
                  layoutId="activeIndicator"
                  className={styles.activeIndicator}
                />
              )}
            </NavLink>
          ))}
          
          <div className={styles.divider} />
          
          <button onClick={toggleTheme} className={styles.navItem}>
             {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
             <span className={styles.tooltip}>
               {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
             </span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className={styles.bottomBar}>
        <div className={styles.bottomContainer}>
          {navItems.slice(0, 4).map((item) => (
             <NavLink
             key={item.id}
             to={item.to}
             className={({ isActive }) => 
               `${styles.mobileItem} ${isActive ? styles.activeMobile : ''}`
             }
           >
             <item.icon size={24} />
           </NavLink>
          ))}
          <button onClick={toggleTheme} className={styles.mobileItem}>
             {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navigation;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import styles from './Header.module.css';

const Header = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Only show header on Dashboard. Tool pages start immediately with the tool title.
  if (!isHome) return null;

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.label}>
          <span className={styles.labelText}>
            Bamsense.works
          </span>
        </div>

        <Link to="/" className={styles.titleLink}>
          <h1 className={styles.title}>
            <span className="text-gradient">PDF Tools</span>
          </h1>
        </Link>

        <div className={styles.tagline}>
          <ShieldCheck size={16} className={styles.shieldIcon} />
          <p className={styles.taglineText}>
            Open Source. Local. Private.
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
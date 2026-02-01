import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import styles from './Header.module.css';

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        
        {/* Top Label */}
        <div className={styles.label}>
          <span className={styles.labelText}>
            Bamsense.works
          </span>
        </div>

        {/* Main Title */}
        <Link to="/" className={styles.titleLink}>
          <h1 className={styles.title}>
            <span className="text-gradient">PDF Tools</span>
          </h1>
        </Link>

        {/* Tagline */}
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
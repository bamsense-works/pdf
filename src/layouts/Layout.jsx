import React from 'react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import PrivacyBanner from '../components/PrivacyBanner';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  return (
    <div>
      <Navigation />
      <Header />
      <main className={styles.main}>
        <div className={styles.innerContainer}>
          <PrivacyBanner />
          {children}
        </div>
      </main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Bamsense.works. Open Source PDF Tools.</p>
      </footer>
    </div>
  );
};

export default Layout;

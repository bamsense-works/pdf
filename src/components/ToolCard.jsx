import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ToolCard.module.css';

const ToolCard = ({ icon: Icon, title, description, to }) => {
  return (
    <Link to={to} className={styles.card}>
      <div className={styles.iconWrapper}>
        <Icon size={24} strokeWidth={2} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </Link>
  );
};

export default ToolCard;

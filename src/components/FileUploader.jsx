import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import styles from './FileUploader.module.css';

const FileUploader = ({ onFilesSelected, accept = { 'application/pdf': ['.pdf'] }, multiple = true }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple
  });

  return (
    <div 
      {...getRootProps()} 
      className={`${styles.uploader} ${isDragActive ? styles.active : ''}`}
      role="button"
      tabIndex={0}
      aria-label="File Upload Dropzone"
    >
      <input {...getInputProps()} id="file-upload-input" name="file-upload" />
      <UploadCloud className={styles.icon} aria-hidden="true" />
      <div>
        <p className={styles.textMain}>
          {isDragActive ? "Drop files here..." : "Select PDF files"}
        </p>
        <p className={styles.textSub}>
          or drop files here
        </p>
      </div>
      <label htmlFor="file-upload-input" className="btn btn-action" onClick={(e) => e.stopPropagation()}>
        Select PDF files
      </label>
    </div>
  );
};

export default FileUploader;

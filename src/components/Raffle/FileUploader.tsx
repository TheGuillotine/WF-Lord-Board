import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
  fileError: string | null;
}

export function FileUploader({ onFileUpload, isProcessing, fileError }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      onFileUpload(file);
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      onFileUpload(file);
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="file-uploader">
      <div 
        className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          className="file-input"
        />
        
        <div className="upload-icon">
          {isProcessing ? '⏳' : '📊'}
        </div>
        
        <div className="upload-text">
          {isProcessing ? (
            <span>Processing file...</span>
          ) : fileName ? (
            <span>File selected: <strong>{fileName}</strong></span>
          ) : (
            <>
              <span>Drop your Excel file here, or <strong>click to select</strong></span>
              <span className="upload-hint">Accepts .xlsx, .xls, .csv with wallet addresses</span>
            </>
          )}
        </div>
      </div>
      
      {fileError && (
        <div className="error-message mt-2">
          {fileError}
        </div>
      )}
    </div>
  );
}
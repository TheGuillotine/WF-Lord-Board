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
      
      // Verify it's a TXT file
      if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
        setFileError('Only .txt files are supported. Please upload a text file or paste addresses directly.');
        return;
      }
      
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
      
      // Verify it's a TXT file
      if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
        setFileError('Only .txt files are supported. Please upload a text file or paste addresses directly.');
        return;
      }
      
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
          accept=".txt,text/plain"
          className="file-input"
        />
        
        <div className="upload-icon">
          {isProcessing ? '⏳' : '📄'}
        </div>
        
        <div className="upload-text">
          {isProcessing ? (
            <span>Processing file...</span>
          ) : fileName ? (
            <span>File selected: <strong>{fileName}</strong></span>
          ) : (
            <>
              <span>Drop your text file with wallet addresses here, or <strong>click to select</strong></span>
              <span className="upload-hint">Only TXT files containing one wallet address per line</span>
            </>
          )}
        </div>
      </div>
      
      {fileError && (
        <div className="error-message mt-2">
          {fileError}
        </div>
      )}
      
      <style jsx>{`
        .file-uploader {
          width: 100%;
          margin-bottom: 1rem;
        }
        
        .file-upload-area {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 150px;
          padding: 1.5rem;
          border: 2px dashed #e2e8f0;
          border-radius: 0.5rem;
          background-color: #f7fafc;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .file-upload-area:hover {
          border-color: #cbd5e0;
          background-color: #edf2f7;
        }
        
        .drag-active {
          border-color: #4a5568;
          background-color: #edf2f7;
        }
        
        .file-input {
          position: absolute;
          width: 0;
          height: 0;
          opacity: 0;
        }
        
        .upload-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
          color: #4a5568;
        }
        
        .upload-text {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          color: #4a5568;
        }
        
        .upload-hint {
          font-size: 0.875rem;
          color: #718096;
        }
        
        .error-message {
          color: #e53e3e;
          font-size: 0.875rem;
        }
        
        .mt-2 {
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
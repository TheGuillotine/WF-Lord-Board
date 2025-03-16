import React, { useState, useEffect } from 'react';

interface AddressInputProps {
  onSubmitAddresses: (addresses: string[]) => void;
  isProcessing: boolean;
  error: string | null;
}

interface AddressValidation {
  text: string;
  isValid: boolean;
  errorReason?: string;
}

export function AddressInput({ onSubmitAddresses, isProcessing, error }: AddressInputProps) {
  const [addressText, setAddressText] = useState('');
  const [lineCount, setLineCount] = useState(0);
  const [validAddressCount, setValidAddressCount] = useState(0);
  const [uniqueAddressCount, setUniqueAddressCount] = useState(0);
  const [validatedLines, setValidatedLines] = useState<AddressValidation[]>([]);
  const [highlightedText, setHighlightedText] = useState('');
  
  // Process and validate the input text
  useEffect(() => {
    if (!addressText.trim()) {
      setValidatedLines([]);
      setLineCount(0);
      setValidAddressCount(0);
      setUniqueAddressCount(0);
      setHighlightedText('');
      return;
    }
    
    // Split text into lines and validate each line
    const lines = addressText.split(/\r?\n/).filter(line => line.trim() !== '');
    setLineCount(lines.length);
    
    const validations: AddressValidation[] = [];
    const validAddresses: string[] = [];
    
    lines.forEach(line => {
      // Check if the line contains a valid Ethereum address
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      const trimmedLine = line.trim();
      
      if (ethAddressRegex.test(trimmedLine)) {
        validations.push({ text: trimmedLine, isValid: true });
        validAddresses.push(trimmedLine.toLowerCase());
      } else {
        // If invalid, determine why
        let errorReason = 'Invalid format';
        
        if (trimmedLine.includes(' ')) {
          errorReason = 'Contains spaces';
        } else if (trimmedLine.length > 42) {
          errorReason = 'Too long';
        } else if (trimmedLine.length < 42) {
          errorReason = 'Too short';
        } else if (!trimmedLine.startsWith('0x')) {
          errorReason = 'Missing 0x prefix';
        } else if (!/^0x[a-fA-F0-9]*$/.test(trimmedLine)) {
          errorReason = 'Contains invalid characters';
        }
        
        validations.push({ text: trimmedLine, isValid: false, errorReason });
      }
    });
    
    setValidatedLines(validations);
    setValidAddressCount(validAddresses.length);
    
    // Count unique addresses
    const uniqueAddresses = [...new Set(validAddresses)];
    setUniqueAddressCount(uniqueAddresses.length);
    
    // Create highlighted text for display
    generateHighlightedText(validations);
    
  }, [addressText]);
  
  // Generate text with HTML highlighting for invalid addresses
  const generateHighlightedText = (validations: AddressValidation[]) => {
    // This won't be used directly in the textarea (which can't have HTML),
    // but will be used for a read-only display mode if needed
    const html = validations.map(v => 
      v.isValid 
        ? `<span class="valid-address">${v.text}</span>` 
        : `<span class="invalid-address" title="${v.errorReason}">${v.text}</span>`
    ).join('\n');
    
    setHighlightedText(html);
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAddressText(text);
  };
  
  const extractAddresses = (text: string): string[] => {
    // Define a regex to match Ethereum addresses
    const addressRegex = /0x[a-fA-F0-9]{40}/gi;
    
    // Extract all matches
    const matches = text.match(addressRegex) || [];
    
    // Normalize addresses (lowercase and trim)
    return matches.map(address => address.toLowerCase().trim());
  };
  
  const handleSubmit = () => {
    if (!addressText.trim()) return;
    
    // Extract and normalize addresses
    const extractedAddresses = extractAddresses(addressText);
    
    // Remove duplicates
    const uniqueAddresses = [...new Set(extractedAddresses)];
    
    // Log details for debugging
    console.log(`Lines detected: ${lineCount}`);
    console.log(`Valid addresses extracted: ${validAddressCount}`);
    console.log(`Unique addresses: ${uniqueAddressCount}`);
    
    if (validAddressCount < lineCount) {
      console.log("Some lines don't contain valid Ethereum addresses");
      
      // Log the invalid addresses
      validatedLines.filter(v => !v.isValid).forEach((line, i) => {
        console.log(`Invalid address ${i+1}: "${line.text}" - ${line.errorReason}`);
      });
    }
    
    // Submit the addresses
    onSubmitAddresses(uniqueAddresses);
  };
  
  return (
    <div className="address-input-container">
      <div className="text-area-container">
        <textarea
          className="address-textarea"
          placeholder="Paste wallet addresses here (0x...), one per line"
          value={addressText}
          onChange={handleTextChange}
          rows={10}
          disabled={isProcessing}
        />
        
        {validatedLines.length > 0 && (
          <div className="address-validation-overlay">
            {validatedLines.map((validation, index) => (
              <div 
                key={index} 
                className={`address-line ${validation.isValid ? 'valid-line' : 'invalid-line'}`}
                title={validation.isValid ? 'Valid address' : validation.errorReason}
              >
                {validation.text}
                {!validation.isValid && (
                  <span className="error-tooltip">{validation.errorReason}</span>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="address-count">
          {lineCount > 0 && (
            <div className="count-details">
              <div>Lines: {lineCount}</div>
              <div className={validAddressCount < lineCount ? 'warning' : ''}>
                Valid addresses: {validAddressCount}/{lineCount}
                {validAddressCount < lineCount && (
                  <span className="icon" title="Some lines contain invalid addresses">⚠️</span>
                )}
              </div>
              {validAddressCount !== uniqueAddressCount && (
                <div className="warning">
                  Unique addresses: {uniqueAddressCount} ({validAddressCount - uniqueAddressCount} duplicates will be removed)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {validAddressCount < lineCount && (
        <div className="error-message mt-2">
          <strong>Warning:</strong> {lineCount - validAddressCount} line(s) contain invalid Ethereum addresses.
          <ul className="invalid-address-list">
            {validatedLines.filter(v => !v.isValid).slice(0, 5).map((v, i) => (
              <li key={i}>"{v.text}" - {v.errorReason}</li>
            ))}
            {validatedLines.filter(v => !v.isValid).length > 5 && (
              <li>...and {validatedLines.filter(v => !v.isValid).length - 5} more</li>
            )}
          </ul>
        </div>
      )}
      
      {error && <div className="error-message mt-2">{error}</div>}
      
      <button
        className="btn btn-primary mt-4"
        onClick={handleSubmit}
        disabled={isProcessing || validAddressCount === 0}
      >
        {isProcessing ? 'Processing...' : 'Prepare Raffle'}
      </button>
      
      <style jsx>{`
        .address-input-container {
          width: 100%;
          margin-bottom: 1.5rem;
          position: relative;
        }
        
        .text-area-container {
          position: relative;
          width: 100%;
        }
        
        .address-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ccc;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
          resize: vertical;
          line-height: 1.5;
        }
        
        .address-validation-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: auto;
          padding: 0.75rem;
          font-family: monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          color: transparent;
          background: transparent;
        }
        
        .address-line {
          position: relative;
          white-space: pre;
        }
        
        .valid-line {
          /* No special styling for valid lines */
        }
        
        .invalid-line {
          position: relative;
          background-color: rgba(255, 0, 0, 0.1);
          border-radius: 0.25rem;
          color: #e53e3e;
          text-decoration: wavy underline #e53e3e;
        }
        
        .error-tooltip {
          display: none;
          position: absolute;
          right: 0;
          top: 0;
          background-color: #e53e3e;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          z-index: 10;
          white-space: nowrap;
        }
        
        .invalid-line:hover .error-tooltip {
          display: block;
        }
        
        .address-count {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #666;
          text-align: right;
        }
        
        .count-details {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .warning {
          color: #e67e22;
        }
        
        .icon {
          margin-left: 0.25rem;
        }
        
        .error-message {
          color: #e53e3e;
          font-size: 0.875rem;
          background-color: rgba(229, 62, 62, 0.1);
          padding: 0.75rem;
          border-radius: 0.25rem;
          border-left: 4px solid #e53e3e;
        }
        
        .invalid-address-list {
          margin-top: 0.5rem;
          margin-bottom: 0;
          padding-left: 1.5rem;
          font-size: 0.8rem;
        }
        
        .btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          font-weight: 600;
          text-align: center;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .btn-primary {
          color: white;
          background-color: #4a5568;
        }
        
        .btn-primary:hover {
          background-color: #2d3748;
        }
        
        .btn-primary:disabled {
          background-color: #718096;
          cursor: not-allowed;
        }
        
        .mt-2 {
          margin-top: 0.5rem;
        }
        
        .mt-4 {
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
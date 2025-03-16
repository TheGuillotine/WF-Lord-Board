import React, { useState } from 'react';

interface AddressInputProps {
  onSubmitAddresses: (addresses: string[]) => void;
  isProcessing: boolean;
  error: string | null;
}

export function AddressInput({ onSubmitAddresses, isProcessing, error }: AddressInputProps) {
  const [addressText, setAddressText] = useState('');
  const [addressCount, setAddressCount] = useState(0);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAddressText(text);
    
    // Count potential addresses by looking for 0x pattern
    const matches = text.match(/0x[a-fA-F0-9]{40}/gi);
    setAddressCount(matches ? matches.length : 0);
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
    
    // Submit the addresses
    onSubmitAddresses(uniqueAddresses);
  };
  
  return (
    <div className="address-input-container">
      <div className="text-area-container">
        <textarea
          className="address-textarea"
          placeholder="Paste wallet addresses here (0x...), one per line or separated by spaces, commas, etc."
          value={addressText}
          onChange={handleTextChange}
          rows={10}
          disabled={isProcessing}
        />
        
        <div className="address-count">
          {addressCount > 0 && (
            <span>Detected {addressCount} address{addressCount !== 1 ? 'es' : ''}</span>
          )}
        </div>
      </div>
      
      {error && <div className="error-message mt-2">{error}</div>}
      
      <button
        className="btn btn-primary mt-4"
        onClick={handleSubmit}
        disabled={isProcessing || addressCount === 0}
      >
        {isProcessing ? 'Processing...' : 'Prepare Raffle'}
      </button>
      
      <style jsx>{`
        .address-input-container {
          width: 100%;
          margin-bottom: 1.5rem;
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
        }
        
        .address-count {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #666;
          text-align: right;
        }
        
        .error-message {
          color: #e53e3e;
          font-size: 0.875rem;
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

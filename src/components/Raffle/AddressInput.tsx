import React, { useState } from 'react';

interface AddressInputProps {
  onSubmitAddresses: (addresses: string[]) => void;
  isProcessing: boolean;
  error: string | null;
}

export function AddressInput({ onSubmitAddresses, isProcessing, error }: AddressInputProps) {
  const [addressText, setAddressText] = useState('');
  const [addressCount, setAddressCount] = useState(0);
  const [uniqueAddressCount, setUniqueAddressCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAddressText(text);
    
    // Count lines
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    setLineCount(lines.length);
    
    // Extract and count Ethereum addresses
    const extractedAddresses = extractAddresses(text);
    setAddressCount(extractedAddresses.length);
    
    // Count unique addresses
    const uniqueAddresses = [...new Set(extractedAddresses)];
    setUniqueAddressCount(uniqueAddresses.length);
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
    console.log(`Total addresses extracted: ${extractedAddresses.length}`);
    console.log(`Unique addresses: ${uniqueAddresses.length}`);
    
    if (extractedAddresses.length < lineCount) {
      console.log("Some lines don't contain valid Ethereum addresses");
      // Debug: Log the first 5 lines that don't have addresses
      const lines = addressText.split(/\r?\n/).filter(line => line.trim() !== '');
      const linesWithoutAddresses = lines.filter(line => {
        const hasAddress = /0x[a-fA-F0-9]{40}/i.test(line);
        return !hasAddress && line.trim() !== '';
      });
      
      console.log("Sample lines without valid addresses:");
      linesWithoutAddresses.slice(0, 5).forEach((line, i) => {
        console.log(`Line ${i+1}: "${line}"`);
      });
    }
    
    if (uniqueAddresses.length < extractedAddresses.length) {
      console.log(`Found ${extractedAddresses.length - uniqueAddresses.length} duplicate addresses`);
      
      // Create a frequency map
      const addressCount: Record<string, number> = {};
      extractedAddresses.forEach(addr => {
        addressCount[addr] = (addressCount[addr] || 0) + 1;
      });
      
      // Find duplicates
      const duplicates = Object.entries(addressCount)
        .filter(([_, count]) => count > 1)
        .map(([addr, count]) => ({ address: addr, count }));
      
      console.log("Duplicate addresses:");
      duplicates.slice(0, 5).forEach(dup => {
        console.log(`${dup.address} appears ${dup.count} times`);
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
          placeholder="Paste wallet addresses here (0x...), one per line or separated by spaces, commas, etc."
          value={addressText}
          onChange={handleTextChange}
          rows={10}
          disabled={isProcessing}
        />
        
        <div className="address-count">
          {lineCount > 0 && (
            <div className="count-details">
              <div>Lines: {lineCount}</div>
              <div>Addresses found: {addressCount}</div>
              {addressCount !== uniqueAddressCount && (
                <div className="warning">
                  Unique addresses: {uniqueAddressCount} ({addressCount - uniqueAddressCount} duplicates will be removed)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {error && <div className="error-message mt-2">{error}</div>}
      
      <button
        className="btn btn-primary mt-4"
        onClick={handleSubmit}
        disabled={isProcessing || uniqueAddressCount === 0}
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
        
        .count-details {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .warning {
          color: #e67e22;
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
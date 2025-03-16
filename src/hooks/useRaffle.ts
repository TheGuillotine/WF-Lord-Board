import { useState, useCallback } from 'react';
import { useNFTData } from './useNFTData';

export interface Participant {
  address: string;
  rafflePower: number;
  percentage: number;
  isWinner: boolean;
}

export function useRaffle() {
  const { allLords, loading, error } = useNFTData();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Participant[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [raffleComplete, setRaffleComplete] = useState(false);
  
  // Get a list of all addresses in the system for validation purposes
  const getAllAddressesInSystem = useCallback(() => {
    const addresses = new Set<string>();
    
    allLords.forEach(lord => {
      if (lord.isStaked && lord.owner) {
        // Store address in normalized form (lowercase, trimmed)
        addresses.add(lord.owner.toLowerCase().trim());
      }
    });
    
    return addresses;
  }, [allLords]);
  
  // Calculate raffle power directly from allLords - this ensures consistency with the Stakers Data page
  const getRafflePowerByAddress = useCallback((targetAddress: string) => {
    if (!allLords.length) return 0;
    
    // Extra aggressive normalization to handle potential encoding issues
    const normalizeAddress = (addr: string): string => {
      return addr.toLowerCase().trim()
        .replace(/\s+/g, '') // Remove all whitespace
        .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces and BOM
    };
    
    // Normalize the target address
    const normalizedTargetAddress = normalizeAddress(targetAddress);
    
    // Debug output
    console.log(`Looking for raffle power for address: ${targetAddress} (normalized: ${normalizedTargetAddress})`);
    
    // Filter only staked lords owned by this address
    const addressLords = allLords.filter(lord => {
      if (!lord.isStaked || !lord.owner) return false;
      
      const normalizedOwner = normalizeAddress(lord.owner);
      const isMatch = normalizedOwner === normalizedTargetAddress;
      
      // Debug output for troubleshooting
      if (isMatch) {
        console.log(`Found match: ${lord.tokenId} owned by ${lord.owner} (normalized: ${normalizedOwner})`);
      }
      
      return isMatch;
    });
    
    // Debug output
    console.log(`Found ${addressLords.length} staked lords for address ${normalizedTargetAddress}`);
    
    // Calculate total raffle power for this address
    let totalRafflePower = 0;
    
    for (const lord of addressLords) {
      if (!lord.isStaked || !lord.stakingDuration) continue;
      
      const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
      const days = lord.stakingDuration;
      
      // Calculate tickets based on rarity - EXACTLY as in Stakers Data page
      let tickets = 0;
      switch (rarity) {
        case 'rare':
          tickets = 1;
          break;
        case 'epic':
          tickets = 2;
          break;
        case 'legendary':
          tickets = 4;
          break;
        case 'mystic':
          tickets = 8;
          break;
        default:
          tickets = 0;
      }
      
      // Multiply tickets by days staked
      const lordRafflePower = tickets * days;
      totalRafflePower += lordRafflePower;
      
      // Debug output
      console.log(`Lord ${lord.tokenId} (${rarity}): ${tickets} tickets × ${days} days = ${lordRafflePower} raffle power`);
    });
    
    console.log(`Total raffle power for ${normalizedTargetAddress}: ${totalRafflePower}`);
    return totalRafflePower;
  }, [allLords]);
  
  // Enhanced function to extract and normalize Ethereum addresses
  const extractAddresses = (text: string): string[] => {
    const addresses: string[] = [];
    
    // Extremely thorough normalization function
    const normalizeAddress = (addr: string): string => {
      return addr.toLowerCase().trim()
        .replace(/\s+/g, '') // Remove all whitespace
        .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces and BOM
    };
    
    // First attempt with standard regex
    const ethAddressRegex = /0x[a-fA-F0-9]{40}/gi;
    const matches = text.match(ethAddressRegex);
    
    if (matches) {
      // Normalize addresses
      matches.forEach(address => {
        addresses.push(normalizeAddress(address));
      });
    }
    
    return addresses;
  };
  
  // Parse uploaded file (CSV or TXT)
  const parseFile = useCallback(async (file: File) => {
    setFileError(null);
    setIsProcessing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    try {
      // Read file
      const text = await file.text();
      console.log(`File type: ${file.type}, File name: ${file.name}`);
      
      // Get all system addresses for validation
      const systemAddresses = getAllAddressesInSystem();
      console.log(`Total addresses in system: ${systemAddresses.size}`);
      
      // For debug: Log a sample of addresses in the system
      const sampleAddresses = Array.from(systemAddresses).slice(0, 5);
      console.log('Sample system addresses:', sampleAddresses);
      
      // Parse the content
      let extractedAddresses: string[] = [];
      
      // Log a sample of the file content for debugging
      console.log('File content sample:', text.substring(0, 200));
      
      // Detect file type
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      
      if (isCSV) {
        console.log('Processing as CSV file');
        
        // Remove any BOM characters that might be present in the file
        const cleanText = text.replace(/^\uFEFF/, '');
        
        // Split by lines
        const lines = cleanText.split(/\r?\n/);
        console.log(`CSV has ${lines.length} lines`);
        
        // Process each line
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines
          
          // Log first few lines for debugging
          if (i < 5) {
            console.log(`Line ${i+1}: "${line}"`);
          }
          
          // Direct address extraction from the line using regex
          const lineAddresses = extractAddresses(line);
          if (lineAddresses.length > 0) {
            extractedAddresses = [...extractedAddresses, ...lineAddresses];
            if (i < 5) {
              console.log(`Found addresses in line ${i+1}:`, lineAddresses);
            }
          } else {
            // If no direct matches, try splitting the line
            const parts = line.split(/[,;\t]/);
            for (const part of parts) {
              const cleanPart = part.trim()
                .replace(/^["'](.*)["']$/, '$1') // Remove quotes
                .replace(/\s+/g, ''); // Remove all whitespace
              
              // Skip empty parts
              if (!cleanPart) continue;
              
              // Check if this part looks like an Ethereum address
              if (/^0x[a-fA-F0-9]{40}$/i.test(cleanPart)) {
                const normalizedAddress = cleanPart.toLowerCase();
                extractedAddresses.push(normalizedAddress);
                if (i < 5) {
                  console.log(`Found address in part of line ${i+1}: ${normalizedAddress}`);
                }
              }
            }
          }
        }
      } else {
        console.log('Processing as plain text file');
        // For non-CSV, extract all Ethereum addresses using regex
        extractedAddresses = extractAddresses(text);
      }
      
      // Deduplicate addresses
      const uniqueAddresses = [...new Set(extractedAddresses)];
      console.log(`Found ${uniqueAddresses.length} unique addresses in the file`);
      
      // For debug: Log the first few extracted addresses
      console.log('First few extracted addresses:', uniqueAddresses.slice(0, 5));
      
      // IMPORTANT VERIFICATION STEP: Check if addresses are found in system
      for (let i = 0; i < Math.min(10, uniqueAddresses.length); i++) {
        const address = uniqueAddresses[i];
        const found = systemAddresses.has(address);
        console.log(`Address ${i+1}: ${address} - Found in system: ${found}`);
      }
      
      if (uniqueAddresses.length === 0) {
        setFileError('No valid wallet addresses found in the file');
        setIsProcessing(false);
        return;
      }
      
      // Calculate raffle power for each address using the same exact method as in Stakers Data page
      console.log('Calculating raffle power for each address...');
      const participantsList: Participant[] = uniqueAddresses.map(address => {
        console.log(`Processing address: ${address}`);
        const rafflePower = getRafflePowerByAddress(address);
        return {
          address,
          rafflePower,
          percentage: 0,
          isWinner: false
        };
      });
      
      // Log results for verification
      participantsList.slice(0, 5).forEach((p, i) => {
        console.log(`Participant ${i+1}: ${p.address} - Raffle Power: ${p.rafflePower}`);
      });
      
      // Calculate percentage for each participant
      const totalRafflePower = participantsList.reduce((sum, p) => sum + p.rafflePower, 0);
      console.log(`Total raffle power for all participants: ${totalRafflePower}`);
      
      const participantsWithPercentage = participantsList.map(p => ({
        ...p,
        percentage: totalRafflePower > 0 ? (p.rafflePower / totalRafflePower) * 100 : 0
      }));
      
      // Sort by raffle power descending
      participantsWithPercentage.sort((a, b) => b.rafflePower - a.rafflePower);
      
      setParticipants(participantsWithPercentage);
      setIsProcessing(false);
      
    } catch (err) {
      console.error('Error parsing file:', err);
      setFileError('Error parsing the file. Please ensure it is a valid file format.');
      setIsProcessing(false);
    }
  }, [getRafflePowerByAddress, getAllAddressesInSystem]);
  
  // Conduct the raffle draw
  const conductRaffle = useCallback((numWinners: number) => {
    setIsDrawing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    // Make sure we don't try to select more winners than participants
    const maxWinners = Math.min(numWinners, participants.length);
    
    // Create a weighted array for random selection
    const weightedParticipants: Participant[] = [];
    
    // Using a scale factor to handle very small percentages
    const scaleFactor = 10000;
    
    participants.forEach(participant => {
      // Skip participants with 0 raffle power
      if (participant.rafflePower <= 0) return;
      
      // Add the participant to the array based on their percentage (scaled)
      const count = Math.round(participant.percentage * scaleFactor / 100);
      for (let i = 0; i < count; i++) {
        weightedParticipants.push(participant);
      }
    });
    
    if (weightedParticipants.length === 0) {
      setFileError('No participants with raffle power found');
      setIsDrawing(false);
      return;
    }
    
    // Select winners
    const selectedWinners: Participant[] = [];
    const selectedAddresses = new Set<string>();
    
    // Try to select maxWinners unique participants
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop
    
    while (selectedWinners.length < maxWinners && attempts < maxAttempts) {
      const randomIndex = Math.floor(Math.random() * weightedParticipants.length);
      const selected = weightedParticipants[randomIndex];
      
      if (!selectedAddresses.has(selected.address)) {
        selectedAddresses.add(selected.address);
        selectedWinners.push(selected);
      }
      
      attempts++;
    }
    
    // Mark winners in participants list
    const updatedParticipants = participants.map(p => ({
      ...p,
      isWinner: selectedAddresses.has(p.address)
    }));
    
    setParticipants(updatedParticipants);
    setWinners(selectedWinners);
    setRaffleComplete(true);
    setIsDrawing(false);
    
  }, [participants]);
  
  return {
    participants,
    winners,
    parseExcelFile: parseFile, // renamed but kept the same function name for compatibility
    conductRaffle,
    isProcessing,
    isDrawing,
    fileError,
    loading,
    error,
    raffleComplete
  };
}
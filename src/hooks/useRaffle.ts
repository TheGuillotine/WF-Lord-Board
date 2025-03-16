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
  
  // Extremely thorough normalization function used consistently throughout
  const normalizeAddress = (addr: string): string => {
    if (!addr) return '';
    
    return addr.toLowerCase().trim()
      .replace(/\s+/g, '') // Remove all whitespace
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces and BOM
      .replace(/[^a-f0-9x]/gi, ''); // Remove any non-hex characters (extra safety)
  };
  
  // Get a list of all addresses in the system for validation purposes
  const getAllAddressesInSystem = useCallback(() => {
    const addresses = new Set<string>();
    
    // Create a map of normalized addresses to original addresses for debug purposes
    const addressMap = new Map<string, string>();
    
    allLords.forEach(lord => {
      if (lord.isStaked && lord.owner) {
        // Store address in normalized form
        const normalizedAddr = normalizeAddress(lord.owner);
        addresses.add(normalizedAddr);
        addressMap.set(normalizedAddr, lord.owner);
      }
    });
    
    // Log the first few addresses for debugging
    console.log("Sample addresses in system:");
    const sampleAddrs = Array.from(addressMap.entries()).slice(0, 5);
    sampleAddrs.forEach(([normalized, original]) => {
      console.log(`Original: ${original}, Normalized: ${normalized}`);
    });
    
    console.log(`Total unique addresses in system: ${addresses.size}`);
    return addresses;
  }, [allLords]);
  
  // Calculate raffle power directly from allLords - this ensures consistency with the Stakers Data page
  const getRafflePowerByAddress = useCallback((targetAddress: string) => {
    if (!allLords.length) return 0;
    
    // Normalize the target address with our consistent function
    const normalizedTargetAddress = normalizeAddress(targetAddress);
    
    // Prepare for alternative matching approaches if needed
    const originalTarget = targetAddress.trim();
    
    // Debug output
    console.log(`Looking for raffle power for address: ${originalTarget}`);
    console.log(`Normalized as: ${normalizedTargetAddress}`);
    
    if (!normalizedTargetAddress || !normalizedTargetAddress.startsWith('0x') || normalizedTargetAddress.length !== 42) {
      console.log(`Invalid address format: ${normalizedTargetAddress}`);
      return 0;
    }
    
    // Filter only staked lords owned by this address with more flexible matching
    const addressLords = allLords.filter(lord => {
      if (!lord.isStaked || !lord.owner) return false;
      
      // Try multiple matching approaches
      const normalizedOwner = normalizeAddress(lord.owner);
      
      // Check if normalized addresses match (primary approach)
      const isMatch = normalizedOwner === normalizedTargetAddress;
      
      // Check if case-insensitive addresses match (secondary approach)
      const caseInsensitiveMatch = !isMatch && 
        lord.owner.toLowerCase() === targetAddress.toLowerCase();
      
      // Check if non-normalized addresses match (tertiary approach)
      const originalMatch = !isMatch && !caseInsensitiveMatch && 
        lord.owner.trim() === originalTarget;
      
      const finalMatch = isMatch || caseInsensitiveMatch || originalMatch;
      
      // Debug output for troubleshooting
      if (finalMatch) {
        console.log(`Found match: ${lord.tokenId} owned by ${lord.owner}`);
        console.log(`Matched using: ${isMatch ? 'normalized' : (caseInsensitiveMatch ? 'case-insensitive' : 'original')}`);
      }
      
      return finalMatch;
    });
    
    // Debug output
    console.log(`Found ${addressLords.length} staked lords for address ${normalizedTargetAddress}`);
    
    if (addressLords.length === 0) {
      console.log(`WARNING: No staked lords found for address ${normalizedTargetAddress}`);
      
      // Log some system addresses for comparison
      const systemAddrs = getAllAddressesInSystem();
      console.log(`System has ${systemAddrs.size} unique addresses`);
      
      // Check if the address is in the system
      const isInSystem = systemAddrs.has(normalizedTargetAddress);
      console.log(`Is address in system: ${isInSystem}`);
      
      return 0;
    }
    
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
    }
    
    console.log(`Total raffle power for ${normalizedTargetAddress}: ${totalRafflePower}`);
    return totalRafflePower;
  }, [allLords, getAllAddressesInSystem]);
  
  // Process addresses pasted directly into the text area
  const processAddresses = useCallback((addresses: string[]) => {
    setFileError(null);
    setIsProcessing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    try {
      console.log(`Processing ${addresses.length} addresses`);
      
      // Get all system addresses for validation
      const systemAddresses = getAllAddressesInSystem();
      console.log(`Total addresses in system: ${systemAddresses.size}`);
      
      if (addresses.length === 0) {
        setFileError('No valid wallet addresses provided');
        setIsProcessing(false);
        return;
      }
      
      // Normalize all addresses
      const normalizedAddresses = addresses.map(addr => normalizeAddress(addr));
      
      // IMPORTANT VERIFICATION STEP: Check if addresses are found in system
      let addressesFoundInSystem = 0;
      for (let i = 0; i < Math.min(10, normalizedAddresses.length); i++) {
        const address = normalizedAddresses[i];
        const found = systemAddresses.has(address);
        if (found) addressesFoundInSystem++;
        console.log(`Address ${i+1}: ${address} - Found in system: ${found}`);
      }
      
      console.log(`Of first 10 addresses, ${addressesFoundInSystem} found in system`);
      
      if (addressesFoundInSystem === 0 && normalizedAddresses.length > 0) {
        console.log("WARNING: None of the first 10 addresses were found in the system!");
        console.log("This suggests a potential mismatch in address formats.");
      }
      
      // Calculate raffle power for each address using the same exact method as in Stakers Data page
      console.log('Calculating raffle power for each address...');
      const participantsList: Participant[] = normalizedAddresses.map(address => {
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
      let zeroRafflePowerCount = 0;
      participantsList.forEach((p, i) => {
        if (i < 5 || p.rafflePower > 0) {
          console.log(`Participant ${i+1}: ${p.address} - Raffle Power: ${p.rafflePower}`);
        }
        if (p.rafflePower === 0) zeroRafflePowerCount++;
      });
      
      console.log(`Total participants with zero raffle power: ${zeroRafflePowerCount}/${participantsList.length}`);
      
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
      console.error('Error processing addresses:', err);
      setFileError('Error processing addresses. Please try again.');
      setIsProcessing(false);
    }
  }, [getRafflePowerByAddress, getAllAddressesInSystem, normalizeAddress]);
  
  // Parse uploaded TXT file
  const parseFile = useCallback(async (file: File) => {
    setFileError(null);
    setIsProcessing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    try {
      // Verify it's a text file
      if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
        setFileError('Only .txt files are supported. Please upload a text file or paste addresses directly.');
        setIsProcessing(false);
        return;
      }
      
      // Read the file text
      const text = await file.text();
      console.log(`File encoding appears to be: ${detectEncoding(text)}`);
      
      // Check for and remove UTF-8 BOM if present
      const cleanText = text.replace(/^\uFEFF/, '');
      if (text !== cleanText) {
        console.log("UTF-8 BOM detected and removed");
      }
      
      // Split by lines and extract Ethereum addresses
      const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');
      console.log(`Found ${lines.length} lines in the text file`);
      
      // Log a small sample of the raw lines for debugging
      console.log("Sample lines from file:");
      lines.slice(0, 5).forEach((line, i) => {
        console.log(`Line ${i+1}: "${line}"`);
      });
      
      const addresses: string[] = [];
      const invalidLines: string[] = [];
      
      // Look for Ethereum addresses in each line
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Check if the line is a valid Ethereum address or contains one
        const ethAddressRegex = /0x[a-fA-F0-9]{40}/i;
        const match = trimmedLine.match(ethAddressRegex);
        
        if (match) {
          addresses.push(match[0]);
        } else {
          invalidLines.push(trimmedLine);
        }
      });
      
      if (invalidLines.length > 0) {
        console.log(`Found ${invalidLines.length} invalid lines in the text file`);
        invalidLines.slice(0, 5).forEach((line, i) => {
          console.log(`Invalid line ${i+1}: "${line}"`);
        });
      }
      
      if (addresses.length === 0) {
        setFileError('No valid Ethereum addresses found in the file.');
        setIsProcessing(false);
        return;
      }
      
      console.log(`Successfully extracted ${addresses.length} Ethereum addresses`);
      
      // Process the extracted addresses
      processAddresses(addresses);
      
    } catch (err) {
      console.error('Error parsing file:', err);
      setFileError('Error parsing the file. Please check that it contains valid Ethereum addresses, one per line.');
      setIsProcessing(false);
    }
  }, [processAddresses]);
  
  // Helper function to detect text encoding
  const detectEncoding = (text: string): string => {
    // Check for BOM markers
    if (text.charCodeAt(0) === 0xFEFF) return "UTF-8 with BOM";
    if (text.charCodeAt(0) === 0xFFFE) return "UTF-16LE";
    if (text.charCodeAt(0) === 0xFEFF && text.charCodeAt(1) === 0) return "UTF-16BE";
    
    // Check for common encoding patterns
    const hasHighAscii = /[\x80-\xFF]/.test(text);
    if (!hasHighAscii) return "ASCII or UTF-8";
    
    // Default to assuming UTF-8
    return "Likely UTF-8";
  };
  
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
    parseExcelFile: parseFile, // kept same function name for compatibility
    processAddresses, // For direct address input
    conductRaffle,
    isProcessing,
    isDrawing,
    fileError,
    loading,
    error,
    raffleComplete
  };
}
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
  
  // Process the stakers data to get raffle power - same formula as in Stakers Data
  const processStakersData = useCallback(() => {
    if (!allLords.length) return {};
    
    const stakerMap: Record<string, {
      rafflePower: number;
    }> = {};
    
    // Get all staked lords first
    const stakedLords = allLords.filter(lord => lord.isStaked);
    
    // Logging for debug - Can be removed in production
    console.log(`Total lords: ${allLords.length}, Staked lords: ${stakedLords.length}`);
    
    stakedLords.forEach(lord => {
      if (!lord.isStaked || !lord.stakingDuration) return;
      
      const ownerAddress = lord.owner.toLowerCase();
      
      // Initialize the staker's data if not already present
      if (!stakerMap[ownerAddress]) {
        stakerMap[ownerAddress] = { rafflePower: 0 };
      }
      
      // Get the rarity and calculate tickets
      const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
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
      
      // Add to the staker's raffle power
      stakerMap[ownerAddress].rafflePower += tickets * lord.stakingDuration;
    });
    
    // Debug logging to check the processed data
    console.log(`Found ${Object.keys(stakerMap).length} stakers with raffle power`);
    
    return stakerMap;
  }, [allLords]);
  
  // Parse uploaded file (CSV or TXT)
  const parseFile = useCallback(async (file: File) => {
    setFileError(null);
    setIsProcessing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    try {
      // Read file
      const text = await file.text();
      
      // Parse the content
      const addresses: string[] = [];
      
      // We'll handle both CSV and plain text formats
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Split by lines and look for addresses
        const lines = text.split(/\r?\n/);
        lines.forEach(line => {
          // Split line by common delimiters (comma, semicolon, tab)
          const parts = line.split(/[,;\t]/);
          
          // Look for ethereum addresses (0x followed by 40 hex chars)
          parts.forEach(part => {
            const trimmed = part.trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes
            if (/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) {
              addresses.push(trimmed.toLowerCase());
            }
          });
        });
      } else {
        // For non-CSV, extract all Ethereum addresses from the text
        const regex = /0x[a-fA-F0-9]{40}/gi;
        const matches = text.match(regex);
        
        if (matches) {
          addresses.push(...matches.map(addr => addr.toLowerCase()));
        }
      }
      
      if (addresses.length === 0) {
        setFileError('No valid wallet addresses found in the file');
        setIsProcessing(false);
        return;
      }
      
      // Get stakers data with raffle power
      const stakersData = processStakersData();
      
      // Log for debugging
      console.log(`Found ${addresses.length} addresses in the uploaded file`);
      
      // Map addresses to raffle power
      const participantsList: Participant[] = addresses.map(address => {
        // Ensure addresses are always lowercase for comparison
        const normalizedAddress = address.toLowerCase();
        const rafflePower = stakersData[normalizedAddress]?.rafflePower || 0;
        
        return {
          address: normalizedAddress,
          rafflePower,
          percentage: 0,
          isWinner: false
        };
      });
      
      // Calculate percentage for each participant
      const totalRafflePower = participantsList.reduce((sum, p) => sum + p.rafflePower, 0);
      
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
  }, [processStakersData]);
  
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
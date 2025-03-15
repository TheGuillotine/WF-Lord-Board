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
  
  // Process the stakers data to get raffle power
  const processStakersData = useCallback(() => {
    if (!allLords.length) return {};
    
    const stakerMap: Record<string, {
      rafflePower: number;
    }> = {};
    
    const calculateLordRafflePower = (lord: {
      isStaked: boolean;
      stakingDuration?: number;
      attributes: {
        rank: string[];
      };
    }): number => {
      if (!lord.isStaked || !lord.stakingDuration) return 0;
      
      const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
      const days = lord.stakingDuration;
      
      // Calculate tickets based on rarity
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
      return tickets * days;
    };
    
    // Only consider staked lords
    const stakedLords = allLords.filter(lord => lord.isStaked);
    
    stakedLords.forEach(lord => {
      const ownerAddress = lord.owner.toLowerCase();
      
      if (!stakerMap[ownerAddress]) {
        stakerMap[ownerAddress] = { rafflePower: 0 };
      }
      
      stakerMap[ownerAddress].rafflePower += calculateLordRafflePower(lord);
    });
    
    return stakerMap;
  }, [allLords]);
  
  // For debugging - get stakers data
  const getStakersAddresses = useCallback(() => {
    if (!allLords.length) return [];
    
    // Only consider staked lords
    const stakedLords = allLords.filter(lord => lord.isStaked);
    
    // Get unique owner addresses
    const uniqueOwners = new Set(stakedLords.map(lord => lord.owner.toLowerCase()));
    
    return Array.from(uniqueOwners);
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
      
      // Get all stakers addresses for debugging
      const allStakersAddresses = getStakersAddresses();
      
      // For debugging, check if addresses from the file match any known stakers
      const foundAddresses = addresses.filter(addr => allStakersAddresses.includes(addr));
      console.log(`Found ${foundAddresses.length} matching addresses out of ${addresses.length} uploaded`);
      
      // Map addresses to raffle power
      const participantsList: Participant[] = addresses.map(address => {
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
      
      setParticipants(participantsWithPercentage);
      setIsProcessing(false);
      
    } catch (err) {
      console.error('Error parsing file:', err);
      setFileError('Error parsing the file. Please ensure it is a valid file format.');
      setIsProcessing(false);
    }
  }, [processStakersData, getStakersAddresses]);
  
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
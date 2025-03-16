import { useState, useCallback, useEffect } from 'react';
import { useNFTData } from './useNFTData';
import { StakerData } from './useStakersData'; 
import { Lord } from '../types';

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
  
  // Store raffle power data for all addresses for fast lookups
  const [rafflePowerMap, setRafflePowerMap] = useState<Record<string, number>>({});
  
  // Function to calculate raffle power for a lord - IDENTICAL to useStakersData
  const calculateLordRafflePower = (lord: Lord): number => {
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
  
  // Initialize the raffle power map - using EXACTLY the same calculation as Stakers Data
  useEffect(() => {
    if (!loading && allLords.length > 0) {
      console.log("Building raffle power map with EXACTLY the same calculation as Stakers Data page...");
      
      // Only consider lords that are currently staked
      const stakedLords = allLords.filter(lord => lord.isStaked);
      console.log(`Found ${stakedLords.length} staked lords`);
      
      // Group by owner address
      const stakerMap = new Map<string, {
        lords: Lord[];
        rafflePower: number;
      }>();
      
      stakedLords.forEach(lord => {
        if (!lord.owner) return;
        
        // For consistent lookups, convert all addresses to lowercase
        const ownerAddress = lord.owner.toLowerCase();
        
        if (!stakerMap.has(ownerAddress)) {
          stakerMap.set(ownerAddress, {
            lords: [],
            rafflePower: 0
          });
        }
        
        const stakerData = stakerMap.get(ownerAddress)!;
        stakerData.lords.push(lord);
        stakerData.rafflePower += calculateLordRafflePower(lord);
      });
      
      // Convert to a simple lookup object
      const powerMap: Record<string, number> = {};
      stakerMap.forEach((data, address) => {
        powerMap[address] = data.rafflePower;
      });
      
      console.log(`Built raffle power map with ${Object.keys(powerMap).length} addresses`);
      setRafflePowerMap(powerMap);
      
      // Log a few examples for verification
      const examples = Object.entries(powerMap).slice(0, 5);
      examples.forEach(([addr, power]) => {
        console.log(`Address: ${addr}, Raffle Power: ${power}`);
      });
    }
  }, [loading, allLords]);
  
  // Enhanced normalization function
  const normalizeAddress = (address: string): string => {
    if (!address) return '';
    return address.toLowerCase().trim();
  };
  
  // Get raffle power for address using the pre-calculated map
  const getRafflePowerByAddress = useCallback((address: string): number => {
    const normalizedAddr = normalizeAddress(address);
    const rafflePower = rafflePowerMap[normalizedAddr] || 0;
    return rafflePower;
  }, [rafflePowerMap]);
  
  // Process addresses pasted directly into the text area
  const processAddresses = useCallback((addresses: string[]) => {
    setFileError(null);
    setIsProcessing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    try {
      console.log(`Processing ${addresses.length} addresses`);
      
      if (addresses.length === 0) {
        setFileError('No valid wallet addresses provided');
        setIsProcessing(false);
        return;
      }
      
      // Normalize all addresses
      const normalizedAddresses = addresses.map(addr => normalizeAddress(addr));
      
      // Get raffle power for each address
      console.log('Calculating raffle power for each address...');
      const participantsList: Participant[] = normalizedAddresses.map(address => {
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
  }, [getRafflePowerByAddress]);
  
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
      
      // Remove any BOM characters
      const cleanText = text.replace(/^\uFEFF/, '');
      
      // Split by lines and extract Ethereum addresses
      const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');
      console.log(`Found ${lines.length} lines in the text file`);
      
      const addresses: string[] = [];
      
      // Process each line to extract addresses
      lines.forEach(line => {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(/0x[a-fA-F0-9]{40}/i);
        
        if (match) {
          addresses.push(match[0]);
        }
      });
      
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
  
  // Conduct the raffle draw
  const conductRaffle = useCallback((numWinners: number) => {
    setIsDrawing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    // Filter out participants with 0 raffle power
    const eligibleParticipants = participants.filter(p => p.rafflePower > 0);
    
    // Make sure we don't try to select more winners than eligible participants
    const maxWinners = Math.min(numWinners, eligibleParticipants.length);
    
    // Create a weighted array for random selection
    const weightedParticipants: Participant[] = [];
    
    // Using a scale factor to handle very small percentages
    const scaleFactor = 10000;
    
    eligibleParticipants.forEach(participant => {
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
    loading: loading || Object.keys(rafflePowerMap).length === 0, // Add loading state for raffle power map
    error,
    raffleComplete
  };
}
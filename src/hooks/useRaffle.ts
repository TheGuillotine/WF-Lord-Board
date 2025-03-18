import { useState, useCallback } from 'react';
import { useNFTData } from './useNFTData';
import { Lord } from '../types';

export type PrizeType = 'Guarantee WL' | 'FCFS WL';

export interface Participant {
  address: string;
  rafflePower: number;
  percentage: number;
  isWinner: boolean;
  prizeType?: PrizeType; // New field for prize category
}

export function useRaffle() {
  const { allLords, loading, error } = useNFTData();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Participant[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [raffleComplete, setRaffleComplete] = useState(false);
  
  // Simple function to calculate raffle power for a lord
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
  
  // Simple address normalization
  const normalizeAddress = (address: string): string => {
    if (!address) return '';
    return address.toLowerCase().trim();
  };
  
  // Calculate raffle power for an address
  const getRafflePowerByAddress = useCallback((targetAddress: string): number => {
    if (!allLords.length) return 0;
    
    const normalizedAddress = normalizeAddress(targetAddress);
    if (!normalizedAddress) return 0;
    
    // Find all staked lords owned by this address
    const addressLords = allLords.filter(lord => 
      lord.isStaked && 
      lord.owner && 
      normalizeAddress(lord.owner) === normalizedAddress
    );
    
    // Sum up raffle power for all lords
    const totalRafflePower = addressLords.reduce((sum, lord) => {
      return sum + calculateLordRafflePower(lord);
    }, 0);
    
    return totalRafflePower;
  }, [allLords]);
  
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
      console.error('Error processing addresses:', err);
      setFileError('Error processing addresses. Please try again.');
      setIsProcessing(false);
    }
  }, [getRafflePowerByAddress]);
  
  // Conduct the raffle draw - Updated to handle two categories
  const conductRaffle = useCallback((guaranteeWinners: number, fcfsWinners: number) => {
    setIsDrawing(true);
    setRaffleComplete(false);
    setWinners([]);
    
    // Filter out participants with 0 raffle power
    const eligibleParticipants = participants.filter(p => p.rafflePower > 0);
    
    // Calculate max winners for each category
    const maxGuaranteeWinners = Math.min(guaranteeWinners, eligibleParticipants.length);
    const maxFcfsWinners = Math.min(fcfsWinners, eligibleParticipants.length - maxGuaranteeWinners);
    
    const totalWinners = maxGuaranteeWinners + maxFcfsWinners;
    
    if (totalWinners === 0) {
      setIsDrawing(false);
      return;
    }
    
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
    
    // Try to select unique winners
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop
    
    // First select guarantee winners
    while (selectedWinners.filter(w => w.prizeType === 'Guarantee WL').length < maxGuaranteeWinners && attempts < maxAttempts) {
      const randomIndex = Math.floor(Math.random() * weightedParticipants.length);
      const selected = {...weightedParticipants[randomIndex]};
      
      if (!selectedAddresses.has(selected.address)) {
        selected.prizeType = 'Guarantee WL';
        selectedAddresses.add(selected.address);
        selectedWinners.push(selected);
      }
      
      attempts++;
    }
    
    // Then select FCFS winners
    while (selectedWinners.filter(w => w.prizeType === 'FCFS WL').length < maxFcfsWinners && attempts < maxAttempts) {
      const randomIndex = Math.floor(Math.random() * weightedParticipants.length);
      const selected = {...weightedParticipants[randomIndex]};
      
      if (!selectedAddresses.has(selected.address)) {
        selected.prizeType = 'FCFS WL';
        selectedAddresses.add(selected.address);
        selectedWinners.push(selected);
      }
      
      attempts++;
    }
    
    // Mark winners in participants list
    const updatedParticipants = participants.map(p => {
      const winner = selectedWinners.find(w => w.address === p.address);
      return {
        ...p,
        isWinner: !!winner,
        prizeType: winner?.prizeType
      };
    });
    
    setParticipants(updatedParticipants);
    setWinners(selectedWinners);
    setRaffleComplete(true);
    setIsDrawing(false);
    
  }, [participants]);
  
  return {
    participants,
    winners,
    processAddresses,
    conductRaffle,
    isProcessing,
    isDrawing,
    fileError,
    loading,
    error,
    raffleComplete
  };
}
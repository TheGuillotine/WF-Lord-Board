import { useState, useEffect } from 'react';
import { Lord } from '../types';
import { useNFTData } from './useNFTData';

export interface StakerData {
  address: string;
  rareLords: number;
  epicLords: number;
  legendaryLords: number;
  mysticLords: number;
  totalLords: number;
  rafflePower: number;
}

export function useStakersData() {
  const { allLords, loading, error } = useNFTData();
  const [stakers, setStakers] = useState<StakerData[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

  // Function to calculate raffle power for a lord
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

  useEffect(() => {
    if (!loading && allLords.length > 0) {
      setIsProcessing(true);
      
      // Only consider lords that are currently staked
      const stakedLords = allLords.filter(lord => lord.isStaked);
      
      // Group by owner address
      const stakerMap = new Map<string, {
        rare: Lord[];
        epic: Lord[];
        legendary: Lord[];
        mystic: Lord[];
        all: Lord[];
        rafflePower: number;
      }>();
      
      stakedLords.forEach(lord => {
        const ownerAddress = lord.owner.toLowerCase();
        const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
        
        if (!stakerMap.has(ownerAddress)) {
          stakerMap.set(ownerAddress, {
            rare: [],
            epic: [],
            legendary: [],
            mystic: [],
            all: [],
            rafflePower: 0
          });
        }
        
        const stakerData = stakerMap.get(ownerAddress)!;
        
        // Add to rarity-specific array
        switch (rarity) {
          case 'rare':
            stakerData.rare.push(lord);
            break;
          case 'epic':
            stakerData.epic.push(lord);
            break;
          case 'legendary':
            stakerData.legendary.push(lord);
            break;
          case 'mystic':
            stakerData.mystic.push(lord);
            break;
        }
        
        // Add to total count
        stakerData.all.push(lord);
        
        // Add this lord's raffle power to the total
        stakerData.rafflePower += calculateLordRafflePower(lord);
      });
      
      // Convert map to array of StakerData objects
      const stakersArray: StakerData[] = Array.from(stakerMap.entries()).map(([address, data]) => ({
        address,
        rareLords: data.rare.length,
        epicLords: data.epic.length,
        legendaryLords: data.legendary.length,
        mysticLords: data.mystic.length,
        totalLords: data.all.length,
        rafflePower: data.rafflePower
      }));
      
      // Sort by raffle power (descending)
      stakersArray.sort((a, b) => b.rafflePower - a.rafflePower);
      
      setStakers(stakersArray);
      setIsProcessing(false);
    }
  }, [loading, allLords]);

  return {
    stakers,
    loading: loading || isProcessing,
    error
  };
}
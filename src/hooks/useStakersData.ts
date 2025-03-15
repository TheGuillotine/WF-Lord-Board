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
}

export function useStakersData() {
  const { allLords, loading, error } = useNFTData();
  const [stakers, setStakers] = useState<StakerData[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

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
            all: []
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
      });
      
      // Convert map to array of StakerData objects
      const stakersArray: StakerData[] = Array.from(stakerMap.entries()).map(([address, data]) => ({
        address,
        rareLords: data.rare.length,
        epicLords: data.epic.length,
        legendaryLords: data.legendary.length,
        mysticLords: data.mystic.length,
        totalLords: data.all.length
      }));
      
      // Sort by total number of staked lords (descending)
      stakersArray.sort((a, b) => b.totalLords - a.totalLords);
      
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
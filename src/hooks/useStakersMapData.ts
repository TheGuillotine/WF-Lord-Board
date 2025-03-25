import { useState, useEffect } from 'react';
import { useNFTData } from './useNFTData';
import { generatePositions } from '../utils/mapGeneration';

// Types for our kingdom visualization
export interface LordRepresentation {
  id: string;
  specie: string;
  rarity: string;
  isStaked: boolean;
  stakingDuration: number | null;
}

export interface Kingdom {
  id: string;
  address: string;
  position: { x: number; y: number };
  size: number; // Based on total lords or raffle power
  rareLords: LordRepresentation[];
  epicLords: LordRepresentation[];
  legendaryLords: LordRepresentation[];
  mysticLords: LordRepresentation[];
  totalLords: number;
  rafflePower: number;
  // For kingdom visualization/layout
  color: string;
  expanded: boolean;
}

export function useStakersMapData() {
  const { allLords, loading, error } = useNFTData();
  const [kingdoms, setKingdoms] = useState<Kingdom[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

  // Function to calculate raffle power for a lord
  const calculateLordRafflePower = (lordRarity: string, stakingDuration: number): number => {
    if (!stakingDuration) return 0;
    
    // Calculate tickets based on rarity
    let tickets = 0;
    switch (lordRarity.toLowerCase()) {
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
    return tickets * stakingDuration;
  };

  // Generate a consistent color based on address
  const generateColor = (address: string): string => {
    // Create a simple hash of the address
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = ((hash << 5) - hash) + address.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Use the hash to generate HSL color with good saturation and lightness
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  };

  useEffect(() => {
    if (!loading && allLords.length > 0) {
      setIsProcessing(true);
      
      // Only consider lords that are currently staked
      const stakedLords = allLords.filter(lord => lord.isStaked);
      
      // Group by owner address
      const kingdomMap = new Map<string, {
        rare: LordRepresentation[];
        epic: LordRepresentation[];
        legendary: LordRepresentation[];
        mystic: LordRepresentation[];
        all: LordRepresentation[];
        rafflePower: number;
      }>();
      
      stakedLords.forEach(lord => {
        const ownerAddress = lord.owner.toLowerCase();
        const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
        const specie = lord.attributes.specie[0]?.toLowerCase() || '';
        
        if (!kingdomMap.has(ownerAddress)) {
          kingdomMap.set(ownerAddress, {
            rare: [],
            epic: [],
            legendary: [],
            mystic: [],
            all: [],
            rafflePower: 0
          });
        }
        
        const kingdomData = kingdomMap.get(ownerAddress)!;
        
        // Create lord representation
        const lordRep: LordRepresentation = {
          id: lord.tokenId,
          specie,
          rarity,
          isStaked: lord.isStaked,
          stakingDuration: lord.stakingDuration
        };
        
        // Add to rarity-specific array
        switch (rarity) {
          case 'rare':
            kingdomData.rare.push(lordRep);
            break;
          case 'epic':
            kingdomData.epic.push(lordRep);
            break;
          case 'legendary':
            kingdomData.legendary.push(lordRep);
            break;
          case 'mystic':
            kingdomData.mystic.push(lordRep);
            break;
        }
        
        // Add to total count
        kingdomData.all.push(lordRep);
        
        // Add this lord's raffle power to the total
        if (lord.stakingDuration) {
          kingdomData.rafflePower += calculateLordRafflePower(rarity, lord.stakingDuration);
        }
      });
      
      // Convert map to array of Kingdom objects
      let kingdomsArray: Kingdom[] = Array.from(kingdomMap.entries()).map(([address, data], index) => ({
        id: `kingdom-${index}`,
        address,
        position: { x: 0, y: 0 }, // Will be set by generatePositions
        size: Math.sqrt(data.all.length) * 10 + 30, // Size based on sqrt of total lords
        rareLords: data.rare,
        epicLords: data.epic,
        legendaryLords: data.legendary,
        mysticLords: data.mystic,
        totalLords: data.all.length,
        rafflePower: data.rafflePower,
        color: generateColor(address),
        expanded: false
      }));
      
      // Generate positions for kingdoms
      kingdomsArray = generatePositions(kingdomsArray);
      
      // Sort by raffle power (descending)
      kingdomsArray.sort((a, b) => b.rafflePower - a.rafflePower);
      
      setKingdoms(kingdomsArray);
      setIsProcessing(false);
    }
  }, [loading, allLords]);

  return {
    kingdoms,
    loading: loading || isProcessing,
    error
  };
}

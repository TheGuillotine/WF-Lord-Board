export interface Lord {
    tokenId: string;
    name: string;
    owner: string;
    isStaked: boolean;
    stakingDuration: number | null;
    attributes: {
      rank: string[];
      specie: string[];
    };
  }
  
  export interface GraphQLResponse {
    data: {
      erc721Tokens: {
        results: {
          name: string;
          owner: string;
          tokenId: string;
          attributes: {
            rank: string[];
            specie: string[];
          };
        }[];
      };
    };
  }
  
  export interface RPCResponse {
    result?: string;
    error?: {
      code: number;
      message: string;
      data: string;
    };
  }
  
  export interface StakingStats {
    uniqueStakers: number;
    totalStaked: number;
    averageDuration: number;
  }
  
  export interface FilterOptions {
    lordSpecie: string;
    lordRarity: string;
    minDuration: number;
    sortBy: SortOption;
    onlyStaked: boolean;
  }
  
  export type SortOption = 
    | 'durationHighToLow' 
    | 'durationLowToHigh' 
    | 'tokenIdAsc'
    | 'tokenIdDesc';
  
  export const LORD_SPECIES = ['All', 'Wolf', 'Owl', 'Raven', 'Boar', 'Fox'];
  export const LORD_RARITIES = ['All', 'Rare', 'Epic', 'Legendary', 'Mystic'];
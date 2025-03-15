import { useState, useEffect, useCallback, useRef } from 'react';
import { Lord, StakingStats, FilterOptions, LORD_SPECIES, LORD_RARITIES } from '../types';

export function useNFTData() {
  const [lords, setLords] = useState<Lord[]>([]);
  const [filteredLords, setFilteredLords] = useState<Lord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StakingStats>({
    uniqueStakers: 0,
    totalStaked: 0,
    averageDuration: 0,
  });
  
  const [filters, setFilters] = useState<FilterOptions>({
    lordSpecie: 'All Species',
    lordRarity: 'All Rarities',
    minDuration: 0,
    sortBy: 'durationHighToLow',
    onlyStaked: false,
  });

  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const calculateGlobalStats = (lordsData: Lord[]): StakingStats => {
    const stakedLords = lordsData.filter(lord => lord.isStaked);
    const uniqueOwners = new Set(stakedLords.map(lord => lord.owner)).size;
    const totalDuration = stakedLords.reduce((sum, lord) => sum + (lord.stakingDuration || 0), 0);
    
    return {
      uniqueStakers: uniqueOwners,
      totalStaked: stakedLords.length,
      averageDuration: stakedLords.length ? Math.round(totalDuration / stakedLords.length) : 0,
    };
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        let allLords: Lord[] = [];
        let from = 0;
        const pageSize = 50;
        let hasMoreResults = true;
        
        const initialFetch = async () => {
          const currentFilters = filtersRef.current;
          const queryParams = new URLSearchParams({
            from: '0',
            size: pageSize.toString(),
            lordSpecie: currentFilters.lordSpecie,
            lordRarity: currentFilters.lordRarity,
            minDuration: currentFilters.minDuration.toString(),
            onlyStaked: currentFilters.onlyStaked.toString()
          });
          
          const response = await fetch(`/api/staking-data?${queryParams}`);
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.fromCache) {
            console.log(`Retrieved ${data.lords.length} lords from cache for initial fetch`);
          }
          
          return data;
        };
        
        const initialData = await initialFetch();
        allLords = [...initialData.lords];

        setLords(initialData.lords);
        setStats(calculateGlobalStats(initialData.lords));
        
        from = pageSize;
        
        const fetchBatch = async () => {
          if (!hasMoreResults || from >= 3000) {
            setLoading(false);
            setIsFetchingMore(false);
            return;
          }
          
          setIsFetchingMore(true);
        
          const batchRequests: Promise<Lord[]>[] = [];
          
          for (let i = 0; i < 8 && from < 3000; i++) {
            const currentFrom = from + (i * pageSize);
            
            const fetchPage = async (): Promise<Lord[]> => {
              try {
                await new Promise(resolve => setTimeout(resolve, i * 75));
                
                const currentFilters = filtersRef.current;
                const queryParams = new URLSearchParams({
                  from: currentFrom.toString(),
                  size: pageSize.toString(),
                  lordSpecie: currentFilters.lordSpecie,
                  lordRarity: currentFilters.lordRarity,
                  minDuration: currentFilters.minDuration.toString(),
                  onlyStaked: currentFilters.onlyStaked.toString()
                });
                
                const response = await fetch(`/api/staking-data?${queryParams}`);
                
                if (!response.ok) {
                  console.error(`API request failed: ${response.statusText}`);
                  return [];
                }
                
                const data = await response.json();
                if (data.fromCache) {
                  console.log(`Retrieved ${data.lords.length} lords from cache for batch ${currentFrom}`);
                }
                return Array.isArray(data.lords) ? data.lords as Lord[] : [];
              } catch (err) {
                console.error('Error in batch fetch:', err);
                return [];
              }
            };
            
            batchRequests.push(fetchPage());
          }
          
          from += pageSize * 8;
          
          const batchResults = await Promise.all(batchRequests);
          const newLords = batchResults.flat();
          
          if (newLords.length === 0) {
            hasMoreResults = false;
            setLoading(false);
            setIsFetchingMore(false);
            return;
          }

          allLords = [...allLords, ...newLords];
          
          setLords(prev => {
            const updatedLords = [...prev, ...newLords];
            setStats(calculateGlobalStats(updatedLords));
            return updatedLords;
          });
          
          setTimeout(fetchBatch, 300);
        };
        
        fetchBatch();
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch Lord data');
        console.error('Error fetching Lord data:', err);
        setLoading(false);
        setIsFetchingMore(false);
      }
    }

    fetchData();
  }, []);

  const applyFiltersAndSort = useCallback(() => {
    const filtered = lords.filter(lord => {
      if (filters.onlyStaked && !lord.isStaked) {
        return false;
      }
      
      const specie = lord.attributes.specie[0]?.toLowerCase() || '';
      const matchesSpecie = filters.lordSpecie === 'All Species' ? 
        true : 
        specie === filters.lordSpecie.toLowerCase();
      
      const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
      const matchesRarity = filters.lordRarity === 'All Rarities' ? 
        true : 
        rarity === filters.lordRarity.toLowerCase();
      
      const matchesDuration = !lord.isStaked ? 
        !filters.onlyStaked : 
        (lord.stakingDuration || 0) >= filters.minDuration;
      
      return matchesSpecie && matchesRarity && matchesDuration;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case 'durationHighToLow':
          if (!a.isStaked && !b.isStaked) return 0;
          if (!a.isStaked) return 1;
          if (!b.isStaked) return -1;
          return (b.stakingDuration || 0) - (a.stakingDuration || 0);
          
        case 'durationLowToHigh':
          if (!a.isStaked && !b.isStaked) return 0;
          if (!a.isStaked) return 1;
          if (!b.isStaked) return -1;
          return (a.stakingDuration || 0) - (b.stakingDuration || 0);
          
        case 'tokenIdAsc':
          return parseInt(a.tokenId) - parseInt(b.tokenId);
          
        case 'tokenIdDesc':
          return parseInt(b.tokenId) - parseInt(a.tokenId);
          
        default:
          return 0;
      }
    });
    
    setFilteredLords(sorted);
  }, [filters, lords]);

  useEffect(() => {
    if (lords.length > 0) {
      applyFiltersAndSort();
    }
  }, [lords, applyFiltersAndSort]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    lords: filteredLords,
    allLords: lords,
    loading,
    isFetchingMore,
    error,
    stats,
    filters,
    updateFilters,
    species: LORD_SPECIES,
    rarities: LORD_RARITIES,
  };
}
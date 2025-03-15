import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchNFTs } from '../../services/graphql';
import { checkStakingStatus, getTokenOwner } from '../../services/rpc';
import { Lord, StakingStats } from '../../types';
import { getFromCache, setCache } from '../../utils/redis';

const STAKING_CONTRACT = '0xfb597d6fa6c08f5434e6ecf69114497343ae13dd';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { 
      from = '0', 
      size = '50', 
      lordSpecie = 'All Species',
      lordRarity = 'All Rarities',
      minDuration = '0',
      onlyStaked = 'false',
    } = req.query;

    const cacheKey = `lords:${from}-${size}-${lordSpecie}-${lordRarity}-${minDuration}-${onlyStaked}`;
    
    const cachedLords = await getFromCache<Lord[]>(cacheKey);
    
    if (cachedLords && cachedLords.length > 0) {
      console.log(`Found ${cachedLords.length} lords in cache for key ${cacheKey}`);
      
      const filteredLords = applyFilters(cachedLords, {
        lordSpecie: lordSpecie as string,
        lordRarity: lordRarity as string,
        minDuration: parseInt(minDuration as string),
        onlyStaked: onlyStaked === 'true'
      });
      
      const stats = calculateStats(cachedLords);
      
      res.status(200).json({
        lords: filteredLords,
        stats,
        fromCache: true
      });
      return;
    }
    
    const fromInt = parseInt(from as string);
    const sizeInt = parseInt(size as string);
    
    const response = await fetchNFTs(sizeInt, fromInt);
    const lordResults = response.data.erc721Tokens.results;
    
    const processedLords: Lord[] = [];
    
    for (const lord of lordResults) {
      const isStakedBasedOnOwner = lord.owner.toLowerCase() === STAKING_CONTRACT.toLowerCase();
      
      let stakingDuration: number | null = null;
      let realOwner = lord.owner;

      if (isStakedBasedOnOwner) {
        const stakingCacheKey = `staking:${lord.tokenId}`;
        stakingDuration = await getFromCache<number | null>(stakingCacheKey);
        
        if (stakingDuration === null) {
          stakingDuration = await checkStakingStatus(lord.tokenId);
          await setCache(stakingCacheKey, stakingDuration, 86400);
        }

        const ownerCacheKey = `owner:${lord.tokenId}`;
        let owner = await getFromCache<string | null>(ownerCacheKey);
        
        if (owner === null) {
          owner = await getTokenOwner(lord.tokenId);
          await setCache(ownerCacheKey, owner, 86400);
        }
        
        if (owner) {
          realOwner = owner;
        }
      }
      
      const isStaked = isStakedBasedOnOwner && stakingDuration !== null;
      
      processedLords.push({
        tokenId: lord.tokenId,
        name: lord.name,
        owner: realOwner,
        isStaked: isStaked,
        stakingDuration: isStaked ? stakingDuration : null,
        attributes: {
          rank: lord.attributes?.rank || [],
          specie: lord.attributes?.specie || [],
        }
      });
    }

    await setCache(cacheKey, processedLords, 86400);

    const filteredLords = applyFilters(processedLords, {
      lordSpecie: lordSpecie as string,
      lordRarity: lordRarity as string,
      minDuration: parseInt(minDuration as string),
      onlyStaked: onlyStaked === 'true'
    });

    const stats = calculateStats(processedLords);
    
    res.status(200).json({
      lords: filteredLords,
      stats,
      fromCache: false
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Lords staking data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function applyFilters(lords: Lord[], filters: {
  lordSpecie: string;
  lordRarity: string;
  minDuration: number;
  onlyStaked: boolean;
}): Lord[] {
  return lords.filter(lord => {
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
}

function calculateStats(lords: Lord[]): StakingStats {
  const stakedLords = lords.filter(lord => lord.isStaked);
  const uniqueOwners = new Set(stakedLords.map(lord => lord.owner)).size;
  const totalDuration = stakedLords.reduce((sum, lord) => sum + (lord.stakingDuration || 0), 0);
  
  return {
    uniqueStakers: uniqueOwners,
    totalStaked: stakedLords.length,
    averageDuration: stakedLords.length ? Math.round(totalDuration / stakedLords.length) : 0,
  };
}
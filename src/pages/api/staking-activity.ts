import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchStakingActivity } from '../../services/activity';
import { StakingActivity } from '../../types';
import { getFromCache, setCache } from '../../utils/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { page = '1', limit = '20' } = req.query;
    
    const pageInt = parseInt(page as string);
    const limitInt = Math.min(parseInt(limit as string), 50); // Cap at 50 items per page
    
    const cacheKey = `staking-activity:${pageInt}-${limitInt}`;
    
    // Try to get from cache first
    const cachedActivities = await getFromCache<StakingActivity[]>(cacheKey);
    
    if (cachedActivities && cachedActivities.length > 0) {
      console.log(`Found ${cachedActivities.length} activities in cache for key ${cacheKey}`);
      
      res.status(200).json({
        activities: cachedActivities,
        hasMore: cachedActivities.length === limitInt,
        page: pageInt,
        fromCache: true
      });
      return;
    }
    
    // Fetch fresh data if not in cache
    const activities = await fetchStakingActivity(limitInt);
    
    // Cache the results for 5 minutes (300 seconds)
    // Short cache time since we want relatively fresh activity data
    await setCache(cacheKey, activities, 300);
    
    res.status(200).json({
      activities,
      hasMore: activities.length === limitInt,
      page: pageInt,
      fromCache: false
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch staking activity data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
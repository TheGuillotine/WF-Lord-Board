import { useState, useEffect, useCallback } from 'react';
import { StakingActivity } from '../types';

export function useStakingActivity() {
  const [activities, setActivities] = useState<StakingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const fetchActivity = useCallback(async (pageToFetch = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/staking-activity?page=${pageToFetch}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (pageToFetch === 1) {
        setActivities(data.activities);
      } else {
        setActivities(prev => [...prev, ...data.activities]);
      }
      
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking activity');
      console.error('Error fetching staking activity:', err);
      setLoading(false);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchActivity(1);
  }, [fetchActivity]);
  
  // Function to load more activities
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchActivity(nextPage);
    }
  }, [loading, hasMore, page, fetchActivity]);
  
  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore
  };
}
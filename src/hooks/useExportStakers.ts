import { useCallback } from 'react';
import { StakerData } from './useStakersData';
import { exportToCsv } from '../utils/exportToCsv';

export function useExportStakers() {
  const prepareData = useCallback((stakers: StakerData[]) => {
    return stakers.map(staker => ({
      'Wallet Address': staker.address,
      'Rare Lords': staker.rareLords,
      'Epic Lords': staker.epicLords,
      'Legendary Lords': staker.legendaryLords,
      'Mystic Lords': staker.mysticLords,
      'Total Lords': staker.totalLords,
      'Raffle Power': staker.rafflePower
    }));
  }, []);

  const exportStakers = useCallback((stakers: StakerData[]) => {
    if (!stakers || stakers.length === 0) {
      alert('No data available to export');
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const filename = `wild-forest-stakers-${date}.csv`;
    
    const exportData = prepareData(stakers);
    exportToCsv(exportData, filename);
  }, [prepareData]);

  return exportStakers;
}
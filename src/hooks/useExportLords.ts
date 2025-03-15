import { useCallback } from 'react';
import { Lord } from '../types';
import { exportToCsv } from '../utils/exportToCsv';

export function useExportLords() {
  const prepareData = useCallback((lords: Lord[]) => {
    return lords.map(lord => ({
      TokenId: lord.tokenId,
      Species: lord.attributes.specie[0] || '',
      Rarity: lord.attributes.rank[0] || '',
      Owner: lord.owner,
      IsStaked: lord.isStaked ? 'Yes' : 'No',
      StakingDuration: lord.stakingDuration || 0
    }));
  }, []);

  const exportLords = useCallback((lords: Lord[], filenamePrefix = 'wild-forest-lords') => {
    if (!lords || lords.length === 0) {
      alert('No data available to export');
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const filename = `${filenamePrefix}-${date}.csv`;
    
    const exportData = prepareData(lords);
    exportToCsv(exportData, filename);
  }, [prepareData]);

  return exportLords;
}
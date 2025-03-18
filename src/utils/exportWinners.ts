import { Participant } from '../hooks/useRaffle';

export function exportWinnersToCSV(winners: Participant[], filename = 'raffle-winners'): void {
  if (winners.length === 0) {
    alert('No winners to export');
    return;
  }

  const date = new Date().toISOString().split('T')[0];
  const exportFilename = `${filename}-${date}.csv`;
  
  // Create CSV headers and content
  const headers = ['Rank', 'Prize Type', 'Wallet Address', 'Raffle Power', 'Win Chance (%)'];
  
  // Group winners by prize type
  const guaranteeWinners = winners.filter(w => w.prizeType === 'Guarantee WL');
  const fcfsWinners = winners.filter(w => w.prizeType === 'FCFS WL');
  
  // Create rows for each winner
  const csvRows = [];
  
  // Add Guarantee WL winners
  guaranteeWinners.forEach((winner, index) => {
    csvRows.push([
      index + 1,
      'Guarantee WL',
      winner.address,
      winner.rafflePower,
      winner.percentage.toFixed(2)
    ].join(','));
  });
  
  // Add FCFS WL winners
  fcfsWinners.forEach((winner, index) => {
    csvRows.push([
      index + 1,
      'FCFS WL',
      winner.address,
      winner.rafflePower,
      winner.percentage.toFixed(2)
    ].join(','));
  });

  const csvContent = [
    headers.join(','),
    ...csvRows
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', exportFilename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
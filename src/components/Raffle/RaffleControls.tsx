import React, { useState } from 'react';
import { Participant } from '../../hooks/useRaffle';
import { exportWinnersToCSV } from '../../utils/exportWinners';

interface RaffleControlsProps {
  participants: Participant[];
  onConductRaffle: (numWinners: number) => void;
  isDrawing: boolean;
  winners: Participant[];
  raffleComplete: boolean;
}

export function RaffleControls({ 
  participants, 
  onConductRaffle, 
  isDrawing, 
  winners,
  raffleComplete
}: RaffleControlsProps) {
  const [numWinners, setNumWinners] = useState(1);
  
  // Calculate the max possible winners (can't be more than participants)
  const maxWinners = participants.length;
  
  // Format address
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const handleNumWinnersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= maxWinners) {
      setNumWinners(value);
    }
  };
  
  const handleStartRaffle = () => {
    onConductRaffle(numWinners);
  };
  
  const handleExportWinners = () => {
    exportWinnersToCSV(winners);
  };
  
  if (participants.length === 0) {
    return null;
  }
  
  return (
    <div className="raffle-controls-container">
      <div className="raffle-controls">
        <div className="control-group">
          <label htmlFor="numWinners" className="control-label">
            Number of Winners:
          </label>
          <div className="number-input-group">
            <input
              type="number"
              id="numWinners"
              className="number-input"
              value={numWinners}
              min={1}
              max={maxWinners}
              onChange={handleNumWinnersChange}
              disabled={isDrawing || raffleComplete}
            />
            <div className="number-controls">
              <button 
                className="number-control" 
                onClick={() => setNumWinners(prev => Math.min(prev + 1, maxWinners))}
                disabled={numWinners >= maxWinners || isDrawing || raffleComplete}
              >
                ▲
              </button>
              <button 
                className="number-control" 
                onClick={() => setNumWinners(prev => Math.max(prev - 1, 1))}
                disabled={numWinners <= 1 || isDrawing || raffleComplete}
              >
                ▼
              </button>
            </div>
          </div>
        </div>
        
        <button
          className={`raffle-button ${isDrawing ? 'loading' : ''} ${raffleComplete ? 'complete' : ''}`}
          onClick={handleStartRaffle}
          disabled={isDrawing || raffleComplete || participants.length === 0}
        >
          {isDrawing 
            ? "Drawing..." 
            : raffleComplete 
              ? "Raffle Complete" 
              : "Start Raffle Draw"}
        </button>
      </div>
      
      {raffleComplete && winners.length > 0 && (
        <div className="winners-display">
          <h3 className="winners-title">🏆 Winners 🏆</h3>
          
          <div className="winners-list">
            {winners.map((winner, index) => (
              <div key={winner.address} className="winner-card">
                <div className="winner-number">#{index + 1}</div>
                <div className="winner-info">
                  <div className="winner-address">
                    <a
                      href={`https://marketplace.roninchain.com/account/${winner.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contract-link"
                    >
                      {formatAddress(winner.address)}
                    </a>
                  </div>
                  <div className="winner-stats">
                    <span className="winner-power">
                      Raffle Power: {winner.rafflePower.toLocaleString()}
                    </span>
                    <span className="winner-chance">
                      Win Chance: {winner.percentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="export-winners-container">
            <button
              className="export-winners-btn"
              onClick={handleExportWinners}
              title="Export winners to CSV"
            >
              <span className="export-icon">📋</span>
              Export Winners to CSV
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .export-winners-container {
          display: flex;
          justify-content: center;
          margin-top: 1.5rem;
        }
        
        .export-winners-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        .export-winners-btn:hover {
          background-color: #45a049;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .export-winners-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
        }
        
        .export-icon {
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}
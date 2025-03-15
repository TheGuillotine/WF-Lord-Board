import React, { useState } from 'react';
import { Participant } from '../../hooks/useRaffle';

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
        </div>
      )}
    </div>
  );
}
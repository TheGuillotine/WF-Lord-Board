import React, { useState } from 'react';
import { Participant } from '../../hooks/useRaffle';
import { exportWinnersToCSV } from '../../utils/exportWinners';

interface RaffleControlsProps {
  participants: Participant[];
  onConductRaffle: (guaranteeWinners: number, fcfsWinners: number) => void;
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
  const [guaranteeWinners, setGuaranteeWinners] = useState(1);
  const [fcfsWinners, setFcfsWinners] = useState(1);
  
  // Calculate the max possible winners (can't be more than participants)
  const maxWinners = participants.length;
  
  // Format address
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const handleGuaranteeWinnersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value + fcfsWinners <= maxWinners) {
      setGuaranteeWinners(value);
    }
  };
  
  const handleFcfsWinnersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value + guaranteeWinners <= maxWinners) {
      setFcfsWinners(value);
    }
  };
  
  const handleStartRaffle = () => {
    onConductRaffle(guaranteeWinners, fcfsWinners);
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
          <label htmlFor="guaranteeWinners" className="control-label">
            Guarantee WL Winners:
          </label>
          <div className="number-input-group">
            <input
              type="number"
              id="guaranteeWinners"
              className="number-input"
              value={guaranteeWinners}
              min={0}
              max={maxWinners - fcfsWinners}
              onChange={handleGuaranteeWinnersChange}
              disabled={isDrawing || raffleComplete}
            />
            <div className="number-controls">
              <button 
                className="number-control" 
                onClick={() => setGuaranteeWinners(prev => Math.min(prev + 1, maxWinners - fcfsWinners))}
                disabled={guaranteeWinners + fcfsWinners >= maxWinners || isDrawing || raffleComplete}
              >
                ▲
              </button>
              <button 
                className="number-control" 
                onClick={() => setGuaranteeWinners(prev => Math.max(prev - 1, 0))}
                disabled={guaranteeWinners <= 0 || isDrawing || raffleComplete}
              >
                ▼
              </button>
            </div>
          </div>
        </div>
        
        <div className="control-group">
          <label htmlFor="fcfsWinners" className="control-label">
            FCFS WL Winners:
          </label>
          <div className="number-input-group">
            <input
              type="number"
              id="fcfsWinners"
              className="number-input"
              value={fcfsWinners}
              min={0}
              max={maxWinners - guaranteeWinners}
              onChange={handleFcfsWinnersChange}
              disabled={isDrawing || raffleComplete}
            />
            <div className="number-controls">
              <button 
                className="number-control" 
                onClick={() => setFcfsWinners(prev => Math.min(prev + 1, maxWinners - guaranteeWinners))}
                disabled={guaranteeWinners + fcfsWinners >= maxWinners || isDrawing || raffleComplete}
              >
                ▲
              </button>
              <button 
                className="number-control" 
                onClick={() => setFcfsWinners(prev => Math.max(prev - 1, 0))}
                disabled={fcfsWinners <= 0 || isDrawing || raffleComplete}
              >
                ▼
              </button>
            </div>
          </div>
        </div>
        
        <button
          className={`raffle-button ${isDrawing ? 'loading' : ''} ${raffleComplete ? 'complete' : ''}`}
          onClick={handleStartRaffle}
          disabled={isDrawing || raffleComplete || participants.length === 0 || (guaranteeWinners === 0 && fcfsWinners === 0)}
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
          
          {/* Guarantee WL Winners */}
          {winners.filter(w => w.prizeType === 'Guarantee WL').length > 0 && (
            <div className="prize-category">
              <div className="prize-header guarantee-header">
                <h4>Guarantee WL Winners</h4>
              </div>
              <div className="winners-grid">
                {winners
                  .filter(winner => winner.prizeType === 'Guarantee WL')
                  .map((winner, index) => (
                    <div key={winner.address} className="winner-card guarantee-card">
                      <div className="card-content">
                        <div className="winner-rank">{index + 1}</div>
                        <div className="winner-info">
                          <a
                            href={`https://marketplace.roninchain.com/account/${winner.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wallet-address"
                          >
                            {formatAddress(winner.address)}
                          </a>
                          <div className="winner-stats">
                            <div className="stat">
                              <span>Power:</span> {winner.rafflePower.toLocaleString()}
                            </div>
                            <div className="stat">
                              <span>Chance:</span> {winner.percentage.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* FCFS WL Winners */}
          {winners.filter(w => w.prizeType === 'FCFS WL').length > 0 && (
            <div className="prize-category">
              <div className="prize-header fcfs-header">
                <h4>FCFS WL Winners</h4>
              </div>
              <div className="winners-grid">
                {winners
                  .filter(winner => winner.prizeType === 'FCFS WL')
                  .map((winner, index) => (
                    <div key={winner.address} className="winner-card fcfs-card">
                      <div className="card-content">
                        <div className="winner-rank">{index + 1}</div>
                        <div className="winner-info">
                          <a
                            href={`https://marketplace.roninchain.com/account/${winner.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wallet-address"
                          >
                            {formatAddress(winner.address)}
                          </a>
                          <div className="winner-stats">
                            <div className="stat">
                              <span>Power:</span> {winner.rafflePower.toLocaleString()}
                            </div>
                            <div className="stat">
                              <span>Chance:</span> {winner.percentage.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
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
        .raffle-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .control-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #4a5568;
        }
        
        .number-input-group {
          display: flex;
          align-items: center;
        }
        
        .number-input {
          width: 70px;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.25rem;
          text-align: center;
        }
        
        .number-controls {
          display: flex;
          flex-direction: column;
          margin-left: 0.5rem;
        }
        
        .number-control {
          padding: 0;
          width: 24px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          background-color: #f7fafc;
          cursor: pointer;
          font-size: 10px;
        }
        
        .raffle-button {
          padding: 0.75rem 1.5rem;
          background-color: #4a5568;
          color: white;
          border: none;
          border-radius: 0.25rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
          width: 100%;
        }
        
        .raffle-button:hover {
          background-color: #2d3748;
        }
        
        .raffle-button:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
        }
        
        .winners-display {
          margin-top: 2rem;
          border-top: 1px solid #e2e8f0;
          padding-top: 2rem;
        }
        
        .winners-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          text-align: center;
          color: #2d3748;
        }
        
        .prize-category {
          margin-bottom: 1.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .prize-header {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .guarantee-header {
          background-color: rgba(72, 187, 120, 0.1);
        }
        
        .fcfs-header {
          background-color: rgba(237, 137, 54, 0.1);
        }
        
        .prize-header h4 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          color: #2d3748;
        }
        
        .winners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.5rem;
          padding: 0.75rem;
          background-color: #f8fafc;
        }
        
        .winner-card {
          background-color: white;
          border-radius: 0.25rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          overflow: hidden;
        }
        
        .guarantee-card {
          border-left: 3px solid #48bb78;
        }
        
        .fcfs-card {
          border-left: 3px solid #ed8936;
        }
        
        .winner-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .card-content {
          display: flex;
          padding: 0.75rem;
        }
        
        .winner-rank {
          width: 1.5rem;
          height: 1.5rem;
          background-color: #f7fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          color: #4a5568;
          margin-right: 0.75rem;
          border: 1px solid #e2e8f0;
        }
        
        .guarantee-card .winner-rank {
          color: #2f855a;
          border-color: #c6f6d5;
          background-color: #f0fff4;
        }
        
        .fcfs-card .winner-rank {
          color: #c05621;
          border-color: #feebc8;
          background-color: #fffaf0;
        }
        
        .winner-info {
          flex: 1;
          min-width: 0; /* Allow text truncation to work in flex child */
        }
        
        .wallet-address {
          display: block;
          font-family: monospace;
          font-size: 0.85rem;
          color: #4a5568;
          text-decoration: none;
          margin-bottom: 0.5rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .guarantee-card .wallet-address:hover {
          color: #2f855a;
        }
        
        .fcfs-card .wallet-address:hover {
          color: #c05621;
        }
        
        .winner-stats {
          font-size: 0.75rem;
          color: #718096;
        }
        
        .stat {
          display: flex;
          justify-content: space-between;
        }
        
        .stat span {
          color: #a0aec0;
        }
        
        .guarantee-card .stat {
          color: #38a169;
        }
        
        .fcfs-card .stat {
          color: #dd6b20;
        }
        
        .export-winners-container {
          display: flex;
          justify-content: center;
          margin-top: 1.5rem;
        }
        
        .export-winners-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 0.25rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .export-winners-btn:hover {
          background-color: #45a049;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .export-winners-btn:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .export-icon {
          font-size: 1.1rem;
        }
        
        @media (min-width: 640px) {
          .raffle-controls {
            flex-direction: row;
            align-items: flex-end;
          }
          
          .raffle-button {
            width: auto;
            margin-top: 0;
          }
        }
      `}</style>
    </div>
  );
}
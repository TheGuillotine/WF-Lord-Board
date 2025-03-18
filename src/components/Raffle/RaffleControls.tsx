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
              <div className="prize-header">
                <div className="prize-icon guarantee-icon">🔐</div>
                <h4>Guarantee WL Winners</h4>
              </div>
              <div className="winners-grid guarantee-winners">
                {winners
                  .filter(winner => winner.prizeType === 'Guarantee WL')
                  .map((winner, index) => (
                    <div key={winner.address} className="winner-card">
                      <div className="card-top">
                        <div className="winner-badge">{index + 1}</div>
                        <a
                          href={`https://marketplace.roninchain.com/account/${winner.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contract-link"
                        >
                          {formatAddress(winner.address)}
                        </a>
                      </div>
                      <div className="card-stats">
                        <div className="stat-item">
                          <span className="stat-label">Raffle Power:</span>
                          <span className="stat-value">{winner.rafflePower.toLocaleString()}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Win Chance:</span>
                          <span className="stat-value">{winner.percentage.toFixed(2)}%</span>
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
              <div className="prize-header">
                <div className="prize-icon fcfs-icon">🏃</div>
                <h4>FCFS WL Winners</h4>
              </div>
              <div className="winners-grid fcfs-winners">
                {winners
                  .filter(winner => winner.prizeType === 'FCFS WL')
                  .map((winner, index) => (
                    <div key={winner.address} className="winner-card">
                      <div className="card-top">
                        <div className="winner-badge">{index + 1}</div>
                        <a
                          href={`https://marketplace.roninchain.com/account/${winner.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contract-link"
                        >
                          {formatAddress(winner.address)}
                        </a>
                      </div>
                      <div className="card-stats">
                        <div className="stat-item">
                          <span className="stat-label">Raffle Power:</span>
                          <span className="stat-value">{winner.rafflePower.toLocaleString()}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Win Chance:</span>
                          <span className="stat-value">{winner.percentage.toFixed(2)}%</span>
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
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          text-align: center;
          color: #2d3748;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .prize-category {
          margin-bottom: 2rem;
          border-radius: 0.75rem;
          padding: 1.5rem;
          background-color: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .prize-header {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #f7fafc;
          padding-bottom: 1rem;
        }
        
        .prize-icon {
          font-size: 1.5rem;
          margin-right: 0.75rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .guarantee-icon {
          background-color: rgba(72, 187, 120, 0.15);
          color: #2f855a;
        }
        
        .fcfs-icon {
          background-color: rgba(237, 137, 54, 0.15);
          color: #c05621;
        }
        
        .prize-category h4 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0;
        }
        
        .winners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
        
        .winner-card {
          border-radius: 0.75rem;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .guarantee-winners .winner-card {
          background: linear-gradient(to bottom, #f0fff4, #ffffff);
          border: 1px solid #c6f6d5;
        }
        
        .fcfs-winners .winner-card {
          background: linear-gradient(to bottom, #fffaf0, #ffffff);
          border: 1px solid #feebc8;
        }
        
        .winner-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .card-top {
          padding: 1rem;
          display: flex;
          align-items: center;
          position: relative;
        }
        
        .guarantee-winners .card-top {
          background-color: rgba(72, 187, 120, 0.1);
          border-bottom: 2px solid rgba(72, 187, 120, 0.2);
        }
        
        .fcfs-winners .card-top {
          background-color: rgba(237, 137, 54, 0.1);
          border-bottom: 2px solid rgba(237, 137, 54, 0.2);
        }
        
        .winner-badge {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 800;
          font-size: 0.9rem;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }
        
        .guarantee-winners .winner-badge {
          background-color: #48bb78;
          color: white;
        }
        
        .fcfs-winners .winner-badge {
          background-color: #ed8936;
          color: white;
        }
        
        .contract-link {
          color: #4a5568;
          text-decoration: none;
          font-family: monospace;
          font-size: 0.9rem;
          font-weight: 600;
          transition: color 0.2s ease;
          word-break: break-all;
        }
        
        .guarantee-winners .contract-link:hover {
          color: #2f855a;
        }
        
        .fcfs-winners .contract-link:hover {
          color: #c05621;
        }
        
        .card-stats {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background-color: #ffffff;
          height: 100%;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }
        
        .stat-label {
          color: #718096;
        }
        
        .stat-value {
          font-weight: 600;
          color: #2d3748;
        }
        
        .guarantee-winners .stat-value {
          color: #2f855a;
        }
        
        .fcfs-winners .stat-value {
          color: #c05621;
        }
        
        .export-winners-container {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }
        
        .export-winners-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.75rem;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .export-winners-btn:hover {
          background-color: #45a049;
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }
        
        .export-winners-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .export-icon {
          font-size: 1.25rem;
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
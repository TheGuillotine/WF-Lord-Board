import React from 'react';
import { StakingActivity } from '../../types';

interface ActivityItemProps {
  activity: StakingActivity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const { actionType, tokenId, timestamp, owner, transactionHash } = activity;
  
  // Format the timestamp
  const date = new Date(timestamp * 1000);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Transaction link
  const transactionLink = `https://app.roninchain.com/tx/${transactionHash}`;
  
  // Different styling based on action type
  const isStake = actionType === 'stake';
  const actionClass = isStake ? 'stake-action' : 'unstake-action';
  const actionIcon = isStake ? '🔒' : '🔓';
  const actionText = isStake ? 'Staked' : 'Unstaked';
  
  return (
    <div className={`activity-item ${actionClass}`}>
      <div className="action-indicator">
        <div className="action-icon">{actionIcon}</div>
      </div>
      
      <div className="activity-content">
        <div className="activity-header">
          <span className="action-type">{actionText}</span>
          <span className="lord-id">Lord #{tokenId}</span>
        </div>
        
        <div className="activity-details">
          <div className="owner-info">
            <span className="detail-label">Owner:</span>
            <a
              href={`https://app.roninchain.com/address/${owner}`}
              target="_blank"
              rel="noopener noreferrer"
              className="address-link"
            >
              {formatAddress(owner)}
            </a>
          </div>
          
          <div className="transaction-info">
            <span className="detail-label">Tx:</span>
            <a
              href={transactionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="transaction-link"
            >
              {formatAddress(transactionHash)}
            </a>
          </div>
        </div>
        
        <div className="timestamp">
          {formattedDate} at {formattedTime}
        </div>
      </div>
      
      <style jsx>{`
        .activity-item {
          display: flex;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          background-color: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
        }
        
        .stake-action {
          border-left: 4px solid #4CAF50;
        }
        
        .unstake-action {
          border-left: 4px solid #f44336;
        }
        
        .action-indicator {
          margin-right: 16px;
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
        }
        
        .action-icon {
          font-size: 20px;
        }
        
        .activity-content {
          flex: 1;
        }
        
        .activity-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .action-type {
          font-weight: 600;
          font-size: 16px;
          margin-right: 8px;
        }
        
        .stake-action .action-type {
          color: #4CAF50;
        }
        
        .unstake-action .action-type {
          color: #f44336;
        }
        
        .lord-id {
          font-weight: 500;
          color: #4a5568;
        }
        
        .activity-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .owner-info, .transaction-info {
          display: flex;
          align-items: center;
        }
        
        .detail-label {
          color: #718096;
          margin-right: 6px;
        }
        
        .address-link, .transaction-link {
          color: #4a5568;
          text-decoration: none;
          font-family: monospace;
          transition: color 0.2s;
        }
        
        .address-link:hover, .transaction-link:hover {
          text-decoration: underline;
          color: #2d3748;
        }
        
        .timestamp {
          font-size: 12px;
          color: #718096;
        }
        
        @media (max-width: 480px) {
          .activity-details {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
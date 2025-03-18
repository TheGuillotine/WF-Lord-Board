import React from 'react';
import { StakingActivity } from '../../types';
import { ActivityItem } from './ActivityItem';

interface ActivityFeedProps {
  activities: StakingActivity[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function ActivityFeed({ activities, loading, hasMore, onLoadMore }: ActivityFeedProps) {
  if (activities.length === 0 && !loading) {
    return (
      <div className="empty-state">
        <p>No staking activity found.</p>
        <style jsx>{`
          .empty-state {
            text-align: center;
            padding: 40px;
            color: #718096;
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="activity-feed">
      {activities.map(activity => (
        <ActivityItem 
          key={`${activity.transactionHash}-${activity.tokenId}`} 
          activity={activity} 
        />
      ))}
      
      {loading && (
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <p>Loading activity...</p>
        </div>
      )}
      
      {!loading && hasMore && (
        <div className="load-more-container">
          <button className="load-more-button" onClick={onLoadMore}>
            Load More Activity
          </button>
        </div>
      )}
      
      <style jsx>{`
        .activity-feed {
          width: 100%;
        }
        
        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          margin-top: 20px;
          color: #718096;
        }
        
        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #4a5568;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .load-more-container {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }
        
        .load-more-button {
          background-color: #4a5568;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .load-more-button:hover {
          background-color: #2d3748;
        }
      `}</style>
    </div>
  );
}
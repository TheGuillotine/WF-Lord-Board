import React from 'react';
import { StakingStats as StatsType } from '../../types';

interface StakingStatsProps {
  stats: StatsType;
  loading: boolean;
}

export function StakingStats({ stats, loading }: StakingStatsProps) {
  return (
    <div className="stats-container">
      <div className="stats-title">Lord Staking Statistics</div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">😎</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading && stats.uniqueStakers === 0 ? (
                <div className="skeleton-value"></div>
              ) : (
                stats.uniqueStakers || '--'
              )}
            </div>
            <div className="stat-label">Unique Stakers</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👑</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading && stats.totalStaked === 0 ? (
                <div className="skeleton-value"></div>
              ) : (
                stats.totalStaked || '--'
              )}
            </div>
            <div className="stat-label">Total Lords Staked</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading && stats.averageDuration === 0 ? (
                <div className="skeleton-value"></div>
              ) : (
                stats.averageDuration || '--'
              )}
            </div>
            <div className="stat-label">Average Duration (days)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
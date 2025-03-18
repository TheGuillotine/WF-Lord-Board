import React from 'react';
import Head from 'next/head';
import { EnhancedLayout } from '../components/Layout/EnhancedLayout';
import { ActivityFeed } from '../components/Staking/ActivityFeed';
import { useStakingActivity } from '../hooks/useStakingActivity';

export default function StakingActivityPage() {
  const { activities, loading, error, hasMore, loadMore } = useStakingActivity();

  return (
    <>
      <Head>
        <title>Wild Forest: Lord Staking Activity</title>
        <meta name="description" content="Track staking and unstaking activity for Wild Forest Lords NFTs" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>

      <EnhancedLayout>
        <div className="staking-activity-page">
          <div className="page-header">
            <h1 className="page-title">Lord Staking Activity</h1>
            <p className="page-description">
              Track real-time staking and unstaking transactions for Wild Forest Lords NFTs
            </p>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <ActivityFeed 
            activities={activities} 
            loading={loading} 
            hasMore={hasMore} 
            onLoadMore={loadMore} 
          />
        </div>

        <style jsx>{`
          .staking-activity-page {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px 16px;
          }
          
          .page-header {
            text-align: center;
            margin-bottom: 32px;
          }
          
          .page-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: #2d3748;
          }
          
          .page-description {
            font-size: 1rem;
            color: #718096;
            max-width: 600px;
            margin: 0 auto;
          }
          
          .error-message {
            background-color: #fff5f5;
            color: #e53e3e;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            border-left: 4px solid #e53e3e;
          }
          
          @media (max-width: 640px) {
            .page-title {
              font-size: 1.75rem;
            }
            
            .page-description {
              font-size: 0.9rem;
            }
          }
        `}</style>
      </EnhancedLayout>
    </>
  );
}
import React from 'react';
import Head from 'next/head';
import { EnhancedLayout } from '../components/Layout/EnhancedLayout';
import { StakersList } from '../components/Dashboard/StakersList';
import { useStakersData } from '../hooks/useStakersData';

export default function StakersPage() {
  const { stakers, loading, error } = useStakersData();

  return (
    <>
      <Head>
        <title>Wild Forest: Stakers Data - Staking Tracker</title>
        <meta name="description" content="Track staking statistics for Wild Forest Lords NFTs" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>

      <EnhancedLayout>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-light mb-2">Stakers Data</h1>
          <p className="text-light-alt">View all stakers and their staked Lords by rarity</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <StakersList 
          stakers={stakers} 
          loading={loading} 
        />
      </EnhancedLayout>
    </>
  );
}
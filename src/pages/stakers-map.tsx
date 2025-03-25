import React from 'react';
import Head from 'next/head';
import { EnhancedLayout } from '../components/Layout/EnhancedLayout';
import { StakersMap } from '../components/Dashboard/StakersMap';
import { useStakersMapData } from '../hooks/useStakersMapData';

export default function StakersMapPage() {
  const { kingdoms, loading, error } = useStakersMapData();

  return (
    <>
      <Head>
        <title>Wild Forest: Stakers Map - Staking Tracker</title>
        <meta name="description" content="Interactive map of Wild Forest Lords stakers" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>

      <EnhancedLayout>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-light mb-2">Stakers Map</h1>
          <p className="text-light-alt">Explore the kingdoms of Wild Forest Lords stakers</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <StakersMap 
          kingdoms={kingdoms} 
          loading={loading} 
        />
      </EnhancedLayout>
    </>
  );
}
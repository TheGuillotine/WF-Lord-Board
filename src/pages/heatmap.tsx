import React from 'react';
import Head from 'next/head';
import { EnhancedLayout } from '../components/Layout/EnhancedLayout';
import { StakingHeatmap } from '../components/Visualizations/StakingHeatmap';
import { useNFTData } from '../hooks/useNFTData';

export default function HeatmapPage() {
  const { allLords, loading, error } = useNFTData();

  return (
    <>
      <Head>
        <title>Wild Forest: Staking Heatmap - Staking Tracker</title>
        <meta name="description" content="Visualize staking patterns by species and rarity for Wild Forest Lords NFTs" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>

      <EnhancedLayout>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-light mb-2">Staking Heatmap</h1>
          <p className="text-light-alt">Visualize staking patterns by species and rarity</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <StakingHeatmap 
          lords={allLords} 
          loading={loading} 
        />
      </EnhancedLayout>
    </>
  );
}
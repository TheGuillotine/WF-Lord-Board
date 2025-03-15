import React from 'react';
import Head from 'next/head';
import { Layout } from '../components/Layout/Layout';
import { StakingStats } from '../components/Dashboard/StakingStats';
import { FilterControls } from '../components/Dashboard/FilterControls';
import { LordsList } from '../components/Dashboard/LordsList';
import { useNFTData } from '../hooks/useNFTData';

export default function Home() {
  const {
    stats,
    loading,
    error,
    filters,
    updateFilters,
    lords,
    species,
    rarities,
    isFetchingMore
  } = useNFTData();

  return (
    <>
      <Head>
        <title>Wild Forest: Lord Collection - Staking Tracker</title>
        <meta name="description" content="Track staking statistics for Wild Forest Lords NFTs" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>

      <Layout>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-light mb-2"></h1>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <StakingStats 
          stats={stats} 
          loading={loading} 
        />

        <FilterControls 
          filters={filters} 
          updateFilters={updateFilters} 
          loading={loading}
          species={species}
          rarities={rarities}
        />

        <LordsList 
          lords={lords} 
          loading={loading} 
          isFetchingMore={isFetchingMore} 
        />
      </Layout>
    </>
  );
}
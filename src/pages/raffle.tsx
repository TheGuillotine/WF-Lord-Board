import React, { useState } from 'react';
import Head from 'next/head';
import { EnhancedLayout } from '../components/Layout/EnhancedLayout';
import { FileUploader } from '../components/Raffle/FileUploader';
import { ParticipantsList } from '../components/Raffle/ParticipantsList';
import { RaffleControls } from '../components/Raffle/RaffleControls';
import { useRaffle } from '../hooks/useRaffle';

export default function RafflePage() {
  const {
    participants,
    winners,
    parseExcelFile,
    conductRaffle,
    isProcessing,
    isDrawing,
    fileError,
    loading,
    error,
    raffleComplete
  } = useRaffle();

  const handleFileUpload = (file: File) => {
    parseExcelFile(file);
  };

  return (
    <>
      <Head>
        <title>Wild Forest: Organize a Raffle</title>
        <meta name="description" content="Organize raffles for Wild Forest Lords NFTs" />
        <link rel="icon" href="/images/favicon.ico" />
      </Head>

      <EnhancedLayout>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-light mb-2">Organize a Raffle</h1>
          <p className="text-light-alt">Upload a list of participants and draw winners based on raffle power</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="raffle-page">
          <section className="upload-section">
            <h2 className="section-title">1. Upload Participants List</h2>
            <p className="section-desc">
              Upload a CSV file or text file containing wallet addresses of participants.
              The raffle power will be calculated based on their staked Lords.
            </p>
            
            <FileUploader
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
              fileError={fileError}
            />
          </section>
          
          {participants.length > 0 && (
            <>
              <section className="participants-section">
                <h2 className="section-title">2. Participants &amp; Raffle Power</h2>
                <p className="section-desc">
                  Each participant's raffle power is based on their staked Lords.
                  Higher raffle power means better chances of winning.
                </p>
                
                <ParticipantsList participants={participants} />
              </section>
              
              <section className="draw-section">
                <h2 className="section-title">3. Draw Winners</h2>
                <p className="section-desc">
                  Select the number of winners to draw and click the button.
                  Winners will be selected randomly, with chances proportional to raffle power.
                </p>
                
                <RaffleControls
                  participants={participants}
                  onConductRaffle={conductRaffle}
                  isDrawing={isDrawing}
                  winners={winners}
                  raffleComplete={raffleComplete}
                />
              </section>
            </>
          )}
        </div>
      </EnhancedLayout>
    </>
  );
}
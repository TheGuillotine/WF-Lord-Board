import React from 'react';
import Head from 'next/head';
import { EnhancedLayout } from '../components/Layout/EnhancedLayout';
import { AddressInput } from '../components/Raffle/AddressInput';
import { ParticipantsList } from '../components/Raffle/ParticipantsList';
import { RaffleControls } from '../components/Raffle/RaffleControls';
import { useRaffle } from '../hooks/useRaffle';

export default function RafflePage() {
  const {
    participants,
    winners,
    processAddresses,
    conductRaffle,
    isProcessing,
    isDrawing,
    fileError,
    error,
    raffleComplete
  } = useRaffle();

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
          <p className="text-light-alt">Enter participants and draw winners based on raffle power</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="raffle-page">
          <section className="upload-section">
            <h2 className="section-title">1. Enter Participant Addresses</h2>
            <p className="section-desc">
              Paste wallet addresses of participants below.
              The raffle power will be calculated based on their staked Lords.
            </p>
            
            <AddressInput
              onSubmitAddresses={processAddresses}
              isProcessing={isProcessing}
              error={fileError}
            />
          </section>
          
          {participants.length > 0 && (
            <>
              <section className="participants-section">
                <h2 className="section-title">2. Participants &amp; Raffle Power</h2>
                <p className="section-desc">
                  Each participant&apos;s raffle power is based on their staked Lords.
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
        
        <style jsx>{`
          .raffle-page {
            width: 100%;
          }
          
          .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #4a5568;
          }
          
          .section-desc {
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
            color: #718096;
          }
          
          .upload-section, .participants-section, .draw-section {
            background-color: white;
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .error-message {
            background-color: #fff5f5;
            color: #e53e3e;
            border-radius: 0.25rem;
            padding: 0.75rem;
            margin-bottom: 1rem;
            border-left: 4px solid #e53e3e;
          }
        `}</style>
      </EnhancedLayout>
    </>
  );
}
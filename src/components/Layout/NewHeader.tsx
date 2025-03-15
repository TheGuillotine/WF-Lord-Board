import React from 'react';
import Image from 'next/image';
import { Navigation } from './Navigation';

export function NewHeader() {
  return (
    <header className="navbar">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center">
          <div className="logo-container">
            <div className="image-wrapper">
              <Image
                src="/images/logo.png"
                alt="Wild Forest Logo"
                width={80}
                height={44}
                style={{ objectFit: 'contain' }}
              />
            </div>
            
            <div className="logo-text-container">
              <h2 className="text-xl font-bold text-primary-light">
                Lord Dashboard
              </h2>
            </div>
          </div>
        </div>
        
        <Navigation />
      </div>
    </header>
  );
}
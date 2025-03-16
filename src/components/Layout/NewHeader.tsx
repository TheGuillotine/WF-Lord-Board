import React from 'react';
import Image from 'next/image';
import { Navigation } from './Navigation';

export function NewHeader() {
  return (
    <header className="navbar">
      <div className="container mx-auto">
        <div className="header-content">
          <div className="logo-section">
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
          
          <div className="nav-section">
            <Navigation />
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .navbar {
          padding: 1rem 0;
          background-color: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .logo-section {
          margin-bottom: 1rem;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .nav-section {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        
        @media (min-width: 768px) {
          .header-content {
            flex-direction: row;
            justify-content: space-between;
          }
          
          .logo-section {
            margin-bottom: 0;
          }
        }
      `}</style>
    </header>
  );
}
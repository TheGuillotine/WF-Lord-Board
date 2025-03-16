import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export function Navigation() {
  const router = useRouter();
  
  const isActive = (path: string) => {
    return router.pathname === path ? 'active' : '';
  };
  
  return (
    <nav className="main-nav">
      <ul className="nav-links">
        <li className={`nav-item ${isActive('/')}`}>
          <Link href="/">
            <div className="nav-button">
              <span className="nav-icon">📋</span>
              <span className="nav-text">Lords List</span>
            </div>
          </Link>
        </li>
        <li className={`nav-item ${isActive('/stakers')}`}>
          <Link href="/stakers">
            <div className="nav-button">
              <span className="nav-icon">👥</span>
              <span className="nav-text">Stakers Data</span>
            </div>
          </Link>
        </li>
        <li className={`nav-item ${isActive('/raffle')}`}>
          <Link href="/raffle">
            <div className="nav-button">
              <span className="nav-icon">🎲</span>
              <span className="nav-text">Organize a Raffle</span>
            </div>
          </Link>
        </li>
      </ul>
      
      <style jsx>{`
        .main-nav {
          width: 100%;
          margin: 0;
        }
        
        .nav-links {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;
          justify-content: center;
          gap: 16px;
        }
        
        .nav-item {
          position: relative;
        }
        
        .nav-button {
          display: flex;
          align-items: center;
          padding: 10px 20px;
          border-radius: 30px;
          background-color: #edf2f7;
          color: #4a5568;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          gap: 10px;
        }
        
        .nav-item:hover .nav-button {
          background-color: #e2e8f0;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .nav-item.active .nav-button {
          background-color: #4a5568;
          color: white;
          box-shadow: 0 4px 8px rgba(74, 85, 104, 0.3);
        }
        
        .nav-icon {
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .nav-text {
          font-size: 0.95rem;
          letter-spacing: 0.02em;
        }
        
        @media (max-width: 768px) {
          .nav-links {
            flex-direction: column;
            align-items: center;
            width: 100%;
            gap: 12px;
          }
          
          .nav-item {
            width: 100%;
            max-width: 280px;
          }
          
          .nav-button {
            width: 100%;
            justify-content: center;
            padding: 12px 20px;
          }
          
          .nav-text {
            font-size: 1rem;
          }
        }
      `}</style>
    </nav>
  );
}
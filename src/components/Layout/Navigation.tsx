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
          margin: 1rem 0;
        }
        
        .nav-links {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;
          justify-content: center;
          gap: 12px;
        }
        
        .nav-item {
          position: relative;
        }
        
        .nav-button {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          border-radius: 10px;
          background-color: #f0f4f8;
          color: #4a5568;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          gap: 8px;
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
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .nav-text {
          font-size: 14px;
        }
        
        .nav-item.active::after {
          content: "";
          position: absolute;
          bottom: -10px;
          left: calc(50% - 6px);
          width: 12px;
          height: 12px;
          background-color: #4a5568;
          transform: rotate(45deg);
          border-radius: 2px;
        }
        
        @media (max-width: 768px) {
          .nav-links {
            flex-direction: column;
            align-items: center;
            width: 100%;
            gap: 16px;
          }
          
          .nav-item {
            width: 100%;
            max-width: 300px;
          }
          
          .nav-button {
            width: 100%;
            justify-content: center;
          }
          
          .nav-item.active::after {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
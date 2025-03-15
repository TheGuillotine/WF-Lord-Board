import React, { useState, useEffect } from 'react';
import { StakerData } from '../../hooks/useStakersData';

interface StakersListProps {
  stakers: StakerData[];
  loading: boolean;
}

export function StakersList({ stakers, loading }: StakersListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStakers, setFilteredStakers] = useState<StakerData[]>(stakers);
  
  const itemsPerPage = 25;

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredStakers(stakers);
    } else {
      const filtered = stakers.filter(staker => 
        staker.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStakers(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, stakers]);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStakers = filteredStakers.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredStakers.length / itemsPerPage);
  
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const renderHeader = () => (
    <div className="card-header">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-light-alt mb-2 md:mb-0">
          {filteredStakers.length === 0 
            ? "Showing 0 Stakers" 
            : `Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredStakers.length)} of ${filteredStakers.length} Stakers`}
        </div>
        
        <div className="header-controls w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by address..."
            className="form-control search-input w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
  
  if (loading && stakers.length === 0) {
    return (
      <div className="card">
        {renderHeader()}
        <div className="stakers-table-container">
          <table className="stakers-table">
            <thead>
              <tr>
                <th>Staker Address</th>
                <th>Rare Lords</th>
                <th>Epic Lords</th>
                <th>Legendary Lords</th>
                <th>Mystic Lords</th>
                <th>Total Lords</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="skeleton-row">
                  <td><div className="skeleton-line"></div></td>
                  <td><div className="skeleton-line"></div></td>
                  <td><div className="skeleton-line"></div></td>
                  <td><div className="skeleton-line"></div></td>
                  <td><div className="skeleton-line"></div></td>
                  <td><div className="skeleton-line"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  
  if (stakers.length === 0 || filteredStakers.length === 0) {
    return (
      <div className="card">
        {renderHeader()}
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Stakers found</h3>
          <p>Try adjusting your search term to see more results</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card">
      {renderHeader()}
      
      <div className="stakers-table-container">
        <table className="stakers-table">
          <thead>
            <tr>
              <th>Staker Address</th>
              <th>Rare Lords</th>
              <th>Epic Lords</th>
              <th>Legendary Lords</th>
              <th>Mystic Lords</th>
              <th>Total Lords</th>
            </tr>
          </thead>
          <tbody>
            {currentStakers.map((staker) => (
              <tr key={staker.address}>
                <td>
                  <a
                    href={`https://marketplace.roninchain.com/account/${staker.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contract-link"
                  >
                    {formatAddress(staker.address)}
                  </a>
                </td>
                <td className="rare">{staker.rareLords}</td>
                <td className="epic">{staker.epicLords}</td>
                <td className="legendary">{staker.legendaryLords}</td>
                <td className="mystic">{staker.mysticLords}</td>
                <td className="total">{staker.totalLords}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            1
          </button>
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &larr;
          </button>
          
          <div className="page-info">
            {currentPage}
          </div>
          
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            &rarr;
          </button>
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {totalPages}
          </button>
        </div>
      )}
    </div>
  );
}
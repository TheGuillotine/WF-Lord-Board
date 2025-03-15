import React, { useState, useEffect } from 'react';
import { Lord } from '../../types';
import { useExportLords } from '../../hooks/useExportLords';

interface LordsListProps {
  lords: Lord[];
  loading: boolean;
  isFetchingMore: boolean;
}

export function LordsList({ lords, loading, isFetchingMore }: LordsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLords, setFilteredLords] = useState<Lord[]>(lords);
  
  const itemsPerPage = 25;

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredLords(lords);
    } else {
      const filtered = lords.filter(lord => 
        lord.owner.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLords(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, lords]);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLords = filteredLords.slice(indexOfFirstItem, indexOfLastItem);

  const exportLords = useExportLords();
  
  const handleExport = () => {
    exportLords(searchTerm ? filteredLords : lords);
  };
  
  const totalPages = Math.ceil(filteredLords.length / itemsPerPage);
  
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatAttribute = (attr: string) => {
    return attr.charAt(0).toUpperCase() + attr.slice(1);
  };
  
  const getRarityClass = (lord: Lord): string => {
    if (!lord.isStaked) return '';
    
    const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
    switch (rarity) {
      case 'rare':
        return 'rare';
      case 'epic':
        return 'epic';
      case 'legendary':
        return 'legendary';
      case 'mystic':
        return 'mystic';
      default:
        return '';
    }
  };

  const renderHeader = () => (
    <div className="card-header">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-light-alt mb-2 md:mb-0">
          {filteredLords.length === 0 
            ? "Showing 0 Lords" 
            : `Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredLords.length)} of ${filteredLords.length} Lords`}
        </div>
        
        <div className="header-controls w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by address..."
            className="form-control search-input w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <button
            className="btn btn-secondary export-btn mt-2 md:mt-0 md:ml-2"
            onClick={(e) => {
              e.stopPropagation();
              handleExport();
            }}
            disabled={loading || lords.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
  
  if (loading && lords.length === 0) {
    return (
      <div className="card">
        {renderHeader()}
        <div className="lords-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="lord-card skeleton">
              <div className="lord-card-header"></div>
              <div className="lord-card-body">
                <div className="lord-attribute skeleton-line"></div>
                <div className="lord-attribute skeleton-line"></div>
                <div className="lord-attribute skeleton-line"></div>
                <div className="lord-status skeleton-badge"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (lords.length === 0 || filteredLords.length === 0) {
    return (
      <div className="card">
        {renderHeader()}
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Lords found</h3>
          <p>Try adjusting your filters {searchTerm && 'or search term'} to see more results</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card">
      {renderHeader()}
      
      <div className="lords-grid">
        {currentLords.map((lord) => (
          <div 
            key={lord.tokenId} 
            className={`lord-card ${lord.isStaked ? 'staked' : ''} ${getRarityClass(lord)}`}
          >
            <div className="lord-card-header">
              <span className="lord-id">
                <a 
                  href={`https://marketplace.roninchain.com/collections/wild-forest-lords/${lord.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contract-link"
                >
                  Lord #{lord.tokenId}
                </a>
              </span>
            </div>
            <div className="lord-card-body">
              <div className="lord-attribute">
                <span className="attribute-label">Species:</span>
                <span className="attribute-value">
                  {lord.attributes.specie.length > 0 
                    ? formatAttribute(lord.attributes.specie[0]) 
                    : 'Unknown'}
                </span>
              </div>
              <div className="lord-attribute">
                <span className="attribute-label">Rarity:</span>
                <span className="attribute-value">
                  {lord.attributes.rank.length > 0 
                    ? formatAttribute(lord.attributes.rank[0]) 
                    : 'Unknown'}
                </span>
              </div>
              <div className="lord-attribute">
                <span className="attribute-label">Owner:</span>
                <span className="attribute-value">
                  <a
                    href={`https://marketplace.roninchain.com/account/${lord.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contract-link"
                  >
                    {formatAddress(lord.owner)}
                  </a>
                </span>
              </div>
              <div className="lord-status">
                {lord.isStaked 
                  ? <span className="status-badge staked">{lord.stakingDuration} days</span> 
                  : <span className="status-badge not-staked">Not Staked</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {lords.length > 0 && isFetchingMore && (
        <div className="loading-more">
          <div className="loading-spinner"></div>
          <span>Loading more Lords...</span>
        </div>
      )}
      
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
import React, { useState, useEffect } from 'react';
import { Kingdom, LordRepresentation } from '../../hooks/useStakersMapData';

interface StakersMapProps {
  kingdoms: Kingdom[];
  loading: boolean;
}

export function StakersMap({ kingdoms, loading }: StakersMapProps) {
  const [sortedKingdoms, setSortedKingdoms] = useState<Kingdom[]>([]);
  const [filteredKingdoms, setFilteredKingdoms] = useState<Kingdom[]>([]);
  const [expandedKingdom, setExpandedKingdom] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minLords: 0,
    rarity: 'All Rarities',
    sortBy: 'rafflePower',
  });
  
  const PAGE_SIZE = 20;

  // Sort and filter kingdoms based on criteria
  useEffect(() => {
    if (kingdoms.length === 0) return;

    // First sort kingdoms
    let sorted = [...kingdoms];
    if (filters.sortBy === 'rafflePower') {
      sorted.sort((a, b) => b.rafflePower - a.rafflePower);
    } else if (filters.sortBy === 'totalLords') {
      sorted.sort((a, b) => b.totalLords - a.totalLords);
    }
    
    setSortedKingdoms(sorted);
    
    // Then apply filters
    let filtered = sorted.filter(kingdom => {
      // Filter by minimum lords
      if (kingdom.totalLords < filters.minLords) return false;
      
      // Filter by search term (address)
      if (searchTerm && !kingdom.address.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by rarity
      if (filters.rarity !== 'All Rarities') {
        const rarityMap = {
          'Rare': 'rareLords',
          'Epic': 'epicLords',
          'Legendary': 'legendaryLords',
          'Mystic': 'mysticLords'
        } as const;
        
        const rarityKey = rarityMap[filters.rarity as keyof typeof rarityMap];
        if (rarityKey && kingdom[rarityKey].length === 0) return false;
      }
      
      return true;
    });
    
    setFilteredKingdoms(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [kingdoms, filters, searchTerm]);

  // Get emojis for species
  const getSpecieEmoji = (specie: string): string => {
    switch (specie.toLowerCase()) {
      case 'wolf': return '🐺';
      case 'owl': return '🦉';
      case 'raven': return '🦅';
      case 'boar': return '🐗';
      case 'fox': return '🦊';
      default: return '🦓';
    }
  };

  // Get color class for rarity
  const getRarityColorClass = (rarity: string): string => {
    switch (rarity.toLowerCase()) {
      case 'rare': return 'rare-lord';
      case 'epic': return 'epic-lord';
      case 'legendary': return 'legendary-lord';
      case 'mystic': return 'mystic-lord';
      default: return '';
    }
  };
  
  // Get total lords by rarity
  const getTotalByRarity = (kingdom: Kingdom, rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'rare': return kingdom.rareLords.length;
      case 'epic': return kingdom.epicLords.length;
      case 'legendary': return kingdom.legendaryLords.length;
      case 'mystic': return kingdom.mysticLords.length;
      default: return 0;
    }
  };

  // Get current page of data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredKingdoms.slice(startIndex, startIndex + PAGE_SIZE);
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const toggleExpand = (kingdomId: string) => {
    setExpandedKingdom(prev => prev === kingdomId ? null : kingdomId);
  };

  // Render functions
  const renderPagination = () => {
    const totalPages = Math.ceil(filteredKingdoms.length / PAGE_SIZE);
    if (totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button 
          className="pagination-button" 
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        >
          «
        </button>
        <button 
          className="pagination-button" 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          ‹
        </button>
        
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          className="pagination-button" 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
        <button 
          className="pagination-button" 
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          »
        </button>
      </div>
    );
  };

  const renderFilterControls = () => {
    return (
      <div className="stakers-filters">
        <div className="filter-row">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search by address..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Min Lords:</label>
            <input
              type="range"
              min="0"
              max="20"
              value={filters.minLords}
              onChange={(e) => handleFilterChange({ minLords: parseInt(e.target.value) })}
            />
            <span>{filters.minLords}</span>
          </div>
          
          <div className="filter-group">
            <label>Rarity:</label>
            <select
              value={filters.rarity}
              onChange={(e) => handleFilterChange({ rarity: e.target.value })}
            >
              <option value="All Rarities">All Rarities</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
              <option value="Mystic">Mystic</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sort By:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
            >
              <option value="rafflePower">Raffle Power</option>
              <option value="totalLords">Total Lords</option>
            </select>
          </div>
        </div>
        
        <div className="results-info">
          Showing {filteredKingdoms.length} stakers out of {kingdoms.length} total
        </div>
      </div>
    );
  };

  const renderKingdomCard = (kingdom: Kingdom) => {
    const isExpanded = expandedKingdom === kingdom.id;
    
    // Prepare lord data for rendering
    const lordsData = {
      rare: kingdom.rareLords.map(lord => ({ ...lord, rarity: 'rare' })),
      epic: kingdom.epicLords.map(lord => ({ ...lord, rarity: 'epic' })),
      legendary: kingdom.legendaryLords.map(lord => ({ ...lord, rarity: 'legendary' })),
      mystic: kingdom.mysticLords.map(lord => ({ ...lord, rarity: 'mystic' })),
    };
    
    return (
      <div 
        key={kingdom.id} 
        className={`kingdom-card ${isExpanded ? 'expanded' : ''}`}
        style={{
          borderColor: kingdom.color
        }}
      >
        <div 
          className="kingdom-header" 
          onClick={() => toggleExpand(kingdom.id)}
          style={{
            backgroundColor: `${kingdom.color}20`
          }}
        >
          <div className="kingdom-main-info">
            <span className="kingdom-address">{kingdom.address.substring(0, 8)}...{kingdom.address.substring(kingdom.address.length - 6)}</span>
            <div className="kingdom-stats">
              <span className="total-lords">{kingdom.totalLords} Lords</span>
              <span className="raffle-power">Power: {kingdom.rafflePower.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="kingdom-rarity-breakdown">
            <div className="rarity-count rare">
              <span className="rarity-dot"></span>
              <span>{kingdom.rareLords.length}</span>
            </div>
            <div className="rarity-count epic">
              <span className="rarity-dot"></span>
              <span>{kingdom.epicLords.length}</span>
            </div>
            <div className="rarity-count legendary">
              <span className="rarity-dot"></span>
              <span>{kingdom.legendaryLords.length}</span>
            </div>
            <div className="rarity-count mystic">
              <span className="rarity-dot"></span>
              <span>{kingdom.mysticLords.length}</span>
            </div>
          </div>
          
          <div className="expand-icon">
            {isExpanded ? '▼' : '▲'}
          </div>
        </div>
        
        {isExpanded && (
          <div className="kingdom-details">
            <div className="lords-grid">
              {Object.entries(lordsData).map(([rarity, lords]) => 
                lords.length > 0 && (
                  <div key={rarity} className={`rarity-section ${rarity}`}>
                    <div className="rarity-title">{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</div>
                    <div className="lords-list">
                      {lords.map(lord => (
                        <div 
                          key={lord.id}
                          className={`lord-item ${getRarityColorClass(lord.rarity)}`}
                          title={`Lord #${lord.id} (${lord.rarity} ${lord.specie})`}
                        >
                          <span className="lord-emoji">{getSpecieEmoji(lord.specie)}</span>
                          <span className="lord-id">#{lord.id}</span>
                          {lord.stakingDuration && (
                            <span className="lord-duration">{lord.stakingDuration}d</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetrics = () => {
    if (filteredKingdoms.length === 0) return null;
    
    // Calculate metrics
    const totalStakers = filteredKingdoms.length;
    const totalLords = filteredKingdoms.reduce((sum, k) => sum + k.totalLords, 0);
    const totalRafflePower = filteredKingdoms.reduce((sum, k) => sum + k.rafflePower, 0);
    
    const rarityTotals = {
      rare: filteredKingdoms.reduce((sum, k) => sum + k.rareLords.length, 0),
      epic: filteredKingdoms.reduce((sum, k) => sum + k.epicLords.length, 0),
      legendary: filteredKingdoms.reduce((sum, k) => sum + k.legendaryLords.length, 0),
      mystic: filteredKingdoms.reduce((sum, k) => sum + k.mysticLords.length, 0),
    };
    
    return (
      <div className="metrics-panel">
        <div className="metrics-title">Staking Metrics</div>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value">{totalStakers}</div>
            <div className="metric-label">Stakers</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{totalLords}</div>
            <div className="metric-label">Lords Staked</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{totalRafflePower.toLocaleString()}</div>
            <div className="metric-label">Total Raffle Power</div>
          </div>
          <div className="metric-item rare">
            <div className="metric-value">{rarityTotals.rare}</div>
            <div className="metric-label">Rare</div>
          </div>
          <div className="metric-item epic">
            <div className="metric-value">{rarityTotals.epic}</div>
            <div className="metric-label">Epic</div>
          </div>
          <div className="metric-item legendary">
            <div className="metric-value">{rarityTotals.legendary}</div>
            <div className="metric-label">Legendary</div>
          </div>
          <div className="metric-item mystic">
            <div className="metric-value">{rarityTotals.mystic}</div>
            <div className="metric-label">Mystic</div>
          </div>
        </div>
      </div>
    );
  };

  const renderLegend = () => {
    return (
      <div className="stakers-legend">
        <div className="legend-section">
          <div className="legend-title">Rarity Colors</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot rare"></span> Rare
            </div>
            <div className="legend-item">
              <span className="legend-dot epic"></span> Epic
            </div>
            <div className="legend-item">
              <span className="legend-dot legendary"></span> Legendary
            </div>
            <div className="legend-item">
              <span className="legend-dot mystic"></span> Mystic
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <div className="legend-title">Species</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-emoji">🐺</span> Wolf
            </div>
            <div className="legend-item">
              <span className="legend-emoji">🦉</span> Owl
            </div>
            <div className="legend-item">
              <span className="legend-emoji">🦅</span> Raven
            </div>
            <div className="legend-item">
              <span className="legend-emoji">🐗</span> Boar
            </div>
            <div className="legend-item">
              <span className="legend-emoji">🦊</span> Fox
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading and empty states
  if (loading) {
    return (
      <div className="stakers-loading">
        <div className="loading-spinner"></div>
        <div>Loading stakers data...</div>
      </div>
    );
  }

  if (kingdoms.length === 0) {
    return (
      <div className="stakers-empty">
        <div className="empty-icon">🏰</div>
        <h3>No stakers found</h3>
        <p>There are no stakers with Lords currently staked.</p>
      </div>
    );
  }

  if (filteredKingdoms.length === 0) {
    return (
      <div className="stakers-container">
        {renderFilterControls()}
        <div className="stakers-empty">
          <div className="empty-icon">🔍</div>
          <h3>No results match your filters</h3>
          <p>Try adjusting your search criteria to see results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stakers-container">
      {renderFilterControls()}
      {renderMetrics()}
      <div className="stakers-content">
        <div className="stakers-grid">
          {getCurrentPageData().map(renderKingdomCard)}
        </div>
        {renderPagination()}
      </div>
      {renderLegend()}
    </div>
  );
}
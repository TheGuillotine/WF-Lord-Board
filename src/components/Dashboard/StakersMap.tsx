import React, { useState, useRef, useEffect } from 'react';
import { Kingdom, LordRepresentation } from '../../hooks/useStakersMapData';
import { getMapDimensions } from '../../utils/mapGeneration';

interface StakersMapProps {
  kingdoms: Kingdom[];
  loading: boolean;
}

export function StakersMap({ kingdoms, loading }: StakersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [visibleKingdoms, setVisibleKingdoms] = useState<Kingdom[]>([]);
  const [selectedKingdom, setSelectedKingdom] = useState<Kingdom | null>(null);
  const [filters, setFilters] = useState({
    minLords: 0,
    rarity: 'All Rarities',
    sortBy: 'rafflePower',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Get map dimensions
  const { width: mapWidth, height: mapHeight } = getMapDimensions();

  // Apply spacing algorithm to prevent overcrowding
  useEffect(() => {
    if (kingdoms.length === 0) return;

    // Apply filters to kingdoms
    let filteredKingdoms = kingdoms.filter(kingdom => {
      if (kingdom.totalLords < filters.minLords) return false;
      
      // Filter by search term (address)
      if (searchTerm && !kingdom.address.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by rarity if selected
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
    
    // Sort kingdoms 
    if (filters.sortBy === 'rafflePower') {
      filteredKingdoms.sort((a, b) => b.rafflePower - a.rafflePower);
    } else if (filters.sortBy === 'totalLords') {
      filteredKingdoms.sort((a, b) => b.totalLords - a.totalLords);
    }
    
    // Separate kingdoms based on size - for weighted positioning
    const largeKingdoms = filteredKingdoms.filter(k => k.totalLords >= 10);
    const mediumKingdoms = filteredKingdoms.filter(k => k.totalLords >= 5 && k.totalLords < 10);
    const smallKingdoms = filteredKingdoms.filter(k => k.totalLords < 5);
    
    // Place kingdoms in zones based on importance
    // This gives more space to important kingdoms and groups similar ones
    const zoneRadius = Math.min(mapWidth, mapHeight) * 0.35;
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    
    // Position large kingdoms in a circle closer to center
    largeKingdoms.forEach((kingdom, index) => {
      const angle = (index / largeKingdoms.length) * 2 * Math.PI;
      kingdom.position = {
        x: centerX + Math.cos(angle) * zoneRadius * 0.6,
        y: centerY + Math.sin(angle) * zoneRadius * 0.6
      };
    });
    
    // Position medium kingdoms in a middle circle
    mediumKingdoms.forEach((kingdom, index) => {
      const angle = (index / mediumKingdoms.length) * 2 * Math.PI;
      kingdom.position = {
        x: centerX + Math.cos(angle) * zoneRadius * 1.0,
        y: centerY + Math.sin(angle) * zoneRadius * 1.0
      };
    });
    
    // Position small kingdoms in an outer circle
    smallKingdoms.forEach((kingdom, index) => {
      const angle = (index / smallKingdoms.length) * 2 * Math.PI;
      kingdom.position = {
        x: centerX + Math.cos(angle) * zoneRadius * 1.4,
        y: centerY + Math.sin(angle) * zoneRadius * 1.4
      };
    });
    
    // Apply force-directed spacing to avoid overlap
    const iteration = 30; // Number of iterations for force directed algorithm
    const repulsionStrength = 800; // Repulsion between kingdoms
    
    // Create a working copy with positions
    let workingKingdoms = filteredKingdoms.map(kingdom => ({
      ...kingdom,
      vx: 0, // velocity x
      vy: 0, // velocity y
    }));

    // Run force-directed algorithm iterations to space them out
    for (let i = 0; i < iteration; i++) {
      // Calculate repulsive forces
      for (let j = 0; j < workingKingdoms.length; j++) {
        let fx = 0;
        let fy = 0;
        
        for (let k = 0; k < workingKingdoms.length; k++) {
          if (j === k) continue;
          
          const dx = workingKingdoms[j].position.x - workingKingdoms[k].position.x;
          const dy = workingKingdoms[j].position.y - workingKingdoms[k].position.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq === 0) continue;
          
          // Calculate repulsive force
          const dist = Math.sqrt(distSq);
          const repulsion = repulsionStrength / (dist * dist);
          
          fx += (dx / dist) * repulsion;
          fy += (dy / dist) * repulsion;
        }
        
        // Apply forces (with damping)
        workingKingdoms[j].vx = (workingKingdoms[j].vx + fx) * 0.5;
        workingKingdoms[j].vy = (workingKingdoms[j].vy + fy) * 0.5;
        
        // Update position
        workingKingdoms[j].position.x += workingKingdoms[j].vx;
        workingKingdoms[j].position.y += workingKingdoms[j].vy;
        
        // Keep within bounds
        const margin = 100;
        workingKingdoms[j].position.x = Math.max(margin, Math.min(mapWidth - margin, workingKingdoms[j].position.x));
        workingKingdoms[j].position.y = Math.max(margin, Math.min(mapHeight - margin, workingKingdoms[j].position.y));
      }
    }

    // Update the kingdoms with new positions
    setVisibleKingdoms(workingKingdoms.map(({ vx, vy, ...kingdom }) => kingdom));
  }, [kingdoms, filters, searchTerm, mapWidth, mapHeight]);

  // Functions for map interactivity
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapRef.current) {
      setDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      
      // Clear selected kingdom when starting to drag
      setSelectedKingdom(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && mapRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleMouseLeave = () => {
    setDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.3));
  };

  const handleResetView = () => {
    setScale(0.7);
    setPosition({ x: 0, y: 0 });
  };

  const handleKingdomClick = (kingdom: Kingdom) => {
    setSelectedKingdom(prev => prev?.id === kingdom.id ? null : kingdom);
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

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

  // Render kingdoms on the map
  const renderMapKingdoms = () => {
    if (visibleKingdoms.length === 0) return null;
    
    return visibleKingdoms.map((kingdom) => {
      // Scale kingdom size based on total lords, with a reasonable min/max
      const minSize = 80;
      const maxSize = 140;
      const scaleFactor = 8;
      
      const size = Math.max(
        minSize,
        Math.min(maxSize, minSize + Math.sqrt(kingdom.totalLords) * scaleFactor)
      );
      
      // Calculate breakdown of lord types for the mini pie chart
      const total = kingdom.totalLords;
      const rarePct = kingdom.rareLords.length / total;
      const epicPct = kingdom.epicLords.length / total;
      const legendaryPct = kingdom.legendaryLords.length / total;
      const mysticPct = kingdom.mysticLords.length / total;
      
      // Create simple CSS conic gradient for the pie chart
      let conicGradient = 'conic-gradient(';
      let currentAngle = 0;
      
      if (rarePct > 0) {
        conicGradient += `#5da9e9 0deg ${rarePct * 360}deg`;
        currentAngle += rarePct * 360;
      }
      
      if (epicPct > 0) {
        if (currentAngle > 0) conicGradient += ', ';
        conicGradient += `#a020f0 ${currentAngle}deg ${currentAngle + epicPct * 360}deg`;
        currentAngle += epicPct * 360;
      }
      
      if (legendaryPct > 0) {
        if (currentAngle > 0) conicGradient += ', ';
        conicGradient += `#ffd700 ${currentAngle}deg ${currentAngle + legendaryPct * 360}deg`;
        currentAngle += legendaryPct * 360;
      }
      
      if (mysticPct > 0) {
        if (currentAngle > 0) conicGradient += ', ';
        conicGradient += `#ff1493 ${currentAngle}deg ${currentAngle + mysticPct * 360}deg`;
      }
      
      conicGradient += ')';
      
      return (
        <div
          key={kingdom.id}
          className={`kingdom-node ${selectedKingdom?.id === kingdom.id ? 'selected' : ''}`}
          style={{
            left: kingdom.position.x,
            top: kingdom.position.y,
            width: size,
            height: size,
          }}
          onClick={() => handleKingdomClick(kingdom)}
        >
          <div className="kingdom-pie" style={{ background: conicGradient }}></div>
          <div className="kingdom-content">
            <div className="kingdom-address">{formatAddress(kingdom.address)}</div>
            <div className="lords-count">{kingdom.totalLords}</div>
            <div className="rarity-counts">
              <span className="rare-count">{kingdom.rareLords.length}</span>
              <span className="epic-count">{kingdom.epicLords.length}</span>
              <span className="legendary-count">{kingdom.legendaryLords.length}</span>
              <span className="mystic-count">{kingdom.mysticLords.length}</span>
            </div>
          </div>
        </div>
      );
    });
  };

  // Render selected kingdom detail popup
  const renderSelectedKingdom = () => {
    if (!selectedKingdom) return null;
    
    // Prepare lord data for rendering
    const lordsData = {
      rare: selectedKingdom.rareLords.map(lord => ({ ...lord, rarity: 'rare' })),
      epic: selectedKingdom.epicLords.map(lord => ({ ...lord, rarity: 'epic' })),
      legendary: selectedKingdom.legendaryLords.map(lord => ({ ...lord, rarity: 'legendary' })),
      mystic: selectedKingdom.mysticLords.map(lord => ({ ...lord, rarity: 'mystic' })),
    };
    
    return (
      <div className="kingdom-detail-popup">
        <div className="popup-header">
          <div className="popup-title">
            <span className="popup-address">{selectedKingdom.address}</span>
            <span className="popup-stats">
              Total: {selectedKingdom.totalLords} Lords | 
              Raffle Power: {selectedKingdom.rafflePower.toLocaleString()}
            </span>
          </div>
          <button 
            className="popup-close" 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedKingdom(null);
            }}
          >
            ×
          </button>
        </div>
        
        <div className="popup-content">
          <div className="popup-rarity-summary">
            <div className="summary-item rare">
              <div className="summary-count">{selectedKingdom.rareLords.length}</div>
              <div className="summary-label">Rare</div>
            </div>
            <div className="summary-item epic">
              <div className="summary-count">{selectedKingdom.epicLords.length}</div>
              <div className="summary-label">Epic</div>
            </div>
            <div className="summary-item legendary">
              <div className="summary-count">{selectedKingdom.legendaryLords.length}</div>
              <div className="summary-label">Legendary</div>
            </div>
            <div className="summary-item mystic">
              <div className="summary-count">{selectedKingdom.mysticLords.length}</div>
              <div className="summary-label">Mystic</div>
            </div>
          </div>
          
          <div className="lords-container">
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
      </div>
    );
  };

  // Render filter controls
  const renderFilterControls = () => {
    return (
      <div className="map-filters">
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
          Showing {visibleKingdoms.length} stakers out of {kingdoms.length} total
        </div>
      </div>
    );
  };

  // Render legend
  const renderLegend = () => {
    return (
      <div className="map-legend">
        <div className="legend-section">
          <div className="legend-title">Rarity Colors</div>
          <div className="legend-item">
            <div className="legend-color rare"></div>
            <span>Rare</span>
          </div>
          <div className="legend-item">
            <div className="legend-color epic"></div>
            <span>Epic</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legendary"></div>
            <span>Legendary</span>
          </div>
          <div className="legend-item">
            <div className="legend-color mystic"></div>
            <span>Mystic</span>
          </div>
        </div>
        <div className="legend-label">Click any kingdom for details</div>
      </div>
    );
  };

  // Loading and empty states
  if (loading) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <div>Loading kingdoms data...</div>
      </div>
    );
  }

  if (kingdoms.length === 0) {
    return (
      <div className="map-empty">
        <div className="empty-icon">🏰</div>
        <h3>No kingdoms found</h3>
        <p>There are no stakers with Lords currently staked.</p>
      </div>
    );
  }

  if (visibleKingdoms.length === 0) {
    return (
      <div className="map-container">
        {renderFilterControls()}
        <div className="map-empty">
          <div className="empty-icon">🔍</div>
          <h3>No results match your filters</h3>
          <p>Try adjusting your search criteria to see results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      {renderFilterControls()}
      
      <div
        ref={mapRef}
        className="map-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="map-canvas"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: mapWidth,
            height: mapHeight,
          }}
        >
          {renderMapKingdoms()}
        </div>
        
        {selectedKingdom && renderSelectedKingdom()}
        {renderLegend()}
      </div>
      
      <div className="map-controls">
        <button
          className="map-control-button"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          +
        </button>
        <button
          className="map-control-button"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          −
        </button>
        <button
          className="map-control-button"
          onClick={handleResetView}
          title="Reset View"
        >
          ↺
        </button>
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { Kingdom, LordRepresentation } from '../../hooks/useStakersMapData';
import { getMapDimensions } from '../../utils/mapGeneration';

interface StakersMapProps {
  kingdoms: Kingdom[];
  loading: boolean;
}

export function StakersMap({ kingdoms, loading }: StakersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4); // Start even more zoomed out
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
  const [showSmall, setShowSmall] = useState(false);

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
      
      // Only show kingdoms with 3+ lords unless explicitly showing small kingdoms or zoomed in
      if (!showSmall && scale < 0.7 && kingdom.totalLords < 3) {
        return false;
      }
      
      return true;
    });
    
    // Sort kingdoms 
    if (filters.sortBy === 'rafflePower') {
      filteredKingdoms.sort((a, b) => b.rafflePower - a.rafflePower);
    } else if (filters.sortBy === 'totalLords') {
      filteredKingdoms.sort((a, b) => b.totalLords - a.totalLords);
    }
    
    // Get count brackets for sizing
    const calculateSizeGroup = (total: number) => {
      if (total >= 15) return 'large';
      if (total >= 7) return 'medium';
      return 'small';
    };
    
    // Group kingdoms by size for different placement strategies
    const largeKingdoms = filteredKingdoms.filter(k => calculateSizeGroup(k.totalLords) === 'large');
    const mediumKingdoms = filteredKingdoms.filter(k => calculateSizeGroup(k.totalLords) === 'medium');
    const smallKingdoms = filteredKingdoms.filter(k => calculateSizeGroup(k.totalLords) === 'small');
    
    // Use a grid layout approach with more spacing
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    
    // Distribute large kingdoms in a central ring with more spacing
    const largeRadius = Math.min(mapWidth, mapHeight) * 0.25;
    largeKingdoms.forEach((kingdom, index) => {
      const angle = (index / largeKingdoms.length) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * largeRadius;
      const y = centerY + Math.sin(angle) * largeRadius;
      kingdom.position = { x, y };
    });
    
    // Position medium kingdoms in a middle ring with more spacing
    const mediumRadius = Math.min(mapWidth, mapHeight) * 0.45;
    mediumKingdoms.forEach((kingdom, index) => {
      const angle = (index / mediumKingdoms.length) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * mediumRadius;
      const y = centerY + Math.sin(angle) * mediumRadius;
      kingdom.position = { x, y };
    });
    
    // Position small kingdoms in multiple outer rings to avoid overcrowding
    const smallCount = smallKingdoms.length;
    const ringsNeeded = Math.max(1, Math.ceil(smallCount / 40)); // Max 40 per ring
    
    smallKingdoms.forEach((kingdom, index) => {
      // Determine which ring this kingdom belongs to
      const ringIndex = Math.floor(index / (smallCount / ringsNeeded));
      const ringPosition = index % Math.ceil(smallCount / ringsNeeded);
      
      // Calculate position in the appropriate ring
      const itemsInRing = Math.ceil(smallCount / ringsNeeded);
      const angle = (ringPosition / itemsInRing) * 2 * Math.PI;
      
      // Each outer ring gets progressively larger with more spacing
      const radius = Math.min(mapWidth, mapHeight) * (0.6 + ringIndex * 0.15);
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      kingdom.position = { x, y };
    });
    
    // Apply stronger force-directed algorithm
    const iteration = 60; // More iterations for better separation
    const repulsionStrength = 5000; // Much stronger repulsion
    
    // Create a working copy with positions and velocities
    let workingKingdoms = filteredKingdoms.map(kingdom => ({
      ...kingdom,
      vx: 0, // velocity x
      vy: 0, // velocity y
      size: sizeForLords(kingdom.totalLords), // Calculate bubble size based on lords count
    }));

    // Run force-directed algorithm iterations
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
          
          const dist = Math.sqrt(distSq);
          
          // Calculate minimum distance needed (based on both bubble sizes with extra buffer)
          const minDist = (workingKingdoms[j].size + workingKingdoms[k].size) / 1.5;
          
          // Apply stronger repulsion if bubbles are too close
          if (dist < minDist) {
            const repulsion = repulsionStrength * (minDist - dist) / dist;
            fx += (dx / dist) * repulsion;
            fy += (dy / dist) * repulsion;
          }
        }
        
        // Apply centerward attraction force to prevent bubbles from going too far
        const cx = centerX - workingKingdoms[j].position.x;
        const cy = centerY - workingKingdoms[j].position.y;
        const distToCenter = Math.sqrt(cx * cx + cy * cy);
        const maxDistFromCenter = Math.min(mapWidth, mapHeight) * 0.5;
        
        if (distToCenter > maxDistFromCenter) {
          const attractionForce = 0.1 * (distToCenter - maxDistFromCenter);
          fx += (cx / distToCenter) * attractionForce;
          fy += (cy / distToCenter) * attractionForce;
        }
        
        // Apply force with damping
        workingKingdoms[j].vx = (workingKingdoms[j].vx + fx) * 0.5;
        workingKingdoms[j].vy = (workingKingdoms[j].vy + fy) * 0.5;
        
        // Update position
        workingKingdoms[j].position.x += workingKingdoms[j].vx;
        workingKingdoms[j].position.y += workingKingdoms[j].vy;
        
        // Keep within bounds with larger margin
        const margin = workingKingdoms[j].size + 30;
        workingKingdoms[j].position.x = Math.max(margin, Math.min(mapWidth - margin, workingKingdoms[j].position.x));
        workingKingdoms[j].position.y = Math.max(margin, Math.min(mapHeight - margin, workingKingdoms[j].position.y));
      }
    }

    // Update the kingdoms with new positions and sizes
    setVisibleKingdoms(workingKingdoms.map(({ vx, vy, ...kingdom }) => kingdom));
  }, [kingdoms, filters, searchTerm, mapWidth, mapHeight, scale, showSmall]);

  // Calculate bubble size based on lords count
  const sizeForLords = (count: number): number => {
    // Logarithmic scale for sizing to avoid huge bubbles
    const baseSize = 40;
    const minSize = 34;
    const maxSize = 100;
    
    let size;
    if (count <= 1) {
      size = minSize;
    } else {
      // Logarithmic scaling for more reasonable sizing
      size = baseSize + Math.log2(count) * 10;
    }
    
    return Math.min(maxSize, Math.max(minSize, size));
  };

  // Handle zoom level changes to show/hide smaller bubbles
  useEffect(() => {
    // Automatically show small kingdoms when zoomed in
    if (scale >= 0.7) {
      setShowSmall(true);
    } else if (scale <= 0.4) {
      // Hide small kingdoms when zoomed out too far
      setShowSmall(false);
    }
  }, [scale]);

  // Functions for map interactivity
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapRef.current) {
      setDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
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
    setScale(0.4);
    setPosition({ x: 0, y: 0 });
    setSelectedKingdom(null);
  };

  const handleKingdomClick = (kingdom: Kingdom, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from closing popup when clicking on a kingdom
    setSelectedKingdom(prev => prev?.id === kingdom.id ? null : kingdom);
  };

  const handleMapClick = () => {
    // Close popup when clicking on empty map area
    setSelectedKingdom(null);
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const toggleShowSmall = () => {
    setShowSmall(prev => !prev);
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
  
  // Get rarity color
  const getRarityColor = (rarity: string): string => {
    switch (rarity.toLowerCase()) {
      case 'rare': return '#5da9e9';
      case 'epic': return '#a020f0';
      case 'legendary': return '#ffd700';
      case 'mystic': return '#ff1493';
      default: return '#ffffff';
    }
  };

  // Render kingdoms on the map
  const renderMapKingdoms = () => {
    if (visibleKingdoms.length === 0) return null;
    
    return visibleKingdoms.map((kingdom) => {
      // Determine dominant rarity color for the border
      let dominantRarity = 'rare';
      let maxCount = kingdom.rareLords.length;
      
      if (kingdom.epicLords.length > maxCount) {
        dominantRarity = 'epic';
        maxCount = kingdom.epicLords.length;
      }
      if (kingdom.legendaryLords.length > maxCount) {
        dominantRarity = 'legendary';
        maxCount = kingdom.legendaryLords.length;
      }
      if (kingdom.mysticLords.length > maxCount) {
        dominantRarity = 'mystic';
        maxCount = kingdom.mysticLords.length;
      }
      
      const borderColor = getRarityColor(dominantRarity);
      
      // Calculate font size based on bubble size
      const fontSize = Math.max(12, Math.min(24, kingdom.size / 4));
      
      // Only show address for bubbles above a certain size
      const showAddress = kingdom.size >= 60;
      
      return (
        <div
          key={kingdom.id}
          className={`kingdom-node ${selectedKingdom?.id === kingdom.id ? 'selected' : ''}`}
          style={{
            left: kingdom.position.x,
            top: kingdom.position.y,
            width: kingdom.size,
            height: kingdom.size,
            borderColor: borderColor,
          }}
          onClick={(e) => handleKingdomClick(kingdom, e)}
        >
          <div className="kingdom-content">
            {showAddress && (
              <div className="kingdom-address">
                {kingdom.address.substring(0, 6)}...
              </div>
            )}
            <div 
              className="lords-count"
              style={{ fontSize: `${fontSize}px` }}
            >
              {kingdom.totalLords}
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
            onClick={() => setSelectedKingdom(null)}
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
          
          <button 
            className="toggle-small-button"
            onClick={toggleShowSmall}
            title={showSmall ? "Hide small kingdoms" : "Show all kingdoms"}
          >
            {showSmall ? "Hide Small" : "Show All"}
          </button>
        </div>
        
        <div className="results-info">
          Showing {visibleKingdoms.length} stakers out of {kingdoms.length} total
          {!showSmall && scale < 0.7 && " (zoom in or click 'Show All' to see smaller kingdoms)"}
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
        <div className="legend-label">Click any bubble for details</div>
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
        onClick={handleMapClick}
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
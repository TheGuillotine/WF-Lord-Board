import React, { useState, useRef, useEffect } from 'react';
import { Kingdom, LordRepresentation } from '../../hooks/useStakersMapData';
import { getMapDimensions } from '../../utils/mapGeneration';

interface StakersMapProps {
  kingdoms: Kingdom[];
  loading: boolean;
}

export function StakersMap({ kingdoms, loading }: StakersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5); // Start more zoomed out
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
  const mapWidth = 2400; // Larger canvas to allow for better spacing
  const mapHeight = 1800;

  // Prevent scrolling on wheel events
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (mapRef.current && mapRef.current.contains(e.target as Node)) {
        e.preventDefault();
        
        // Zoom with wheel
        if (e.deltaY < 0) {
          setScale(prev => Math.min(prev + 0.1, 3));
        } else {
          setScale(prev => Math.max(prev - 0.1, 0.2));
        }
      }
    };
    
    const mapElement = mapRef.current;
    if (mapElement) {
      mapElement.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (mapElement) {
        mapElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

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
    
    // IMPROVED LAYOUT STRATEGY - Hexagonal grid pattern
    // This avoids pushing bubbles to corners and provides more even spacing
    
    // 1. Calculate bubble sizes first
    const kingdomsWithSizes = filteredKingdoms.map(kingdom => ({
      ...kingdom,
      size: sizeForLords(kingdom.totalLords),
    }));
    
    // 2. Calculate the average size to determine spacing
    const totalSize = kingdomsWithSizes.reduce((sum, k) => sum + k.size, 0);
    const avgSize = totalSize / kingdomsWithSizes.length;
    
    // 3. Set up hexagonal grid parameters
    const hexSpacing = avgSize * 1.5; // Spacing between hexagon centers
    const hexWidth = hexSpacing;
    const hexHeight = hexSpacing * 0.866; // height = width * sin(60°)
    
    // 4. Calculate how many columns and rows we need
    const numKingdoms = kingdomsWithSizes.length;
    const gridColumns = Math.ceil(Math.sqrt(numKingdoms * 1.2)); // More columns than rows for widescreen
    
    // 5. Place kingdoms in a hexagonal pattern
    kingdomsWithSizes.forEach((kingdom, index) => {
      // Calculate grid position
      const col = index % gridColumns;
      const row = Math.floor(index / gridColumns);
      
      // Adjust every other row for hexagonal packing
      const offsetX = (row % 2) * (hexWidth / 2);
      
      // Calculate actual position with padding to keep away from edges
      const padding = 150;
      const x = padding + offsetX + col * hexWidth;
      const y = padding + row * hexHeight;
      
      kingdom.position = { x, y };
    });
    
    // 6. Apply force-directed algorithm to fine tune and avoid overlaps
    // Significantly increased strength and iterations
    const iteration = 100; // More iterations
    const repulsionStrength = 8000; // Much stronger repulsion
    
    // Create a working copy with positions and velocities
    let workingKingdoms = kingdomsWithSizes.map(kingdom => ({
      ...kingdom,
      vx: 0, // velocity x
      vy: 0, // velocity y
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
          
          // Calculate minimum distance needed (with increased buffer)
          const minDist = (workingKingdoms[j].size + workingKingdoms[k].size) / 1.5;
          
          // Apply MUCH stronger repulsion if bubbles are too close
          if (dist < minDist * 1.5) { // Increased detection range
            const repulsion = repulsionStrength * (minDist - dist) / dist;
            fx += (dx / dist) * repulsion;
            fy += (dy / dist) * repulsion;
          }
        }
        
        // Add a small force toward the center to prevent spreading too far
        const centerX = mapWidth / 2;
        const centerY = mapHeight / 2;
        const dx = centerX - workingKingdoms[j].position.x;
        const dy = centerY - workingKingdoms[j].position.y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        
        // Only pull toward center if too far away
        if (distToCenter > mapWidth * 0.4) {
          fx += dx * 0.01;
          fy += dy * 0.01;
        }
        
        // Apply forces with stronger damping
        workingKingdoms[j].vx = (workingKingdoms[j].vx + fx) * 0.4;
        workingKingdoms[j].vy = (workingKingdoms[j].vy + fy) * 0.4;
        
        // Update position
        workingKingdoms[j].position.x += workingKingdoms[j].vx;
        workingKingdoms[j].position.y += workingKingdoms[j].vy;
        
        // Keep within bounds with a much larger margin
        const margin = workingKingdoms[j].size + 100;
        workingKingdoms[j].position.x = Math.max(margin, Math.min(mapWidth - margin, workingKingdoms[j].position.x));
        workingKingdoms[j].position.y = Math.max(margin, Math.min(mapHeight - margin, workingKingdoms[j].position.y));
      }
    }

    // Update the kingdoms with new positions and sizes
    setVisibleKingdoms(workingKingdoms.map(({ vx, vy, ...kingdom }) => kingdom));
  }, [kingdoms, filters, searchTerm]);

  // Calculate bubble size based on lords count
  const sizeForLords = (count: number): number => {
    // Logarithmic scale for sizing to avoid huge bubbles
    const baseSize = 70; // Larger base size
    const minSize = 60; // Larger minimum size for better visibility
    const maxSize = 140;
    
    let size;
    if (count <= 1) {
      size = minSize;
    } else {
      // Logarithmic scaling
      size = baseSize + Math.log2(count) * 18;
    }
    
    return Math.min(maxSize, Math.max(minSize, size));
  };

  // Functions for map interactivity
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapRef.current) {
      e.preventDefault(); // Prevent text selection and other default behaviors
      setDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && mapRef.current) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleMouseLeave = () => {
    setDragging(false);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault();
    setScale(prev => Math.max(prev - 0.2, 0.2));
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.preventDefault();
    setScale(0.5);
    setPosition({ x: 0, y: 0 });
    setSelectedKingdom(null);
  };

  const handleKingdomClick = (kingdom: Kingdom, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from closing popup when clicking on a kingdom
    e.preventDefault();
    setSelectedKingdom(prev => prev?.id === kingdom.id ? null : kingdom);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    // Close popup when clicking on empty map area
    if (!dragging) {
      setSelectedKingdom(null);
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
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
      const fontSize = Math.max(16, Math.min(32, kingdom.size / 3.5));
      
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
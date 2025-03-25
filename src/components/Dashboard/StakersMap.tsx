import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Kingdom, LordRepresentation } from '../../hooks/useStakersMapData';
import { getMapDimensions } from '../../utils/mapGeneration';

interface StakersMapProps {
  kingdoms: Kingdom[];
  loading: boolean;
}

// Constants for improved layout
const GRID_SPACING = 200; // Minimum distance between bubbles
const MAP_PADDING = 500; // Extra padding around the map edges
const BUBBLE_MIN_SIZE = 40;
const BUBBLE_MAX_SIZE = 100;

export function StakersMap({ kingdoms, loading }: StakersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4); // Start more zoomed out
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
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
  const [mapDimensions, setMapDimensions] = useState({ width: 3000, height: 3000 });

  // Get map dimensions
  useEffect(() => {
    const baseDimensions = getMapDimensions();
    // Ensure map is large enough based on kingdom count
    const scaledWidth = Math.max(baseDimensions.width, Math.sqrt(kingdoms.length) * GRID_SPACING + MAP_PADDING);
    const scaledHeight = Math.max(baseDimensions.height, Math.sqrt(kingdoms.length) * GRID_SPACING + MAP_PADDING);
    
    setMapDimensions({
      width: scaledWidth,
      height: scaledHeight
    });
  }, [kingdoms.length]);

  // Apply grid layout to prevent overcrowding
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
    
    // Sort kingdoms by importance
    if (filters.sortBy === 'rafflePower') {
      filteredKingdoms.sort((a, b) => b.rafflePower - a.rafflePower);
    } else if (filters.sortBy === 'totalLords') {
      filteredKingdoms.sort((a, b) => b.totalLords - a.totalLords);
    }
    
    // Calculate sizes for all kingdoms
    const sizedKingdoms = filteredKingdoms.map(kingdom => ({
      ...kingdom,
      size: sizeForLords(kingdom.totalLords)
    }));
    
    // GRID LAYOUT: Position kingdoms in a grid with large ones centered
    const centerX = mapDimensions.width / 2;
    const centerY = mapDimensions.height / 2;
    
    // Sort by importance for positioning (most important in center)
    const orderedKingdoms = [...sizedKingdoms].sort((a, b) => {
      // Consider both raffle power and total lords
      const aImportance = a.rafflePower * 0.7 + a.totalLords * 0.3;
      const bImportance = b.rafflePower * 0.7 + b.totalLords * 0.3;
      return bImportance - aImportance;
    });
    
    // Calculate grid dimensions
    const gridSize = Math.ceil(Math.sqrt(orderedKingdoms.length));
    const cellSize = GRID_SPACING; // Space between grid cells
    
    // First position in a perfect grid
    orderedKingdoms.forEach((kingdom, index) => {
      // Spiral layout - more important in center, spiraling outward
      // Based on Ulam spiral pattern for natural distribution
      const getPositionFromIndex = (idx: number) => {
        // Implementation of spiral pattern
        let layer = Math.floor((Math.sqrt(idx + 1) - 1) / 2) + 1;
        if (idx === 0) layer = 0;
        
        let leg = 0; // 0: bottom, 1: left, 2: top, 3: right
        let offset = idx - (2 * layer - 1) ** 2;
        
        if (offset < 2 * layer) {
          leg = 0;
        } else if (offset < 4 * layer) {
          leg = 1;
          offset -= 2 * layer;
        } else if (offset < 6 * layer) {
          leg = 2;
          offset -= 4 * layer;
        } else {
          leg = 3;
          offset -= 6 * layer;
        }
        
        let x = 0, y = 0;
        
        switch (leg) {
          case 0: // bottom
            x = layer;
            y = -layer + offset;
            break;
          case 1: // left
            x = layer - offset;
            y = layer;
            break;
          case 2: // top
            x = -layer;
            y = layer - offset;
            break;
          case 3: // right
            x = -layer + offset;
            y = -layer;
            break;
        }
        
        return { x, y };
      };
      
      const position = getPositionFromIndex(index);
      kingdom.position = {
        x: centerX + position.x * cellSize,
        y: centerY + position.y * cellSize
      };
    });
    
    // Second pass: Apply force-directed algorithm to fine-tune and avoid overlaps
    // This will make minor adjustments to the grid layout
    const iteration = 50; // More iterations for better spacing
    const repulsionStrength = 15000; // Much stronger repulsion
    
    // Create a working copy with positions and velocities
    let workingKingdoms = orderedKingdoms.map(kingdom => ({
      ...kingdom,
      vx: 0, // velocity x
      vy: 0, // velocity y
    }));

    // Run force-directed algorithm iterations to refine spacing
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
          
          // Calculate minimum distance needed based on both sizes with extra spacing
          const minDist = (workingKingdoms[j].size + workingKingdoms[k].size) / 1.5 + GRID_SPACING / 2;
          
          // Apply much stronger repulsion if bubbles are too close
          if (dist < minDist) {
            const repulsion = repulsionStrength * (minDist - dist) / dist;
            fx += (dx / dist) * repulsion;
            fy += (dy / dist) * repulsion;
          }
        }
        
        // Apply force with significant damping
        workingKingdoms[j].vx = (workingKingdoms[j].vx + fx) * 0.3;
        workingKingdoms[j].vy = (workingKingdoms[j].vy + fy) * 0.3;
        
        // Update position with velocity
        workingKingdoms[j].position.x += workingKingdoms[j].vx;
        workingKingdoms[j].position.y += workingKingdoms[j].vy;
        
        // Ensure kingdoms stay within boundaries
        const margin = workingKingdoms[j].size / 2 + 100;
        workingKingdoms[j].position.x = Math.max(margin, Math.min(mapDimensions.width - margin, workingKingdoms[j].position.x));
        workingKingdoms[j].position.y = Math.max(margin, Math.min(mapDimensions.height - margin, workingKingdoms[j].position.y));
      }
    }

    // Update the kingdoms with new positions
    setVisibleKingdoms(workingKingdoms.map(({ vx, vy, ...kingdom }) => kingdom));
    
    // Initial centering
    setTimeout(() => {
      centerMap();
    }, 100);
  }, [kingdoms, filters, searchTerm, mapDimensions]);

  // Calculate bubble size based on lords count (logarithmic)
  const sizeForLords = (count: number): number => {
    if (count <= 1) return BUBBLE_MIN_SIZE;
    
    // More moderate sizing growth using log base 3
    const logBase = 2.5;
    const size = BUBBLE_MIN_SIZE + 15 * Math.log(count) / Math.log(logBase);
    
    return Math.min(BUBBLE_MAX_SIZE, Math.max(BUBBLE_MIN_SIZE, size));
  };

  // Center map to see all bubbles
  const centerMap = useCallback(() => {
    if (!mapRef.current || !canvasRef.current || visibleKingdoms.length === 0) return;
    
    const mapWidth = mapRef.current.clientWidth;
    const mapHeight = mapRef.current.clientHeight;
    
    // Calculate bounding box of all bubbles
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    
    visibleKingdoms.forEach(kingdom => {
      minX = Math.min(minX, kingdom.position.x - kingdom.size/2);
      minY = Math.min(minY, kingdom.position.y - kingdom.size/2);
      maxX = Math.max(maxX, kingdom.position.x + kingdom.size/2);
      maxY = Math.max(maxY, kingdom.position.y + kingdom.size/2);
    });
    
    // Calculate the center of the bounding box
    const boundingWidth = maxX - minX;
    const boundingHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate the scale to fit the bounding box
    const scaleX = mapWidth / boundingWidth;
    const scaleY = mapHeight / boundingHeight;
    let newScale = Math.min(scaleX, scaleY) * 0.8; // 80% to add some margin
    
    // Constrain scale
    newScale = Math.min(Math.max(newScale, 0.2), 1.0);
    
    // Calculate position to center the bounding box
    const newX = mapWidth / 2 - centerX * newScale;
    const newY = mapHeight / 2 - centerY * newScale;
    
    setScale(newScale);
    setPosition({ x: newX, y: newY });
    setInitialPosition({ x: newX, y: newY });
  }, [visibleKingdoms]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!mapRef.current) return;
    
    const mapRect = mapRef.current.getBoundingClientRect();
    const mouseX = e.clientX - mapRect.left;
    const mouseY = e.clientY - mapRect.top;
    
    // Determine point under mouse in canvas space
    const pointXBeforeZoom = (mouseX - position.x) / scale;
    const pointYBeforeZoom = (mouseY - position.y) / scale;
    
    // Calculate new scale
    const zoomIntensity = 0.1;
    const zoomDirection = e.deltaY < 0 ? 1 : -1;
    let newScale = scale * (1 + zoomDirection * zoomIntensity);
    
    // Constrain scale
    newScale = Math.min(Math.max(newScale, 0.2), 2.0);
    
    // Calculate new position to keep point under mouse
    const pointXAfterZoom = (mouseX - position.x) / newScale;
    const pointYAfterZoom = (mouseY - position.y) / newScale;
    
    const newX = position.x + (pointXAfterZoom - pointXBeforeZoom) * newScale;
    const newY = position.y + (pointYAfterZoom - pointYBeforeZoom) * newScale;
    
    setPosition({ x: newX, y: newY });
    setScale(newScale);
  }, [position, scale]);

  // Enhanced mouse interactions for smoother navigation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapRef.current) {
      if (e.button === 0) { // Left click only
        setDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
        
        // Apply the grabbing cursor
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grabbing';
        }
        
        // Don't clear selection here for better interaction with detail popup
      }
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
    
    // Restore the grab cursor
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    setDragging(false);
    
    // Restore the default cursor
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.2));
  };

  const handleResetView = () => {
    centerMap();
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
      const fontSize = Math.max(16, Math.min(28, kingdom.size / 4));
      
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
        onWheel={handleWheel}
      >
        <div
          ref={canvasRef}
          className="map-canvas grab-cursor"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: mapDimensions.width,
            height: mapDimensions.height,
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
          className="map-control-button fit-all"
          onClick={handleResetView}
          title="Fit All"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>
      
      <div className="map-instructions">
        <span>Scroll to zoom, drag to pan, click a bubble for details</span>
      </div>
    </div>
  );
}
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
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    kingdom: Kingdom | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    kingdom: null,
  });
  const [filters, setFilters] = useState({
    minLords: 0,
    rarity: 'All Rarities',
    sortBy: 'rafflePower',
  });

  // Get map dimensions
  const { width: mapWidth, height: mapHeight } = getMapDimensions();

  // Apply spacing algorithm to prevent overcrowding
  useEffect(() => {
    if (kingdoms.length === 0) return;

    // Apply filters to kingdoms
    let filteredKingdoms = kingdoms.filter(kingdom => {
      if (kingdom.totalLords < filters.minLords) return false;
      
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

    // Simple force-directed algorithm to space kingdoms
    const iteration = 50; // Number of iterations
    const repulsionStrength = 2000; // Repulsion between kingdoms

    // Create a working copy with positions
    let workingKingdoms = filteredKingdoms.map(kingdom => ({
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
          
          // Combined size for distance calculation (bubbles should be further apart if they're larger)
          const combinedSize = workingKingdoms[j].size + workingKingdoms[k].size;
          const dist = Math.sqrt(distSq);
          
          // Calculate repulsive force (stronger for overlapping kingdoms)
          let repulsion = repulsionStrength / (dist * dist);
          
          // Increase repulsion for overlapping kingdoms
          if (dist < combinedSize) {
            repulsion *= 1.5;
          }
          
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
        const margin = 50 + workingKingdoms[j].size / 2;
        workingKingdoms[j].position.x = Math.max(margin, Math.min(mapWidth - margin, workingKingdoms[j].position.x));
        workingKingdoms[j].position.y = Math.max(margin, Math.min(mapHeight - margin, workingKingdoms[j].position.y));
      }
    }

    // Update the kingdoms with new positions
    setVisibleKingdoms(workingKingdoms.map(({ vx, vy, ...kingdom }) => kingdom));
  }, [kingdoms, filters, mapWidth, mapHeight]);

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
    setTooltip(prev => ({ ...prev, visible: false }));
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

  const handleKingdomHover = (e: React.MouseEvent, kingdom: Kingdom) => {
    if (!dragging) {
      const rect = mapRef.current!.getBoundingClientRect();
      
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
        kingdom,
      });
    }
  };

  const handleKingdomLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...`;
  };

  // Get emoji for specie
  const getSpecieEmoji = (specie: string): string => {
    switch (specie.toLowerCase()) {
      case 'wolf': return '🐺';
      case 'owl': return '🦉';
      case 'raven': return '🦅';
      case 'boar': return '🐗';
      case 'fox': return '🦊';
      default: return '🦓'; // Default for unknown species
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

  // Render functions for map elements
  const renderKingdom = (kingdom: Kingdom) => {
    // Scale kingdom size based on total lords, with a reasonable min/max
    const minSize = 60;
    const maxSize = 150;
    const scaleFactor = 5;
    
    const size = Math.max(
      minSize,
      Math.min(maxSize, minSize + Math.sqrt(kingdom.totalLords) * scaleFactor)
    );
    
    // Get all lords for rendering
    const allLords = [
      ...kingdom.rareLords.map(lord => ({ ...lord, rarity: 'rare' })),
      ...kingdom.epicLords.map(lord => ({ ...lord, rarity: 'epic' })),
      ...kingdom.legendaryLords.map(lord => ({ ...lord, rarity: 'legendary' })),
      ...kingdom.mysticLords.map(lord => ({ ...lord, rarity: 'mystic' })),
    ];
    
    // Calculate positions for lord emojis inside the kingdom
    // Using a spiral layout to fit more
    const lordElements = allLords.map((lord, index) => {
      // Calculate position in a spiral pattern
      const angle = 0.5 * index;
      const radius = (size / 2) * (0.4 + 0.35 * (index / allLords.length));
      const x = (size / 2) + radius * Math.cos(angle);
      const y = (size / 2) + radius * Math.sin(angle);
      
      return (
        <div
          key={lord.id}
          className={`lord-emoji ${getRarityColorClass(lord.rarity)}`}
          style={{
            left: x,
            top: y,
          }}
          title={`Lord #${lord.id} (${lord.rarity} ${lord.specie})`}
        >
          {getSpecieEmoji(lord.specie)}
        </div>
      );
    });
    
    return (
      <div
        key={kingdom.id}
        className="kingdom-bubble"
        style={{
          left: kingdom.position.x,
          top: kingdom.position.y,
          width: size,
          height: size,
          backgroundColor: `${kingdom.color}20`, // Very light background
          borderColor: kingdom.color,
        }}
        onMouseEnter={(e) => handleKingdomHover(e, kingdom)}
        onMouseLeave={handleKingdomLeave}
      >
        <div className="kingdom-header">
          <span className="kingdom-address">{formatAddress(kingdom.address)}</span>
          <span className="kingdom-count">{kingdom.totalLords} Lords</span>
        </div>
        
        <div className="lords-container">
          {lordElements}
        </div>
      </div>
    );
  };

  // Render tooltip content
  const renderTooltip = () => {
    if (!tooltip.visible || !tooltip.kingdom) return null;
    
    const kingdom = tooltip.kingdom;
    
    return (
      <div
        className="kingdom-tooltip"
        style={{
          left: tooltip.x,
          top: tooltip.y,
          opacity: tooltip.visible ? 1 : 0,
        }}
      >
        <div className="tooltip-title">
          {kingdom.address}
        </div>
        
        <div className="tooltip-section">
          <div className="tooltip-section-title">Lords by Rarity</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Rare:</span>
            <span className="tooltip-value rare">{kingdom.rareLords.length}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Epic:</span>
            <span className="tooltip-value epic">{kingdom.epicLords.length}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Legendary:</span>
            <span className="tooltip-value legendary">{kingdom.legendaryLords.length}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Mystic:</span>
            <span className="tooltip-value mystic">{kingdom.mysticLords.length}</span>
          </div>
        </div>
        
        <div className="tooltip-section">
          <div className="tooltip-row">
            <span className="tooltip-label">Total Lords:</span>
            <span className="tooltip-value">{kingdom.totalLords}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Raffle Power:</span>
            <span className="tooltip-value">{kingdom.rafflePower.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render filter controls
  const renderFilterControls = () => {
    return (
      <div className="map-filters">
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
    );
  };

  // Loading and empty states
  if (loading) {
    return (
      <div className="map-loading">
        <div className="map-loading-spinner"></div>
        <div>Loading kingdoms data...</div>
      </div>
    );
  }

  if (kingdoms.length === 0) {
    return (
      <div className="map-empty">
        <div className="map-empty-icon">🏰</div>
        <h3>No kingdoms found</h3>
        <p>There are no stakers with Lords currently staked.</p>
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
          {visibleKingdoms.map(renderKingdom)}
        </div>
        
        {renderTooltip()}
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
      
      <div className="map-legend">
        <div className="legend-title">Legend</div>
        
        <div className="legend-section">
          <div className="legend-title">Lord Species</div>
          <div className="legend-item">
            <div className="legend-emoji">🐺</div>
            <span className="legend-label">Wolf</span>
          </div>
          <div className="legend-item">
            <div className="legend-emoji">🦉</div>
            <span className="legend-label">Owl</span>
          </div>
          <div className="legend-item">
            <div className="legend-emoji">🦅</div>
            <span className="legend-label">Raven</span>
          </div>
          <div className="legend-item">
            <div className="legend-emoji">🐗</div>
            <span className="legend-label">Boar</span>
          </div>
          <div className="legend-item">
            <div className="legend-emoji">🦊</div>
            <span className="legend-label">Fox</span>
          </div>
        </div>
        
        <div className="legend-section">
          <div className="legend-title">Lord Rarities</div>
          <div className="legend-item">
            <div className="legend-emoji rare-lord">🦓</div>
            <span className="legend-label">Rare</span>
          </div>
          <div className="legend-item">
            <div className="legend-emoji epic-lord">🦓</div>
            <span className="legend-label">Epic</span>
          </div>
          <div className="legend-item">
            <div className="legend-emoji legendary-lord">🦓</div>
            <span className="legend-label">Legendary</span>
          </div>
          <div className="legend-item">
            <div className="legend-emoji mystic-lord">🦓</div>
            <span className="legend-label">Mystic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
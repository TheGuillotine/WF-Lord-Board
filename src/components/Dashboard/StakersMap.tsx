import React, { useState, useRef, useEffect } from 'react';
import { Kingdom, LordRepresentation } from '../../hooks/useStakersMapData';
import { getMapDimensions, calculateLordPositions } from '../../utils/mapGeneration';
import '../../styles/stakers-map.css';
import '../../styles/stakers-map-extras.css';

interface StakersMapProps {
  kingdoms: Kingdom[];
  loading: boolean;
}

export function StakersMap({ kingdoms, loading }: StakersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
  const [selectedKingdom, setSelectedKingdom] = useState<Kingdom | null>(null);
  const [lordPositions, setLordPositions] = useState<{
    [kingdomId: string]: { [lordId: string]: { x: number; y: number } };
  }>({});

  // Get map dimensions
  const { width: mapWidth, height: mapHeight } = getMapDimensions();

  // Calculate lord positions for each kingdom
  useEffect(() => {
    const positionsMap: { [kingdomId: string]: { [lordId: string]: { x: number; y: number } } } = {};
    
    kingdoms.forEach(kingdom => {
      positionsMap[kingdom.id] = calculateLordPositions(kingdom, kingdom.expanded);
    });
    
    setLordPositions(positionsMap);
  }, [kingdoms]);

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
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetView = () => {
    setScale(1);
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

  const handleKingdomClick = (kingdom: Kingdom) => {
    // Toggle expanded state for the clicked kingdom
    const updatedKingdoms = kingdoms.map(k => {
      if (k.id === kingdom.id) {
        return { ...k, expanded: !k.expanded };
      }
      return k;
    });
    
    // This will update the parent component's state
    // and trigger a re-render with the new expanded state
    setSelectedKingdom(prev => prev?.id === kingdom.id ? null : kingdom);
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Function to render a kingdom
  const renderKingdom = (kingdom: Kingdom) => {
    const { position: kingdomPosition, size, color, expanded } = kingdom;
    
    return (
      <div
        key={kingdom.id}
        className={`kingdom ${expanded ? 'expanded' : ''}`}
        style={{
          left: kingdomPosition.x,
          top: kingdomPosition.y,
          width: size,
          height: size,
          backgroundColor: `${color}33`, // Add transparency for better visuals
          borderColor: color,
        }}
        onMouseEnter={(e) => handleKingdomHover(e, kingdom)}
        onMouseLeave={handleKingdomLeave}
        onClick={() => handleKingdomClick(kingdom)}
      >
        <div className="kingdom-inner">
          <div className="kingdom-name">
            {formatAddress(kingdom.address)}
          </div>
          <div className="kingdom-stats">
            {kingdom.totalLords} Lords
          </div>
        </div>
        
        {expanded && renderLords(kingdom)}
      </div>
    );
  };

  // Function to render lords within a kingdom
  const renderLords = (kingdom: Kingdom) => {
    if (!lordPositions[kingdom.id]) return null;
    
    const allLords = [
      ...kingdom.rareLords.map(lord => ({ ...lord, rarityClass: 'rare' })),
      ...kingdom.epicLords.map(lord => ({ ...lord, rarityClass: 'epic' })),
      ...kingdom.legendaryLords.map(lord => ({ ...lord, rarityClass: 'legendary' })),
      ...kingdom.mysticLords.map(lord => ({ ...lord, rarityClass: 'mystic' }))
    ];
    
    return allLords.map(lord => {
      const position = lordPositions[kingdom.id][lord.id];
      if (!position) return null;
      
      return (
        <div
          key={lord.id}
          className={`lord-icon ${lord.rarityClass} ${lord.specie}`}
          style={{
            left: position.x,
            top: position.y,
          }}
          title={`Lord #${lord.id} (${lord.rarity} ${lord.specie})`}
        />
      );
    });
  };

  // Render tooltip
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
          {formatAddress(kingdom.address)}
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

  // Render map legend
  const renderLegend = () => {
    return (
      <div className="map-legend">
        <div className="legend-title">Legend</div>
        
        <div className="legend-section">
          <div className="legend-item">
            <div className="legend-icon" style={{ backgroundColor: '#5da9e9' }}></div>
            <span className="legend-label">Rare Lords</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon" style={{ backgroundColor: '#a020f0' }}></div>
            <span className="legend-label">Epic Lords</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon" style={{ backgroundColor: '#ffd700' }}></div>
            <span className="legend-label">Legendary Lords</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon" style={{ backgroundColor: '#ff1493' }}></div>
            <span className="legend-label">Mystic Lords</span>
          </div>
        </div>
        
        <div className="legend-section">
          <div className="legend-title">Species</div>
          <div className="legend-item">
            <div className="legend-icon wolf" style={{ backgroundColor: '#ccc', clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}></div>
            <span className="legend-label">Wolf</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon owl" style={{ backgroundColor: '#ccc', clipPath: 'circle(50% at 50% 50%)' }}></div>
            <span className="legend-label">Owl</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon raven" style={{ backgroundColor: '#ccc', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
            <span className="legend-label">Raven</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon boar" style={{ backgroundColor: '#ccc', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
            <span className="legend-label">Boar</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon fox" style={{ backgroundColor: '#ccc', clipPath: 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)' }}></div>
            <span className="legend-label">Fox</span>
          </div>
        </div>
      </div>
    );
  };

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
          {kingdoms.map(renderKingdom)}
        </div>
        
        {renderTooltip()}
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

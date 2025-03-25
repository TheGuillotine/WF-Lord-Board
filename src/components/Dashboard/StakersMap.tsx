import React, { useState, useRef, useEffect } from 'react';
import { Kingdom, LordRepresentation } from '../../hooks/useStakersMapData';
import { getMapDimensions, calculateLordPositions } from '../../utils/mapGeneration';

interface StakersMapProps {
  kingdoms: Kingdom[];
  loading: boolean;
}

// Cluster type to represent a group of kingdoms
interface Cluster {
  id: string;
  position: { x: number; y: number };
  size: number;
  kingdoms: Kingdom[];
  color: string;
}

// Constants for clustering
const CLUSTER_DISTANCE_THRESHOLD = 100;
const MIN_KINGDOM_SIZE = 30;
const MAX_KINGDOM_SIZE = 80;
const MIN_ZOOM_LEVEL_FOR_DETAILS = 1.5;

export function StakersMap({ kingdoms, loading }: StakersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7); // Start more zoomed out
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [visibleKingdoms, setVisibleKingdoms] = useState<Kingdom[]>([]);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: Kingdom | Cluster | null;
    isCluster: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
    isCluster: false,
  });
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [lordPositions, setLordPositions] = useState<{
    [kingdomId: string]: { [lordId: string]: { x: number; y: number } };
  }>({});
  const [filters, setFilters] = useState({
    minLords: 0,
    rarity: 'All Rarities',
    species: 'All Species',
    sortBy: 'rafflePower',
  });

  // Get map dimensions
  const { width: mapWidth, height: mapHeight } = getMapDimensions();

  // Create clusters from kingdoms
  useEffect(() => {
    if (kingdoms.length === 0) return;

    // Apply filters to kingdoms
    const filteredKingdoms = kingdoms.filter(kingdom => {
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
      
      // Filter by species if implemented
      // This would require tracking lord species in the kingdom object
      
      return true;
    });
    
    // Sort kingdoms 
    let sortedKingdoms = [...filteredKingdoms];
    if (filters.sortBy === 'rafflePower') {
      sortedKingdoms.sort((a, b) => b.rafflePower - a.rafflePower);
    } else if (filters.sortBy === 'totalLords') {
      sortedKingdoms.sort((a, b) => b.totalLords - a.totalLords);
    }

    // When very zoomed out, cluster kingdoms
    if (scale < MIN_ZOOM_LEVEL_FOR_DETAILS && !selectedCluster) {
      const newClusters: Cluster[] = [];
      const processedKingdoms = new Set<string>();
      
      // First pass: Create initial clusters
      for (const kingdom of sortedKingdoms) {
        if (processedKingdoms.has(kingdom.id)) continue;
        
        const neighborKingdoms = [kingdom];
        processedKingdoms.add(kingdom.id);
        
        // Find all kingdoms within threshold distance
        for (const otherKingdom of sortedKingdoms) {
          if (processedKingdoms.has(otherKingdom.id)) continue;
          
          const distance = Math.sqrt(
            Math.pow(kingdom.position.x - otherKingdom.position.x, 2) +
            Math.pow(kingdom.position.y - otherKingdom.position.y, 2)
          );
          
          if (distance < CLUSTER_DISTANCE_THRESHOLD / scale) {
            neighborKingdoms.push(otherKingdom);
            processedKingdoms.add(otherKingdom.id);
          }
        }
        
        // Create a cluster
        if (neighborKingdoms.length > 0) {
          // Calculate average position
          let avgX = 0;
          let avgY = 0;
          
          neighborKingdoms.forEach(k => {
            avgX += k.position.x;
            avgY += k.position.y;
          });
          
          avgX /= neighborKingdoms.length;
          avgY /= neighborKingdoms.length;
          
          // Generate a consistent color based on position
          const colorHash = Math.abs((avgX * 10000 + avgY * 1000) % 360);
          const color = `hsl(${colorHash}, 70%, 60%)`;
          
          newClusters.push({
            id: `cluster-${newClusters.length}`,
            position: { x: avgX, y: avgY },
            size: Math.min(MAX_KINGDOM_SIZE, 30 + Math.sqrt(neighborKingdoms.length) * 5),
            kingdoms: neighborKingdoms,
            color,
          });
        }
      }
      
      setClusters(newClusters);
      setVisibleKingdoms([]);
    } else {
      // When zoomed in or a cluster is selected, show individual kingdoms
      const visibleKingdomsList = selectedCluster
        ? selectedCluster.kingdoms
        : sortedKingdoms;
      
      setClusters([]);
      setVisibleKingdoms(visibleKingdomsList);
      
      // Calculate positions for lords in visible kingdoms
      const positions: { [kingdomId: string]: { [lordId: string]: { x: number; y: number } } } = {};
      
      visibleKingdomsList.forEach(kingdom => {
        positions[kingdom.id] = calculateLordPositions(kingdom, false);
      });
      
      setLordPositions(positions);
    }
  }, [kingdoms, scale, filters, selectedCluster]);

  // Interaction handlers
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
    setScale(prev => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.3, 0.3));
  };

  const handleResetView = () => {
    setScale(0.7);
    setPosition({ x: 0, y: 0 });
    setSelectedCluster(null);
  };

  const handleClusterClick = (cluster: Cluster) => {
    // Zoom into this cluster
    setSelectedCluster(cluster);
    
    // Center the view on the cluster
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      setPosition({
        x: centerX - cluster.position.x * scale,
        y: centerY - cluster.position.y * scale,
      });
      
      // Zoom in slightly if needed
      if (scale < MIN_ZOOM_LEVEL_FOR_DETAILS) {
        setScale(MIN_ZOOM_LEVEL_FOR_DETAILS);
      }
    }
  };

  const handleBackToOverview = () => {
    setSelectedCluster(null);
    setScale(0.7);
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle hover events
  const handleElementHover = (
    e: React.MouseEvent,
    content: Kingdom | Cluster,
    isCluster: boolean
  ) => {
    if (!dragging && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
        content,
        isCluster,
      });
    }
  };

  const handleElementLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // Render functions for map elements
  const renderCluster = (cluster: Cluster) => {
    return (
      <div
        key={cluster.id}
        className="cluster"
        style={{
          left: cluster.position.x,
          top: cluster.position.y,
          width: cluster.size,
          height: cluster.size,
          backgroundColor: `${cluster.color}40`, // Semi-transparent
          borderColor: cluster.color,
        }}
        onClick={() => handleClusterClick(cluster)}
        onMouseEnter={(e) => handleElementHover(e, cluster, true)}
        onMouseLeave={handleElementLeave}
      >
        <div className="cluster-inner">
          <div className="cluster-count">{cluster.kingdoms.length}</div>
          <div className="cluster-label">Kingdoms</div>
        </div>
      </div>
    );
  };

  const renderKingdom = (kingdom: Kingdom) => {
    // Scale kingdom size based on total lords, but within limits
    const scaledSize = Math.max(
      MIN_KINGDOM_SIZE,
      Math.min(MAX_KINGDOM_SIZE, 20 + Math.sqrt(kingdom.totalLords) * 5)
    );
    
    return (
      <div
        key={kingdom.id}
        className="kingdom"
        style={{
          left: kingdom.position.x,
          top: kingdom.position.y,
          width: scaledSize,
          height: scaledSize,
          backgroundColor: `${kingdom.color}40`, // Semi-transparent
          borderColor: kingdom.color,
        }}
        onMouseEnter={(e) => handleElementHover(e, kingdom, false)}
        onMouseLeave={handleElementLeave}
      >
        <div className="kingdom-inner">
          <div className="kingdom-name">
            {formatAddress(kingdom.address)}
          </div>
          <div className="kingdom-stats">
            {kingdom.totalLords} Lords
          </div>
        </div>
      </div>
    );
  };

  // Render tooltip content
  const renderTooltip = () => {
    if (!tooltip.visible || !tooltip.content) return null;
    
    if (tooltip.isCluster) {
      const cluster = tooltip.content as Cluster;
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
            Cluster of {cluster.kingdoms.length} Kingdoms
          </div>
          
          <div className="tooltip-section">
            <div className="tooltip-row">
              <span className="tooltip-label">Total Lords:</span>
              <span className="tooltip-value">
                {cluster.kingdoms.reduce((sum, k) => sum + k.totalLords, 0)}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Total Raffle Power:</span>
              <span className="tooltip-value">
                {cluster.kingdoms.reduce((sum, k) => sum + k.rafflePower, 0).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="tooltip-hint">Click to explore this cluster</div>
        </div>
      );
    } else {
      const kingdom = tooltip.content as Kingdom;
      
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
    }
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

  // Render map status indicator
  const renderStatusIndicator = () => {
    if (selectedCluster) {
      return (
        <div className="map-status">
          <button 
            className="back-button"
            onClick={handleBackToOverview}
          >
            ← Back to Overview
          </button>
          <span className="status-text">
            Viewing cluster with {selectedCluster.kingdoms.length} kingdoms
          </span>
        </div>
      );
    }
    
    return null;
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
      {renderStatusIndicator()}
      
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
          {/* Render either clusters or individual kingdoms */}
          {clusters.map(renderCluster)}
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
          <div className="legend-item">
            <div className="legend-icon cluster-icon"></div>
            <span className="legend-label">Cluster (click to explore)</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon kingdom-icon"></div>
            <span className="legend-label">Individual Kingdom</span>
          </div>
        </div>
        
        <div className="legend-section">
          <div className="legend-title">Rarities</div>
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
      </div>
    </div>
  );
}
import { Kingdom } from '../hooks/useStakersMapData';

// Constants for map generation
const MAP_WIDTH = 1800;
const MAP_HEIGHT = 1200;
const PADDING = 50;

// Parameters for force-directed placement
const FORCE_ITERATIONS = 50;
const REPULSION_STRENGTH = 1200;
const ATTRACTION_STRENGTH = 0.002;

/**
 * Generate positions for kingdoms using a force-directed algorithm
 * This ensures kingdoms are well-distributed across the map with minimal overlap
 */
export function generatePositions(kingdoms: Kingdom[]): Kingdom[] {
  if (kingdoms.length === 0) return [];
  
  // Initialize with random positions
  const kingdomsWithPositions = kingdoms.map(kingdom => {
    return {
      ...kingdom,
      position: {
        x: PADDING + Math.random() * (MAP_WIDTH - 2 * PADDING),
        y: PADDING + Math.random() * (MAP_HEIGHT - 2 * PADDING)
      }
    };
  });
  
  // Apply force-directed algorithm to position kingdoms
  for (let i = 0; i < FORCE_ITERATIONS; i++) {
    // Calculate repulsive forces between kingdoms
    for (let j = 0; j < kingdomsWithPositions.length; j++) {
      let fx = 0;
      let fy = 0;
      
      for (let k = 0; k < kingdomsWithPositions.length; k++) {
        if (j === k) continue;
        
        const dx = kingdomsWithPositions[j].position.x - kingdomsWithPositions[k].position.x;
        const dy = kingdomsWithPositions[j].position.y - kingdomsWithPositions[k].position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Avoid division by zero
        if (distance === 0) continue;
        
        // Calculate combined size for distance calculation
        const combinedSize = kingdomsWithPositions[j].size + kingdomsWithPositions[k].size;
        
        // Repulsive force (stronger for larger kingdoms)
        const repulsiveForce = REPULSION_STRENGTH * (combinedSize / 40) / (distance * distance);
        
        fx += dx / distance * repulsiveForce;
        fy += dy / distance * repulsiveForce;
      }
      
      // Apply attraction to center for very spread out kingdoms
      const dx = MAP_WIDTH / 2 - kingdomsWithPositions[j].position.x;
      const dy = MAP_HEIGHT / 2 - kingdomsWithPositions[j].position.y;
      const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
      
      fx += dx * ATTRACTION_STRENGTH * distanceToCenter;
      fy += dy * ATTRACTION_STRENGTH * distanceToCenter;
      
      // Update position
      kingdomsWithPositions[j].position.x += fx;
      kingdomsWithPositions[j].position.y += fy;
      
      // Enforce boundaries with padding
      kingdomsWithPositions[j].position.x = Math.max(
        PADDING + kingdomsWithPositions[j].size / 2,
        Math.min(
          MAP_WIDTH - PADDING - kingdomsWithPositions[j].size / 2,
          kingdomsWithPositions[j].position.x
        )
      );
      
      kingdomsWithPositions[j].position.y = Math.max(
        PADDING + kingdomsWithPositions[j].size / 2,
        Math.min(
          MAP_HEIGHT - PADDING - kingdomsWithPositions[j].size / 2,
          kingdomsWithPositions[j].position.y
        )
      );
    }
  }
  
  return kingdomsWithPositions;
}

/**
 * Calculate positions for lords within a kingdom
 * Arranges lords in a grid or circular pattern
 */
export function calculateLordPositions(
  kingdom: Kingdom, 
  expanded: boolean
): { [lordId: string]: { x: number, y: number } } {
  const positions: { [lordId: string]: { x: number, y: number } } = {};
  const centerX = kingdom.position.x;
  const centerY = kingdom.position.y;
  
  if (!expanded) {
    // When not expanded, we just store positions as center
    // (we'll render icons differently)
    const allLords = [
      ...kingdom.rareLords, 
      ...kingdom.epicLords, 
      ...kingdom.legendaryLords, 
      ...kingdom.mysticLords
    ];
    
    for (const lord of allLords) {
      positions[lord.id] = { x: centerX, y: centerY };
    }
    
    return positions;
  }
  
  // When expanded, arrange lords by rarity in concentric circles
  // Mystic (innermost)
  arrangeInCircle(kingdom.mysticLords, positions, centerX, centerY, kingdom.size * 0.15);
  
  // Legendary
  arrangeInCircle(kingdom.legendaryLords, positions, centerX, centerY, kingdom.size * 0.3);
  
  // Epic
  arrangeInCircle(kingdom.epicLords, positions, centerX, centerY, kingdom.size * 0.45);
  
  // Rare (outermost)
  arrangeInCircle(kingdom.rareLords, positions, centerX, centerY, kingdom.size * 0.6);
  
  return positions;
}

/**
 * Arrange lords in a circle with the given radius
 */
function arrangeInCircle(
  lords: any[], 
  positions: { [lordId: string]: { x: number, y: number } },
  centerX: number,
  centerY: number,
  radius: number
) {
  const count = lords.length;
  if (count === 0) return;
  
  lords.forEach((lord, index) => {
    const angle = (index / count) * 2 * Math.PI;
    
    positions[lord.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });
}

/**
 * Get map dimensions
 */
export function getMapDimensions() {
  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT
  };
}

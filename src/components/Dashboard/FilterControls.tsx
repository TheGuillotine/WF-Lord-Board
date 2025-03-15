import React, { useState } from 'react';
import { FilterOptions, SortOption } from '../../types';

interface FilterControlsProps {
  filters: FilterOptions;
  updateFilters: (filters: Partial<FilterOptions>) => void;
  loading: boolean;
  species: string[];
  rarities: string[];
}

export function FilterControls({ filters, updateFilters, loading, species, rarities }: FilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="filters-container">
      <div className="filters-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="filters-title">Filters</h3>
        <div className="flex items-center">
          <button className="filter-toggle">
            {isExpanded ? '↑' : '↓'}
          </button>
        </div>
      </div>
      
      <div className={`filters-body ${isExpanded ? 'expanded' : ''}`}>
        <div className="filters-form">
          <div className="filter-section">
            <div className="form-group">
              <label className="form-label">Specie</label>
              <div className="select-wrapper">
                <select 
                  className="form-control"
                  value={filters.lordSpecie}
                  onChange={(e) => updateFilters({ lordSpecie: e.target.value })}
                  disabled={loading}
                >
                  {species.map(specie => (
                    <option key={specie} value={specie}>{specie}</option>
                  ))}
                </select>
                <div className="select-arrow">▼</div>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Rarity</label>
              <div className="select-wrapper">
                <select 
                  className="form-control"
                  value={filters.lordRarity}
                  onChange={(e) => updateFilters({ lordRarity: e.target.value })}
                  disabled={loading}
                >
                  {rarities.map(rarity => (
                    <option key={rarity} value={rarity}>{rarity}</option>
                  ))}
                </select>
                <div className="select-arrow">▼</div>
              </div>
            </div>
          </div>
          
          <div className="filter-section">
            <div className="form-group">
              <label className="form-label">Minimum Duration (days)</label>
              <div className="number-input-wrapper">
                <input 
                  type="number"
                  className="form-control"
                  value={filters.minDuration}
                  onChange={(e) => updateFilters({ minDuration: parseInt(e.target.value) || 0 })}
                  min={0}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Sort By</label>
              <div className="select-wrapper">
                <select 
                  className="form-control"
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value as SortOption })}
                  disabled={loading}
                >
                  <option value="durationHighToLow">Duration (High to Low)</option>
                  <option value="durationLowToHigh">Duration (Low to High)</option>
                  <option value="tokenIdAsc">Token ID (Low to High)</option>
                  <option value="tokenIdDesc">Token ID (High to Low)</option>
                </select>
                <div className="select-arrow">▼</div>
              </div>
            </div>
          </div>
          
          <div className="filter-section filter-actions">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  className="checkbox-input"
                  checked={filters.onlyStaked}
                  onChange={(e) => updateFilters({ onlyStaked: e.target.checked })}
                  disabled={loading}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">Show only staked Lords</span>
              </label>
            </div>
            
            <div className="form-group">
              <button 
                className="btn btn-primary"
                onClick={() => updateFilters({ 
                  lordSpecie: 'All',
                  lordRarity: 'All',
                  minDuration: 0,
                  sortBy: 'durationHighToLow',
                  onlyStaked: false
                })}
                disabled={loading}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Participant } from '../../hooks/useRaffle';

interface ParticipantsListProps {
  participants: Participant[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const itemsPerPage = 10;
  
  // Filter participants based on search term
  const filteredParticipants = participants.filter(participant => 
    participant.address.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get current page data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentParticipants = filteredParticipants.slice(indexOfFirstItem, indexOfLastItem);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  
  // Format address
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format percentage
  const formatPercentage = (percentage: number) => {
    return percentage.toFixed(2) + '%';
  };
  
  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };
  
  if (participants.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>No Participants</h3>
        <p>Upload a file with wallet addresses to see participants</p>
      </div>
    );
  }
  
  return (
    <div className="participants-container">
      <div className="card-header">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-light-alt mb-2 md:mb-0">
            {filteredParticipants.length === 0 
              ? "Showing 0 Participants" 
              : `Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredParticipants.length)} of ${filteredParticipants.length} Participants`}
          </div>
          
          <div className="header-controls w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by address..."
              className="form-control search-input w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="raffle-stats">
          <div className="stat-item">
            <span className="stat-label">Total Participants:</span>
            <span className="stat-value">{participants.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Raffle Power:</span>
            <span className="stat-value">
              {formatNumber(participants.reduce((sum, p) => sum + p.rafflePower, 0))}
            </span>
          </div>
        </div>
      </div>
      
      <div className="participants-table-container">
        <table className="participants-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Raffle Power</th>
              <th>Win Chance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentParticipants.map((participant, index) => (
              <tr 
                key={participant.address + index} 
                className={participant.isWinner ? 'winner-row' : ''}
              >
                <td>
                  <a
                    href={`https://marketplace.roninchain.com/account/${participant.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contract-link"
                  >
                    {formatAddress(participant.address)}
                  </a>
                </td>
                <td className="raffle-power">
                  {formatNumber(participant.rafflePower)}
                </td>
                <td className="percentage">
                  {formatPercentage(participant.percentage)}
                </td>
                <td className="status">
                  {participant.isWinner ? (
                    <span className="winner-badge">Winner! 🏆</span>
                  ) : participant.rafflePower === 0 ? (
                    <span className="no-power-badge">No Raffle Power</span>
                  ) : (
                    <span className="eligible-badge">Eligible</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            1
          </button>
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &larr;
          </button>
          
          <div className="page-info">
            {currentPage}
          </div>
          
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            &rarr;
          </button>
          <button 
            className="page-control" 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {totalPages}
          </button>
        </div>
      )}
    </div>
  );
}
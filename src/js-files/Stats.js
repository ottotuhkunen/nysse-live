import React from 'react';
import '../Stats.css';

const Stats = ({ isVisible }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="stats-container">
      <h2>
        Tilastot LIVE
        <img src={`${process.env.PUBLIC_URL}/icons/live.svg`} alt="" className="live-icon" />
      </h2>
      
      <p>Tulossa pian...</p>
    </div>
  );
};

export default Stats;

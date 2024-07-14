import React from 'react';
import '../Favourite.css';

const Favourite = ({ isVisible }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="favourite-container">
        <h2>
            Suosikit
            <img src={`${process.env.PUBLIC_URL}/icons/star.svg`} alt="" className="star-icon" />
        </h2>
        <p>Tulossa pian...</p>
    </div>
  );
};

export default Favourite;

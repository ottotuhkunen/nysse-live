import React, { useState } from 'react';
import '../App.css';
import { openAlerts, closeAlerts } from './Alerts';
import { openFilterDiv, closeFilterDiv } from './Map';
import Stats from './Stats'; // Import the Stats component
import Favourite from './Favourite'; // Import the Favourite component

const NavButtons = () => {
  const [activeButton, setActiveButton] = useState('map'); // Set 'map' as the default active button
  const [isStatsVisible, setStatsVisible] = useState(false); // State to manage the visibility of Stats
  const [isFavouriteVisible, setFavouriteVisible] = useState(false); // State to manage the visibility of Favourite

  const handleButtonClick = (buttonName, onClickHandlers) => {
    setActiveButton(buttonName);
    setStatsVisible(buttonName === 'chart');
    setFavouriteVisible(buttonName === 'favourite');
    onClickHandlers.forEach(handler => {
      if (handler) {
        handler();
      }
    });
  };

  const buttons = [
    { name: 'favourite', alt: 'Suosikki', onClick: [closeAlerts, closeFilterDiv] },
    { name: 'filter', alt: 'Suodata', onClick: [closeAlerts, openFilterDiv] },
    { name: 'map', alt: 'Kartta', onClick: [closeAlerts, closeFilterDiv] },
    { name: 'chart', alt: 'Tilastot', onClick: [closeAlerts, closeFilterDiv] },
    { name: 'alert', alt: 'Varoitukset', onClick: [openAlerts, closeFilterDiv] },
  ];

  return (
    <div>
      <div className="nav-bar">
        {buttons.map(button => (
          <button
            key={button.name}
            className="nav-button"
            onClick={() => handleButtonClick(button.name, button.onClick)}
          >
            <img
              src={`${process.env.PUBLIC_URL}/icons/navBar/${activeButton === button.name ? 'active' : 'inactive'}/${button.name}.svg`}
              alt={button.alt}
            />
          </button>
        ))}
      </div>
      <Stats isVisible={isStatsVisible} />
      <Favourite isVisible={isFavouriteVisible} />
    </div>
  );
};

export default NavButtons;

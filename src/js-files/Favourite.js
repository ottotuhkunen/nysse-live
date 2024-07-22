import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import update from 'immutability-helper';
import '../Favourite.css';

const ItemType = 'FAVOURITE_ITEM';

export const formatArrivalTime = (item) => {
  const currentTime = Date.now() / 1000; // Convert to seconds
  const scheduledTime = item.scheduledDeparture + item.serviceDay;
  const realTimeArrival = item.realtimeDeparture >= 0 ? item.realtimeDeparture + item.serviceDay : null;

  // Calculate the time until the scheduled departure in minutes
  const timeUntilScheduledDeparture = (scheduledTime - currentTime) / 60; // in minutes

  // Check if the time until scheduled departure is 0 minutes or negative
  if (timeUntilScheduledDeparture <= 0) {
    return 'Nyt'; // Show "Nyt" if the departure time is now or in the past
  }

  if (timeUntilScheduledDeparture <= 10) {
    // Format the time until departure in minutes
    const minutesUntilDeparture = Math.ceil(timeUntilScheduledDeparture); // Round up to the nearest minute
    return `${minutesUntilDeparture} min`;
  }

  // Format the scheduled time
  const scheduledLocalTime = new Date(scheduledTime * 1000);
  const scheduledHours = scheduledLocalTime.getHours().toString().padStart(2, '0');
  const scheduledMinutes = scheduledLocalTime.getMinutes().toString().padStart(2, '0');

  let result = `${scheduledHours}:${scheduledMinutes}`;

  if (realTimeArrival) {
    // Calculate the time difference between real-time departure and scheduled departure in minutes
    const timeDifference = (realTimeArrival - scheduledTime) / 60; // in minutes

    // Show expected time only if it is 2 minutes or more late or ahead
    if (Math.abs(timeDifference) >= 2) {
      const realTimeLocalTime = new Date(realTimeArrival * 1000);
      const realTimeHours = realTimeLocalTime.getHours().toString().padStart(2, '0');
      const realTimeMinutes = realTimeLocalTime.getMinutes().toString().padStart(2, '0');
      result += ` ~${realTimeHours}:${realTimeMinutes}`;
    }
  }

  return result;
};








const FavouriteItem = ({ stop, index, moveFavouriteStop, removeFavouriteStop }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const ref = useRef(null);
  const timerRef = useRef(null);

  const [, drop] = useDrop({
    accept: ItemType,
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      moveFavouriteStop(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { type: ItemType, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const fetchTimetable = async () => {
    try {
      const response = await fetch(`https://tampere-backend-97492ba9e80a.herokuapp.com/api/stops/${stop.shortName}`);
      const data = await response.json();
      setTimetable(data.stoptimesWithoutPatterns);
    } catch (error) {
      console.error('Error fetching timetable data:', error);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchTimetable();
      timerRef.current = setInterval(fetchTimetable, 10000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isExpanded]);

  const getColorForDelay = (item) => {
    return item.arrivalDelay > 5 ? 'darkorange' : 'black';
  };

  return (
    <div ref={ref} className="favourite-item" style={{ opacity: isDragging ? 0.5 : 1 }}>
      <img src={`${process.env.PUBLIC_URL}/icons/drag.svg`} alt="Siirrä" className="fav-div-icon-drag" />

      <div onClick={() => setIsExpanded(!isExpanded)}>
        <p>
          <img
            src={`${process.env.PUBLIC_URL}/icons/${stop.tariffZone}.svg`}
            alt={`Vyöhyke ${stop.tariffZone}`}
            className="tariff-icon"
          />
          {`${stop.name}`}
          <span className='short-name-span'>{`#${stop.shortName}`}</span>
        </p>
      </div>

      <img src={`${process.env.PUBLIC_URL}/icons/delete.svg`}
        alt="Poista"
        className="fav-div-icon-delete"
        onClick={() => removeFavouriteStop(index)}
      />

      {isExpanded && (
        <div className="timetable">
          <table>
            <thead>
              <tr className='bust-stop-table-header'>
                <th>linja</th>
                <th>Määränpää</th>
                <th>Aika/min (arvio)</th>
              </tr>
            </thead>
            <tbody>
              {timetable.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.trip.route.shortName}</td>
                  <td>{item.headsign}</td>
                  <td style={{ color: getColorForDelay(item) }}>{formatArrivalTime(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


const Favourite = ({ isVisible }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [favouriteStops, setFavouriteStops] = useState(() => {
    const saved = localStorage.getItem('favouriteStops');
    return saved ? JSON.parse(saved) : [];
  });
  const searchContainerRef = useRef(null); // Ref for search container
  const searchInputRef = useRef(null); // Ref for search input

  // Click handler to hide search results if clicked outside
  const handleClickOutside = (event) => {
    if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length > 2) {
      fetch(`https://data.itsfactory.fi/journeys/api/1/stop-points`)
        .then(response => response.json())
        .then(data => {
          const results = data.body.filter(stop =>
            stop.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setSearchResults(results);
        });
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('favouriteStops', JSON.stringify(favouriteStops));
  }, [favouriteStops]);

  const addFavouriteStop = (stop) => {
    setFavouriteStops(prevStops => [...prevStops, stop]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeFavouriteStop = (index) => {
    setFavouriteStops(prevStops => prevStops.filter((_, i) => i !== index));
  };

  const moveFavouriteStop = (dragIndex, hoverIndex) => {
    const draggedStop = favouriteStops[dragIndex];
    setFavouriteStops(
      update(favouriteStops, {
        $splice: [[dragIndex, 1], [hoverIndex, 0, draggedStop]],
      })
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="favourite-container">
        <h2>
          Pysäkkitiedot
          <img src={`${process.env.PUBLIC_URL}/icons/star.svg`} alt="" className="star-icon" />
        </h2>
        <div ref={searchContainerRef}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Etsi pysäkki..."
            className="search-input"
          />
          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((stop, index) => (
                <li key={index} onClick={() => addFavouriteStop(stop)}>
                  {`${stop.name} #${stop.shortName}`}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="favourite-list">
          {favouriteStops.length > 0 && favouriteStops.map((stop, index) => (
            <FavouriteItem
              key={index}
              index={index}
              stop={stop}
              moveFavouriteStop={moveFavouriteStop}
              removeFavouriteStop={removeFavouriteStop}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default Favourite;

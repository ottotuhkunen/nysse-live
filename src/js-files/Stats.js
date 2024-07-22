import React, { useState, useEffect } from 'react';
import '../Stats.css';
import { allLines, stopsCount } from './Map';
import { vehicleCount } from './utils';

const allOperators = [
  { id: '56920', name: 'Tampereen Ratikka' },
  { id: '47374', name: 'Koiviston Auto' },
  { id: '6990', name: 'Länsilinjat' },
  { id: '6852', name: 'Pohjolan Liikenne' },
  { id: '6921', name: 'TKL' },
  { id: '6957', name: 'Valkeakosken Liikenne' },
  { id: '10299', name: 'Vekka Group' },
  { id: '3012', name: 'REMOTED' }
];

const getRealName = async (journeyUrl, shortName) => {

  // First attempt: try to get the headSign from the journey URL
  try {
    const response = await fetch(journeyUrl);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (data && data.body && data.body.length > 0) {
      const firstItem = data.body[0];
      if (firstItem && firstItem.headSign) {
        return firstItem.headSign;
      }
    }
  } catch (error) {
    console.error('Error fetching real name from journey URL:', error);
  }

  // If the first attempt fails, fallback to using the shortName
  const fallbackUrl = `https://data.itsfactory.fi/journeys/api/1/stop-points/${shortName}`;
  try {
    const response = await fetch(fallbackUrl);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (data.status === 'success' && data.body && data.body.length > 0) {
      return data.body[0].name;
    }
  } catch (error) {
    console.error('Error fetching real name from fallback URL:', error);
  }

  // Return the shortName if both attempts fail
  return shortName;
};

const Stats = ({ isVisible }) => {
  const [operatorVehicles, setOperatorVehicles] = useState({});
  const [onTimePercentage, setOnTimePercentage] = useState(null);
  const [lateVehicleCount, setLateVehicleCount] = useState(0);
  const [mostDelayedVehicle, setMostDelayedVehicle] = useState(null);
  const [mostDelayedVehicleStopName, setMostDelayedVehicleStopName] = useState('');
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);

  const fetchData = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`https://data.itsfactory.fi/journeys/api/1/vehicle-activity?timestamp=${timestamp}`);
      const data = await response.json();

      if (data && data.status === 'success' && data.body) {
        const vehiclesByOperator = {};
        let onTimeCount = 0;
        let totalCount = 0;
        let maxDelay = 0;
        let mostDelayedVehicle = null;

        // Count vehicles for each operator and calculate delays
        data.body.forEach(vehicle => {
          const operatorRef = vehicle.monitoredVehicleJourney.operatorRef;
          const delay = parseDelay(vehicle.monitoredVehicleJourney.delay);

          if (operatorRef && allOperators.find(op => op.id === operatorRef)) {
            if (!vehiclesByOperator[operatorRef]) {
              vehiclesByOperator[operatorRef] = 1;
            } else {
              vehiclesByOperator[operatorRef]++;
            }
          }

          totalCount++;
          if (delay < 4) {
            onTimeCount++;
          } else {
            if (delay > maxDelay) {
              maxDelay = delay;
              mostDelayedVehicle = vehicle;
            }
          }
        });

        setOperatorVehicles(vehiclesByOperator);
        setOnTimePercentage(Math.round((onTimeCount / totalCount) * 100));
        setLateVehicleCount(totalCount - onTimeCount);
        setMostDelayedVehicle(mostDelayedVehicle);

        if (mostDelayedVehicle) {

          const journeyUrl = mostDelayedVehicle.monitoredVehicleJourney.framedVehicleJourneyRef.datedVehicleJourneyRef;
          const shortName = mostDelayedVehicle.monitoredVehicleJourney.destinationShortName; 
          const realDestinationName = await getRealName(journeyUrl, shortName);

          setMostDelayedVehicleStopName(realDestinationName);
        }

        setIsNotificationVisible(true); // Show notification after data fetch
      } else {
        console.error('Error fetching vehicle data');
      }
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchData();
    } else {
      setIsNotificationVisible(false); // Hide notification when component is not visible
    }
  }, [isVisible]);

  const parseDelay = (delay) => {
    const match = delay.match(/P0Y0M0DT0H(\d+)M([\d.]+)S/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      return minutes + seconds / 60;
    }
    return 0;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="stats-container">
      <h2>
        Tilastot LIVE
        <img src={`${process.env.PUBLIC_URL}/icons/live.svg`} alt="Live" className="live-icon" />
      </h2>
      <p>
        <span className="stats-item">
          <img src={`${process.env.PUBLIC_URL}/icons/route.svg`} alt="Linja" className="stats-main-icons" />
          {allLines.length} linjaa
        </span>
        <span className="stats-item">
          <img src={`${process.env.PUBLIC_URL}/icons/stop.svg`} alt="Pysäkki" className="stats-main-icons" />
          {stopsCount !== undefined ? stopsCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : '...'} pysäkkiä
        </span>
        <span className="stats-item">
          <img src={`${process.env.PUBLIC_URL}/icons/vehicles.svg`} alt="Kulkuväline" className="stats-main-icons" />
          {vehicleCount} liikenteessä
        </span>
      </p>
      <div className="stats-table">
        {allOperators.map((operator) => (
          <div key={operator.id} className="stats-row">
            <div className="stats-cell">{operator.name}</div>
            <div className="stats-cell stats-cell-right">
              {operatorVehicles[operator.id] !== undefined ? operatorVehicles[operator.id] : "0"}
            </div>
          </div>
        ))}
      </div>
      <p>
        <span className="stats-item">
          <img src={`${process.env.PUBLIC_URL}/icons/clock.svg`} alt="Aikataulu" className="stats-main-icons" />
          {onTimePercentage !== null ? `${onTimePercentage}% ajallaan` : '...'}
        </span>
        <span className="stats-item">
          <img src={`${process.env.PUBLIC_URL}/icons/clock.svg`} alt="Myöhässä" className="stats-main-icons" />
          {lateVehicleCount} autoa myöhässä
        </span>
      </p>
      {mostDelayedVehicle && (
        <div>
          <p className='most-delayed-vehicle'>
            Eniten myöhässä auto #{mostDelayedVehicle.monitoredVehicleJourney.vehicleRef.split('_')[1]} linjalla
            <span className='highlighted-route-id'>
              {mostDelayedVehicle.monitoredVehicleJourney.journeyPatternRef} {mostDelayedVehicleStopName}
            </span>
          </p>
          <p className="most-delayed-vehicle-value">
            +{Math.floor(parseDelay(mostDelayedVehicle.monitoredVehicleJourney.delay))} min
          </p>
        </div>
      )}

      <div className={`stats-notification ${isNotificationVisible ? 'visible' : ''}`}>
        <span>Tilastot päivittyvät, kun avaat sivun uudelleen</span>
      </div>
    </div>
  );
};

export default Stats;

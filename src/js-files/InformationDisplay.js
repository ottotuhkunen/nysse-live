import React, { useState, useEffect } from 'react';
import { getColorForDelay, formatArrivalTime } from './utils';

const InformationDisplay = ({ loading, timetable, selectedStopName, selectedStopZone }) => {
  const [time, setTime] = useState(new Date());
  const [showColon, setShowColon] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setShowColon(prev => !prev);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const speakStopName = () => {
    if (!selectedStopName) return;

    let nameToSpeak = selectedStopName;

    if (selectedStopName.includes(" th")) nameToSpeak = selectedStopName.replace(" th", " tienhaara");
    if (selectedStopName.includes(" vt")) nameToSpeak = selectedStopName.replace(" vt", " valtatie");
    if (selectedStopName.includes(" as")) nameToSpeak = selectedStopName.replace(" as", " asema");
    if (selectedStopName.includes("Pohj.")) nameToSpeak = selectedStopName.replace("Pohj.", " Pohjoinen");
    if (selectedStopName.includes(" mt")) nameToSpeak = selectedStopName.replace(" mt", " maantie");
    if (selectedStopName.includes(" T1")) nameToSpeak = selectedStopName.replace(" T1", " Terminaali 1");
    if (selectedStopName.includes(" T2")) nameToSpeak = selectedStopName.replace(" T2", " Terminaali 2");

    window.responsiveVoice.speak(nameToSpeak, 'Finnish Female', { rate: 1 });
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="bus-stop-div">
      <div className='time-window'>
        <span>{String(time.getHours()).padStart(2, '0')}</span>
        <span className={`colon ${showColon ? 'visible' : 'hidden'}`}>:</span>
        <span>{String(time.getMinutes()).padStart(2, '0')}</span>
      </div>

      {loading ? ( // 1. loading display
        <p>Ladataan tietoja...</p>
      ) : selectedStopName.length > 0 ? ( // 2. bus-stop display
        <table className='bus-stop-table'>
          <thead>
            <tr>
              <th>
                {selectedStopZone && (
                  <img
                    src={`${process.env.PUBLIC_URL}/icons/${selectedStopZone}.png`}
                    alt={`Vyöhyke ${selectedStopZone}`}
                  />
                )}
              </th>
              <th colSpan={2}>
                {selectedStopName}
                <img
                  src={`${process.env.PUBLIC_URL}/icons/speaker.png`}
                  alt={`Ääni`}
                  className="speaker-icon"
                  onClick={speakStopName}
                  style={{ cursor: 'pointer'}}
                />
              </th>
            </tr>
            <tr className='bust-stop-table-header'>
              <td>linja</td>
              <td>Määränpää</td>
              <td>Aika/min (arvio)</td>
            </tr>
          </thead>
          <tbody>
            {timetable.map((item, index) => (
              <tr key={index}>
                <td>{item.trip.route.shortName}</td>
                <td>{item.headsign}</td>
                <td style={{ color: getColorForDelay(item) }}>{formatArrivalTime(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : ( // 3. Logo display
        <img src={`${process.env.PUBLIC_URL}/icons/logo.svg`} className='logo-img' alt='logo' />
      )}
    </div>
  );
};

export default InformationDisplay;

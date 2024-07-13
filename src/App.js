import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { fetchStopsData, parseStopsData } from './js-files/utils';
import Map from './js-files/Map';
import InformationDisplay from './js-files/InformationDisplay';
import Alerts from './js-files/Alerts'; 
import { routeUpdateInterval, removeRoute } from './js-files/Route';

let closeStopData;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [stopsData, setStopsData] = useState('');
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedStopName, setSelectedStopName] = useState('');
  const [selectedStopZone, setSelectedStopZone] = useState('X');
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      const data = await fetchStopsData();
      setStopsData(data);
    };

    getData();
  }, []);

  useEffect(() => {
    // console.log(selectedStop);
    if (selectedStop) {
      fetch(`https://tampere-backend-97492ba9e80a.herokuapp.com/api/stops/${selectedStop}`)
        .then(response => response.json())
        .then(data => {
          setTimetable(data.stoptimesWithoutPatterns);
          console.log(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching timetable data:', error);
          setLoading(false);
        });
        const routeStopsContainer = document.getElementById('route-stops-container');
        if (routeStopsContainer) {
          routeStopsContainer.style.display = 'none';
          clearInterval(routeUpdateInterval);
          removeRoute(map); 
        }
    } else {
      setTimetable([]);
      setLoading(false);
    }
  }, [selectedStop]);

  closeStopData = () => {
    setSelectedStop('');
    setSelectedStopName('');
    setSelectedStopZone('');
  };

  return (
    <div className="App">
      <Map
        mapContainer={mapContainer}
        map={map}
        stopsData={stopsData}
        setSelectedStop={setSelectedStop}
        setSelectedStopName={setSelectedStopName}
        setSelectedStopZone={setSelectedStopZone}
        onClickOutside={closeStopData} 
      />
      <InformationDisplay
        loading={loading}
        timetable={timetable}
        selectedStopName={selectedStopName}
        selectedStopZone={selectedStopZone}
        onClickOutside={closeStopData} 
      />
      <Alerts />
      <div id="loading-message" className="loading-message">Ladataan reittiä...</div>
    </div>
  );
}

export { closeStopData };

export default App;

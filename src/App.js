import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { fetchStopsData, parseStopsData } from './js-files/utils';
import Map from './js-files/Map';
import InformationDisplay from './js-files/InformationDisplay';

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
    console.log(selectedStop);
    if (selectedStop) {
      fetch(`http://localhost:4000/api/stops/${selectedStop}`)
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
    } else {
      setTimetable([]);
      setLoading(false);
    }
  }, [selectedStop]);

  return (
    <div className="App">
      <Map
        mapContainer={mapContainer}
        map={map}
        stopsData={stopsData}
        setSelectedStop={setSelectedStop}
        setSelectedStopName={setSelectedStopName}
        setSelectedStopZone={setSelectedStopZone}
      />
      <InformationDisplay
        loading={loading}
        timetable={timetable}
        selectedStopName={selectedStopName}
        selectedStopZone={selectedStopZone}
      />
    </div>
  );
}

export default App;

// <div className='nav-button-container'></div>

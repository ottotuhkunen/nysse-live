import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { mapboxToken, updateInterval } from './constants';
import stopIcon from '../icons/stop.png';
import { parseStopsData, updateVehicleLocations } from './utils';
import loadZones from './Zones';

mapboxgl.accessToken = mapboxToken;

const Map = ({
  mapContainer,
  map,
  stopsData,
  setSelectedStop,
  setSelectedStopName,
  setSelectedStopZone,
  onClickOutside // Callback to handle click outside stops-layer
}) => {
  const popup = useRef(null);
  const geolocateControlRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const markerRef = useRef(null); // Reference to the marker
  const intervalRef = useRef(null); // Reference to the interval ID

  const allLines = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '22', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36A', '36B', '37', '37X', '38', '39',
    '40', '40A', '40B', '40C', '41', '42', '43U', '44', '44A', '45', '46', '47', '48', '48A', '48B', '48C',
    '48D', '49', '50', '52A', '52B', '55', '60', '60U', '63', '64', '65', '65A', '66', '67', '68U', '69U',
    '70', '71', '72A', '72B', '73A', '73B', '74', '76', '77', '77X', '78', '78X', '79A', '79B', '80', '80Y',
    '81', '82', '84', '85', '86', '86X', '87U', '90', '90X', '91', '92', '93', '94', '95', '95U', '96U',
    '97A', '97B', '97C', '97D', '301', '303'
  ];

  const allOperators = [
    { id: '56920', name: 'Tampereen Ratikka' },
    { id: '47374', name: 'Koiviston Auto' },
    { id: '6990', name: 'Länsilinjat' },
    { id: '6852', name: 'Pohjolan Liikenne' },
    { id: '6921', name: 'Tampereen Kaupunkiliikenne TKL' },
    { id: '6957', name: 'Valkeakosken Liikenne' },
    { id: '10299', name: 'Vekka Group' },
    { id: '3012', name: 'REMOTED' }
  ];

  const [filterLines, setFilterLines] = useState([]);
  const [tempFilterLines, setTempFilterLines] = useState([...allLines]); // Start with all lines selected
  const [tempFilterOperators, setTempFilterOperators] = useState(allOperators.map(op => op.id)); // Start with all operators selected

  const [filterVisible, setFilterVisible] = useState(false);
  const [showOperatorResetButton, setShowOperatorResetButton] = useState(false); // State to manage visibility of operator reset button

  const handleApplyFilters = () => {
    setFilterLines(tempFilterLines);

    // Clear existing interval and start a new one with updated filters
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const initialUpdate = () => updateVehicleLocations(map, popup, tempFilterLines, tempFilterOperators);
    initialUpdate();
    intervalRef.current = setInterval(initialUpdate, updateInterval);

    setFilterVisible(false); // Hide filter after applying
  };

  const handleFilterClick = (line) => {
    setTempFilterLines((prevLines) => {
      // Check if all lines are currently selected
      const allSelected = prevLines.length === allLines.length;

      if (allSelected) {
        // Deselect all lines except the clicked line
        return [line];
      } else {
        // Toggle selection of the clicked line
        if (prevLines.includes(line)) {
          return prevLines.filter((l) => l !== line);
        } else {
          return [...prevLines, line];
        }
      }
    });
  };

  const handleOperatorClick = (operatorId) => {
    setTempFilterOperators([operatorId]); // Only allow one operator at a time
    setShowOperatorResetButton(true); // Show reset button for operators
    setFilterVisible(false); // Close the filter div

    // Clear existing interval and start a new one with updated filters
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const initialUpdate = () => updateVehicleLocations(map, popup, tempFilterLines, [operatorId]);
    initialUpdate();
    intervalRef.current = setInterval(initialUpdate, updateInterval);
  };

  const resetFilters = () => {
    // Toggle between selecting all lines and deselecting all lines
    if (tempFilterLines.length === allLines.length) {
      setTempFilterLines([]);
    } else {
      setTempFilterLines([...allLines]);
    }
    // Do not close filterVisible state here
  };

  const resetAllFilters = () => {
    // Reset lines
    setTempFilterLines([...allLines]);

    // Reset operators
    setTempFilterOperators(allOperators.map(op => op.id));
    setShowOperatorResetButton(false); // Hide reset button for operators
    // Do not close filterVisible state here

    // Clear existing interval and start a new one with updated filters
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const initialUpdate = () => updateVehicleLocations(map, popup, allLines, allOperators.map(op => op.id));
    initialUpdate();
    intervalRef.current = setInterval(initialUpdate, updateInterval);
  };

  useEffect(() => {
    if (stopsData) {
      const stops = parseStopsData(stopsData);

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/ottotuhkunen/clyedwf9t00q301pm0c2ahfo2',
        center: [23.7610, 61.4978],
        zoom: 9,
        pitchWithRotate: true,
        pitch: 0
      });

      map.current.on('load', () => {

        loadZones(map.current); // Add Zones to the map

        map.current.addControl(new mapboxgl.NavigationControl());

        geolocateControlRef.current = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          fitBoundsOptions: {
            maxZoom: 15
          },
          trackUserLocation: 'compass',
          showUserHeading: true,
          showAccuracyCircle: false
        });

        map.current.addControl(geolocateControlRef.current);

        geolocateControlRef.current.on('geolocate', (e) => {
          const userPosition = [e.coords.longitude, e.coords.latitude];
          setUserLocation(userPosition);
        });

        map.current.loadImage(stopIcon, (error, image) => {
          if (error) throw error;
          map.current.addImage('stop-icon', image);

          const stopsGeojson = {
            type: 'FeatureCollection',
            features: stops.map(stop => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)]
              },
              properties: {
                stop_id: stop.stop_id,
                stop_name: stop.stop_name,
                zone_id: stop.zone_id
              }
            }))
          };

          map.current.addSource('stops', {
            type: 'geojson',
            data: stopsGeojson
          });

          map.current.addLayer({
            id: 'stops-layer',
            type: 'symbol',
            source: 'stops',
            layout: {
              'icon-image': 'stop-icon',
              'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                12, 0.1,
                13, 0.15,
                14, 0.2
              ],
              'icon-allow-overlap': true,
            },
            paint: {
              'icon-opacity': 0.9
            },
            minzoom: 12
          });

          map.current.on('click', 'stops-layer', (e) => {
            const stopId = e.features[0].properties.stop_id;
            const stopName = e.features[0].properties.stop_name;
            const zone = e.features[0].properties.zone_id;
            const coordinates = e.features[0].geometry.coordinates;

            setSelectedStop(stopId);
            setSelectedStopName(stopName);
            setSelectedStopZone(zone);

            // Remove existing marker if it exists
            if (markerRef.current) {
              markerRef.current.remove();
            }

            // Add a new marker at the clicked stop's location
            markerRef.current = new mapboxgl.Marker()
              .setLngLat(coordinates)
              .addTo(map.current);
          });

          // Add click event listener to the map to remove marker on outside click
          map.current.on('click', (e) => {
            // Check if the click is outside the stops layer
            const features = map.current.queryRenderedFeatures(e.point, {
              layers: ['stops-layer']
            });

            if (!features.length) {
              // If click is outside the stops layer, remove the marker
              if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
              }

              onClickOutside(); // Inform InformationDisplay about click outside stops-layer
              setFilterVisible(false); // Close the filter div on outside click
            }
          });

          const initialUpdate = () => updateVehicleLocations(map, popup, filterLines, tempFilterOperators);
          initialUpdate();
          intervalRef.current = setInterval(initialUpdate, updateInterval);

          return () => {
            clearInterval(intervalRef.current);
          };
        });
      });
    }
  }, [stopsData]);

  // Handle click outside filter div
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterVisible && !e.target.closest('.filter-container') && !e.target.closest('.filter-button')) {
        handleApplyFilters();
      }
    };

    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [filterVisible, handleApplyFilters]);

  return (
    <div className="map-container" ref={mapContainer}>
      <button className="filter-button" onClick={() => setFilterVisible(!filterVisible)}>
        <img src={`${process.env.PUBLIC_URL}/icons/filter.png`} alt="Filter" className="filter-icon" />
      </button>
      {filterVisible && (
        <>
          <div className="overlay" onClick={() => setFilterVisible(false)}></div>
          <div className="filter-container">
            <button className="filter-div-close-button" onClick={handleApplyFilters}>X</button>
            <h2>Linjat</h2>
            <div className="filter-buttons">
              {allLines.map((line) => (
                <button
                  key={line}
                  className={tempFilterLines.includes(line) ? 'active' : ''}
                  onClick={() => handleFilterClick(line)}
                >
                  {line}
                </button>
              ))}
            </div>
            <div className="filter-actions">
              <button onClick={resetFilters} className="filter-reset-button">
                {tempFilterLines.length === allLines.length ? 'Käännä kaikki' : 'Näytä kaikki'}
              </button>
              <button onClick={handleApplyFilters} className="filter-apply-button">Tallenna</button>
            </div>
            <h2>Liikennöitsijät</h2>
            <div className="filter-buttons filter-by-operator">
              {allOperators.map((operator) => (
                <button
                  key={operator.id}
                  className={tempFilterOperators.includes(operator.id) ? 'active' : 'gray'}
                  onClick={() => handleOperatorClick(operator.id)}
                >
                  {operator.name}
                </button>
              ))}
            </div>
            <div className="filter-actions">
              {showOperatorResetButton && (
                <button onClick={resetAllFilters} className="filter-reset-all-button">Näytä kaikki liikennöitsijät</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Map;

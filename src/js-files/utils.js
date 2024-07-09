import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import showRoute from './Route';

import busIconUrl from '../icons/bus-vehicle1.png';
import tramIconUrl from '../icons/tram-vehicle1.png';


// Fetch the stops data from a local file
export const fetchStopsData = async () => {
  try {
    const response = await fetch(`${process.env.PUBLIC_URL}/data/stops.txt`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.text();
    return data;
  } catch (error) {
    console.error('Error fetching stops data:', error);
    return '';
  }
};

// Parse the stops data
export const parseStopsData = (data) => {
  const lines = data.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.replace(/"/g, ''));
    const stop = {};
    headers.forEach((header, index) => {
      stop[header] = values[index];
    });
    return stop;
  });
};

// Convert ISO duration to minutes
const parseISODurationToMinutes = (duration) => {
  const matches = duration.match(/(-?)P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?/);
  if (!matches) return 0;

  const isNegative = matches[1] === '-';
  const hours = matches[2] ? parseInt(matches[2]) : 0;
  const minutes = matches[3] ? parseInt(matches[3]) : 0;
  const seconds = matches[4] ? parseFloat(matches[4]) : 0;

  let totalMinutes = hours * 60 + minutes + seconds / 60;

  if (isNegative) {
    totalMinutes = -totalMinutes;
  }

  return totalMinutes;
};

// Fetch the real name from the API based on shortName
const getRealName = async (shortName) => {
  const url = `https://data.itsfactory.fi/journeys/api/1/stop-points/${shortName}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (data.status === 'success' && data.body && data.body.length > 0) {
      return data.body[0].name;
    }
  } catch (error) {
    console.error('Error fetching real name:', error);
  }
  return shortName; // Return the shortName if fetching fails
};

// Function to create popup content for map marker click
const createPopupContent = (activity) => {
  const { lineRef, destinationName, operatorRef, vehicleRef, delay } = activity;

  const iconSrc = (lineRef === '1' || lineRef === '3') ? `${process.env.PUBLIC_URL}/icons/tramFront.png` : `${process.env.PUBLIC_URL}/icons/busFront.png`;

  const delayMinutes = Math.round(parseFloat(delay));
  const delayText = delayMinutes === 0 ? "0" : delayMinutes > 0 ? `+${delayMinutes}` : `${delayMinutes}`;
  let delayColor = "white"; // default color

  if (delayMinutes < 0) {
    delayColor = "pink";
  } else if (delayMinutes > 8) {
    delayColor = "red";
  } else if (delayMinutes > 3) {
    delayColor = "orange";
  }

  const popupContent = `
    <h2 class="destination-board">${lineRef} ${destinationName}</h2>
    <div class="operator-data">
      <img src="${process.env.PUBLIC_URL}/icons/${operatorRef}.png" alt="Operator Icon"
        onError="this.onerror=null;this.src='${process.env.PUBLIC_URL}/icons/operatorNil.png';" class="operator-icon"/>
      <img src="${iconSrc}" alt="#" class="vehicle-number-icon"/>
      <span class="operator-name">${(vehicleRef && vehicleRef.split('_')[1]) ? vehicleRef.split('_')[1] : 'XXX'}</span>
    </div>
    <hr>
    <img src="${process.env.PUBLIC_URL}/icons/delayIcon.png" alt="Delay" class="delay-icon"/>
    <span class="vehicle-delay-value" style="color: ${delayColor};">${delayText} min</span>

    <button id="reitti-button" type="button" data-vehicle-id="${vehicleRef}">
      <img src="${process.env.PUBLIC_URL}/icons/openRoute.png" alt="Route" class="route-icon"/>
      <u>Reitti</u>
    </button>
  `;

  return popupContent;
};

// Update vehicle locations on the map
export const updateVehicleLocations = async (map, popup) => {
  let vehicleActivities = []; // Declare vehicleActivities with let
  let reittiButtonClickHandler; // Declare reittiButtonClickHandler outside to access later

  try {
    const timestamp = new Date().getTime(); // Unique timestamp
    const response = await fetch(`https://data.itsfactory.fi/journeys/api/1/vehicle-activity?timestamp=${timestamp}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    vehicleActivities = data.body; // Update vehicleActivities with latest data

    const geojson = {
      type: 'FeatureCollection',
      features: await Promise.all(vehicleActivities.map(async (activity) => {
        const delayInMinutes = parseISODurationToMinutes(activity.monitoredVehicleJourney.delay);
        const realDestinationName = await getRealName(activity.monitoredVehicleJourney.destinationShortName);

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              parseFloat(activity.monitoredVehicleJourney.vehicleLocation.longitude),
              parseFloat(activity.monitoredVehicleJourney.vehicleLocation.latitude)
            ]
          },
          properties: {
            lineRef: activity.monitoredVehicleJourney.lineRef,
            id: activity.monitoredVehicleJourney.vehicleRef,
            destinationName: realDestinationName,
            operatorRef: activity.monitoredVehicleJourney.operatorRef,
            vehicleRef: activity.monitoredVehicleJourney.vehicleRef,
            delay: delayInMinutes,
            bearing: parseInt(activity.monitoredVehicleJourney.bearing, 10)
          }
        };
      }))
    };

    // Check if the 'vehicles' source exists and update data or add new source and layers
    if (map.current.getSource('vehicles')) {
      map.current.getSource('vehicles').setData(geojson);
    } else {
      map.current.addSource('vehicles', {
        type: 'geojson',
        data: geojson
      });

      map.current.loadImage(busIconUrl, (error, busIcon) => {
        if (error) throw error;
        map.current.addImage('bus-vehicle1', busIcon);
      });
    
      map.current.loadImage(tramIconUrl, (error, tramIcon) => {
        if (error) throw error;
        map.current.addImage('tram-vehicle1', tramIcon);
      });

      map.current.addLayer({
        id: 'vehicles-layer',
        type: 'symbol',
        source: 'vehicles',
        layout: {
          'icon-image': [
            'match',
            ['get', 'lineRef'],
            '1', 'tram-vehicle1', // ratikka
            '3', 'tram-vehicle1', // ratikka
            'bus-vehicle1'
          ],
          'icon-size': 0.09,
          'text-field': '{lineRef}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'icon-allow-overlap': true,
          'text-allow-overlap': true,
          'text-anchor': 'center',
          'icon-rotate': ['get', 'bearing']
        },
        paint: {
          'icon-color': [
            'match',
            ['get', 'lineRef'],
            '1', '#da2128',
            '3', '#da2128',
            '#1c57cf'
          ],
          'text-color': [
            'case',
            ['>', ['get', 'delay'], 9], 'darkred', // red
            ['>', ['get', 'delay'], 4], '#b7660f', // orange
            'black' 
          ]
        }
      });
      

      // Define the click event handler for "Reitti" button
      reittiButtonClickHandler = async (e) => {
        if (e.target && e.target.id === 'reitti-button') {
          e.preventDefault();
          let vehicleId = e.target.dataset.vehicleId;

          // Call showRoute with map and vehicleActivity
          await showRoute(map, vehicleId);
        }
      };

      // Add click event listener for map markers (vehicles)
      map.current.on('click', 'vehicles-layer', (e) => {
        const popupContent = createPopupContent(e.features[0].properties);
        const coordinates = e.features[0].geometry.coordinates.slice();

        // Ensure only one popup is open at a time
        if (popup.current) {
          popup.current.remove();
        }

        // Create new popup and display it
        popup.current = new mapboxgl.Popup({ offset: 25, closeOnClick: true })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(map.current);

        // Reattach event listener for "Reitti" button inside the popup
        document.addEventListener('click', reittiButtonClickHandler);
      });
    }

  } catch (error) {
    console.error('Error fetching vehicle data:', error);
  }
};

// Function to get color for delay
export const getColorForDelay = (item) => {
  const delay = item.arrivalDelay;

  if (delay > 900) {
    return 'red';
  } else if (delay > 300) {
    return 'orange';
  } else {
    return 'inherit';
  }
};

// Function to format arrival time
export const formatArrivalTime = (item) => {
  const currentTime = Date.now();
  const scheduledTime = item.scheduledArrival + item.serviceDay;
  const scheduledLocalTime = new Date(scheduledTime * 1000);
  const scheduledHours = scheduledLocalTime.getHours().toString().padStart(2, '0');
  const scheduledMinutes = scheduledLocalTime.getMinutes().toString().padStart(2, '0');

  if (item.realtimeArrival >= 0 && item.realtimeArrival - item.scheduledArrival >= 120) { // 2 minutes
    const realTime = item.realtimeArrival + item.serviceDay;
    const realTimeLocalTime = new Date(realTime * 1000);
    const realTimeHours = realTimeLocalTime.getHours().toString().padStart(2, '0');
    const realTimeMinutes = realTimeLocalTime.getMinutes().toString().padStart(2, '0');
    return `${scheduledHours}:${scheduledMinutes} (${realTimeHours}:${realTimeMinutes})`;
  } else {
    return `${scheduledHours}:${scheduledMinutes}`;
  }
};

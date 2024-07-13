import React, { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import '../Route.css';

let routeUpdateInterval = null; // Variable to hold the interval ID

// Function to fetch the real name of the stop based on shortName
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
    } else {
      throw new Error('No valid data found');
    }
  } catch (error) {
    console.error('Error fetching real name:', error);
    return null;
  }
};

// Function to display the route on the map
export const showRoute = async (map, vehicleId) => {
  let vehicleActivities = []; // Declare vehicleActivities with let

  if (routeUpdateInterval) {
    clearInterval(routeUpdateInterval); // Clear any previous intervals
  }

  const loadingMessage = document.getElementById('loading-message');
  if (loadingMessage) {
    loadingMessage.style.display = 'block'; // Show the loading message
  }

  // Function to remove all existing route layers and sources
  const removeRoute = () => {
    const mapLayers = map.current.getStyle().layers;
    const mapSources = map.current.getStyle().sources;
    
    // Remove layers with IDs starting with 'route'
    mapLayers.forEach(layer => {
      if (layer.id.startsWith('route')) {
        map.current.removeLayer(layer.id);
      }
    });
    
    // Remove sources with IDs starting with 'route'
    Object.keys(mapSources).forEach(sourceId => {
      if (sourceId.startsWith('route')) {
        map.current.removeSource(sourceId);
      }
    });
  };

  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`https://data.itsfactory.fi/journeys/api/1/vehicle-activity?timestamp=${timestamp}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    vehicleActivities = data.body;

    let vehicleActivity = vehicleActivities.find(activity => activity.monitoredVehicleJourney.vehicleRef === vehicleId);

    // Remove existing route before adding new one
    removeRoute();

    let onwardCalls = vehicleActivity?.monitoredVehicleJourney?.onwardCalls;
    let routeId = vehicleActivity?.monitoredVehicleJourney?.lineRef;
    let routeDirection = vehicleActivity?.monitoredVehicleJourney?.directionRef;

    if (!Array.isArray(onwardCalls) || onwardCalls.length === 0) {
      console.error('No onward calls found or not in expected format');
      if (loadingMessage) {
        loadingMessage.style.display = 'none'; // Hide the loading message
      }
      return;
    }

    // Fetch stop names and coordinates asynchronously
    const stopsData = await Promise.all(onwardCalls.map(async (call) => {
      let stopId = call.stopPointRef.split('/').pop(); // Extract the ID from the URL
      if (!stopId) {
        console.error('Invalid stopPointRef:', call.stopPointRef);
        return null;
      }

      try {
        // Fetch detailed stop point data to get coordinates
        const stopPointResponse = await fetch(call.stopPointRef);
        if (!stopPointResponse.ok) {
          throw new Error('Failed to fetch stop point details');
        }
        const stopPointData = await stopPointResponse.json();

        // Extract coordinates from the fetched stop point data
        const location = stopPointData.body[0]?.location;
        if (!location) {
          throw new Error('Location data not found in stop point details');
        }
        const [latitude, longitude] = location.split(',').map(coord => parseFloat(coord));

        if (isNaN(latitude) || isNaN(longitude)) {
          throw new Error('Invalid coordinates in stop point details');
        }

        // Fetch real name asynchronously
        const stopName = await getRealName(stopId);
        const expectedArrivalTime = call.expectedArrivalTime
          ? new Date(call.expectedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Nyt';

        return {
          stopName: stopName || `Stop ${stopId}`,
          expectedArrivalTime: expectedArrivalTime,
          coordinates: [longitude, latitude] // Correct order: longitude, latitude
        };
      } catch (error) {
        console.error('Error fetching stop point details:', error);
        return null;
      }
    }));

    // Filter out any null values (failed to fetch or parse data)
    const validStopsData = stopsData.filter(stop => stop !== null);

    // Create GeoJSON feature collection for stops
    const stopsGeoJSON = {
      type: 'FeatureCollection',
      features: validStopsData.map(stop => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: stop.coordinates
        },
        properties: {
          title: stop.stopName,
          description: `${stop.expectedArrivalTime}`
        }
      }))
    };

    // Add GeoJSON source and layer to map for stops
    try {
      map.current.addSource('route-stops-live', {
        type: 'geojson',
        data: stopsGeoJSON
      });

      // Load the PNG image
      map.current.loadImage(`${process.env.PUBLIC_URL}/icons/bus-route-time.png`, function(error, image) {
        if (error) throw error;

        if (!map.current.hasImage('bus-stop-time')) {
          map.current.addImage('bus-stop-time', image);
        }

        // Now create a layer using the custom icon
        map.current.addLayer({
          id: 'route-stops-live-layer',
          type: 'symbol',
          source: 'route-stops-live', // Assuming 'route-stops-live' is your data source
          layout: {
            'icon-image': 'bus-stop-time', // Use the custom image added with addImage
            'icon-size': 0.2,
            'icon-anchor': 'bottom',
            'text-field': [
              'case',
              ['==', ['get', 'description'], 'Unknown'],
              'Nyt',
              ['get', 'description']
            ],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, -1.7],
            'text-allow-overlap': true,
            'symbol-placement': 'point'
          },
          paint: {
            'text-color': 'white'
          }
        });
      });

    } catch (error) {
      console.error('Error adding route-stops-live layer:', error);
    }

    // Ensure routeShapesData is loaded and valid
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/data/route_shapes.geojson`);
      if (!response.ok) {
        throw new Error('Failed to fetch route shapes data');
      }
      const routeShapesData = await response.json();

      // Filter the route shapes based on routeId and routeDirection
      const matchingRouteShapes = routeShapesData.features.filter(feature => {
        return feature.properties.route_id === routeId && feature.properties.direction_id === routeDirection;
      });

      if (matchingRouteShapes.length > 0) {
        const routeShapeGeoJSON = {
          type: 'FeatureCollection',
          features: matchingRouteShapes
        };

        // Add GeoJSON source and layer for route shapes
        map.current.addSource('route-shape', {
          type: 'geojson',
          data: routeShapeGeoJSON
        });

        map.current.addLayer({
          id: 'route-shape-layer',
          type: 'line',
          source: 'route-shape',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#f88f8b', // Line color (red)
            'line-width': 2
          }
        });

        // Move route-shape-layer behind other layers if they exist
        const layersToMoveBehind = ['route-stops-live-layer', 'vehicles-layer', 'stops-layer'];
        layersToMoveBehind.forEach(layerId => {
          if (map.current.getLayer(layerId)) {
            map.current.moveLayer('route-shape-layer', layerId);
          }
        });

        // Start updating the route every 10 seconds
        routeUpdateInterval = setInterval(async () => {
          console.log("Route updated");
          try {
            const timestamp = new Date().getTime();
            const response = await fetch(`https://data.itsfactory.fi/journeys/api/1/vehicle-activity?timestamp=${timestamp}`);
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            const data = await response.json();
            vehicleActivities = data.body;

            vehicleActivity = vehicleActivities.find(activity => activity.monitoredVehicleJourney.vehicleRef === vehicleId);

            if (!vehicleActivity || !vehicleActivity.monitoredVehicleJourney) {
              console.warn('Vehicle not found or data format incorrect, stopping updates.');
              clearInterval(routeUpdateInterval);
              removeRoute();
              return;
            }

            onwardCalls = vehicleActivity.monitoredVehicleJourney?.onwardCalls;

            if (!Array.isArray(onwardCalls) || onwardCalls.length === 0) {
              console.error('No onward calls found or not in expected format');
              return;
            }

            // Fetch stop names and coordinates asynchronously
            const stopsData = await Promise.all(onwardCalls.map(async (call) => {
              let stopId = call.stopPointRef.split('/').pop(); // Extract the ID from the URL
              if (!stopId) {
                console.error('Invalid stopPointRef:', call.stopPointRef);
                return null;
              }

              try {
                // Fetch detailed stop point data to get coordinates
                const stopPointResponse = await fetch(call.stopPointRef);
                if (!stopPointResponse.ok) {
                  throw new Error('Failed to fetch stop point details');
                }
                const stopPointData = await stopPointResponse.json();

                // Extract coordinates from the fetched stop point data
                const location = stopPointData.body[0]?.location;
                if (!location) {
                  throw new Error('Location data not found in stop point details');
                }
                const [latitude, longitude] = location.split(',').map(coord => parseFloat(coord));

                if (isNaN(latitude) || isNaN(longitude)) {
                  throw new Error('Invalid coordinates in stop point details');
                }

                // Fetch real name asynchronously
                const stopName = await getRealName(stopId);
                const expectedArrivalTime = call.expectedArrivalTime
                  ? new Date(call.expectedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Nyt';

                return {
                  stopName: stopName || `Stop ${stopId}`,
                  expectedArrivalTime: expectedArrivalTime,
                  coordinates: [longitude, latitude] // Correct order: longitude, latitude
                };
              } catch (error) {
                console.error('Error fetching stop point details:', error);
                return null;
              }
            }));

            // Filter out any null values (failed to fetch or parse data)
            const validStopsData = stopsData.filter(stop => stop !== null);

            // Update GeoJSON feature collection for stops
            stopsGeoJSON.features = validStopsData.map(stop => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: stop.coordinates
              },
              properties: {
                title: stop.stopName,
                description: `${stop.expectedArrivalTime}`
              }
            }));

            // Update GeoJSON source for stops
            map.current.getSource('route-stops-live').setData(stopsGeoJSON);

            // Update the route stops div
            updateRouteStopsDiv(validStopsData);

          } catch (error) {
            console.error('Error updating route:', error);
          }
        }, 10000); // Update every 10 seconds

      } else {
        console.error('No matching route shapes found for routeId:', routeId, 'and routeDirection:', routeDirection);
      }
    } catch (error) {
      console.error('Error fetching or adding route-shape layer:', error);
    }

    // Add the close button if it doesn't exist
    if (!document.querySelector('.close-route-button')) {
      const closeButton = document.createElement('button');
      closeButton.innerHTML = `<img src="${process.env.PUBLIC_URL}/icons/hide.png" alt="Piilota" class="hide-icon" /> reitti`;
      closeButton.classList.add('close-route-button');
      document.body.appendChild(closeButton);

      closeButton.addEventListener('click', () => {
        clearInterval(routeUpdateInterval); // Stop updating route
        removeRoute(); // Remove route when close button is clicked
        closeButton.remove();
        document.getElementById('route-stops-container').style.display = 'none'; // Hide the route stops div
      });
    }

    // Create the route stops div if it doesn't exist
    if (!document.getElementById('route-stops-container')) {
      const routeStopsContainer = document.createElement('div');
      routeStopsContainer.id = 'route-stops-container';
      document.body.appendChild(routeStopsContainer);
    }

    // Update the route stops div with the initial data
    updateRouteStopsDiv(validStopsData);

  } catch (error) {
    console.error('Error fetching vehicle data:', error);
  } finally {
    if (loadingMessage) {
      loadingMessage.style.display = 'none'; // Hide the loading message
    }
  }
};

// Function to update the route stops div with the stop data
const updateRouteStopsDiv = (stopsData) => {
  const routeStopsContainer = document.getElementById('route-stops-container');
  routeStopsContainer.innerHTML = ''; // Clear existing content

  const stopsList = document.createElement('div');
  stopsList.classList.add('stops-list');

  stopsData.forEach(stop => {
    const stopItem = document.createElement('div');
    stopItem.classList.add('stop-item');

    const stopName = document.createElement('div');
    stopName.classList.add('stop-name');
    stopName.innerText = stop.stopName;

    const stopTime = document.createElement('div');
    stopTime.classList.add('stop-time');
    stopTime.innerText = "~ " + stop.expectedArrivalTime;

    stopItem.appendChild(stopName);
    stopItem.appendChild(stopTime);
    stopsList.appendChild(stopItem);
  });

  routeStopsContainer.appendChild(stopsList);
};




export default showRoute;

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
              
            }
          });

          const initialUpdate = () => updateVehicleLocations(map, popup);
          initialUpdate();
          const interval = setInterval(initialUpdate, updateInterval);

          return () => {
            clearInterval(interval);
          };
        });
      });
    }
  }, [stopsData]);

  return <div className="map-container" ref={mapContainer} />;
};

export default Map;

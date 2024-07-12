import mapboxgl from 'mapbox-gl';
import zonesGeoJSON from './zones.geojson';

export const loadZones = (map) => {

  const addZones = () => {
    fetch(zonesGeoJSON)
      .then(response => response.json())
      .then(data => {

        map.addSource('zones', {
          type: 'geojson',
          data: data
        });

        map.addLayer({
          id: 'zone-layer',
          type: 'line',
          source: 'zones',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#cdeafc',
            'line-width': 1.0,
            'line-dasharray': [1, 3, 3, 3]
          }
        });

        // Add labels along the zone lines
        map.addLayer({
          id: 'zone-labels',
          type: 'symbol',
          source: 'zones',
          layout: {
            'text-field': '{ZONE}',
            'text-font': ['Open Sans Regular'],
            'text-size': 12,
            'symbol-placement': 'line',
            'text-keep-upright': true,
            'text-rotation-alignment': 'map',
            'text-allow-overlap': true,
            'text-anchor': 'center',
            'text-offset': [0, -0.5],
            'symbol-spacing': 200
          },
          paint: {
            'text-color': 'white',
            'text-halo-color': 'black',
            'text-halo-width': 10
          }
        });

      })
      .catch(error => {
        console.error('Error loading zones data:', error);
      });
  };

  addZones();
};

export default loadZones;

/**
 * MapView Component - OpenStreetMap/Leaflet Implementation
 * Base map component with user location marker and route support
 */

import React, {
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {Coordinates, MapBounds} from '../../types/models';
import {DEFAULT_LOCATION} from '../../utils/constants';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Camera {
  center?: Coordinates;
  heading?: number;
  pitch?: number;
  zoom?: number;
}

export interface MapViewProps {
  userPosition?: Coordinates | null;
  showUserMarker?: boolean;
  followUser?: boolean;
  isNavigating?: boolean;
  userHeading?: number;
  compassMode?: boolean;
  destination?: Coordinates | null;
  routeCoordinates?: Coordinates[];
  occurrences?: Array<{
    id: string;
    location: Coordinates;
    crimeType: string;
    severity: string;
  }>;
  tapToSelectEnabled?: boolean;
  onMapTap?: (coordinates: Coordinates) => void;
  onLongPress?: (coordinates: Coordinates) => void;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region, bounds: MapBounds) => void;
  onMapReady?: () => void;
  onCompassModeChange?: (enabled: boolean) => void;
  children?: React.ReactNode;
  style?: any;
}

export interface MapViewRef {
  animateToCoordinate: (coordinate: Coordinates, duration?: number) => void;
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (coordinates: Coordinates[], options?: any) => void;
  getMapBounds: () => Promise<MapBounds>;
  setCamera: (camera: Partial<Camera>) => void;
  drawRoute: (coordinates: Coordinates[]) => void;
  clearRoute: () => void;
  setDestinationMarker: (coordinate: Coordinates | null) => void;
  setOccurrenceMarkers: (occurrences: Array<{id: string; location: Coordinates; crimeType: string; severity: string}>) => void;
  enableTapToSelect: (enable: boolean) => void;
  setSelectedLocation: (coordinate: Coordinates | null) => void;
  clearSelectedLocation: () => void;
  setNavigationMode: (enabled: boolean) => void;
  setHeading: (heading: number) => void;
  setCompassMode: (enabled: boolean) => void;
}

const DEFAULT_ZOOM = 15;

const generateMapHTML = (initialLat?: number, initialLng?: number) => {
  const lat = initialLat || 0;
  const lng = initialLng || 0;
  const hasValidInitial = lat !== 0 && lng !== 0;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map-container {
      width: 100%; height: 100%;
      position: relative;
    }
    #map { width: 100%; height: 100%; touch-action: manipulation; }
    .user-marker {
      width: 20px; height: 20px;
      background: #4285F4; border: 3px solid white;
      border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .user-marker-navigation {
      width: 40px !important;
      height: 40px !important;
      background: #FF4444 !important;
      border: 4px solid white !important;
      border-radius: 50% !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6) !important;
      position: relative !important;
      z-index: 1000 !important;
    }
    .user-marker-navigation::after {
      content: '●' !important;
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      color: white !important;
      font-size: 24px !important;
      font-weight: bold !important;
      line-height: 1 !important;
    }
    .destination-marker {
      width: 30px; height: 30px;
      background: #EA4335; border: 3px solid white;
      border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .selected-marker {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
    .occurrence-marker {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4); font-size: 16px;
    }
    .occurrence-marker.critical { background: #DC2626; }
    .occurrence-marker.high { background: #EA580C; }
    .occurrence-marker.medium { background: #F59E0B; }
    .occurrence-marker.low { background: #10B981; }
    .occurrence-popup { font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 150px; }
    .occurrence-popup .crime-type { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .occurrence-popup .severity { font-size: 12px; color: #666; text-transform: capitalize; }
    /* Compass button */
    .compass-button {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1000;
      transition: background-color 0.2s ease;
      border: none;
      outline: none;
    }
    .compass-button:active {
      transform: scale(0.95);
    }
    .compass-button svg {
      width: 28px;
      height: 28px;
      transition: transform 0.2s ease-out;
    }
    .compass-button.active {
      background: #4285F4;
    }
    .compass-button.active svg path.north {
      fill: white;
    }
    .compass-button.active svg path.south {
      fill: rgba(255,255,255,0.5);
    }
  </style>
</head>
<body>
  <div id="map-container">
    <div id="map"></div>
    <button id="compass-button" class="compass-button" onclick="toggleCompassMode()">
      <svg viewBox="0 0 24 24" fill="none">
        <path class="north" d="M12 2L8 12H16L12 2Z" fill="#EA4335"/>
        <path class="south" d="M12 22L16 12H8L12 22Z" fill="#666"/>
      </svg>
    </button>
  </div>
  <script>
    var compassButton = document.getElementById('compass-button');
    var compassSvg = compassButton.querySelector('svg');
    var isNavigationMode = false;
    var isCompassMode = false;
    var currentHeading = 0;
    
    // Initialize map with rotation support
    var map = L.map('map', {
      center: ${hasValidInitial} ? [${lat}, ${lng}] : [0, 0],
      zoom: ${hasValidInitial} ? 15 : 2,
      zoomControl: false, 
      attributionControl: false,
      rotate: true,
      touchRotate: true,
      rotateControl: false,
      bearing: 0
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    
    var userMarker = null, destinationMarker = null, selectedMarker = null;
    var routePolyline = null, occurrenceMarkers = [];
    var hasCenteredOnUser = ${hasValidInitial};
    
    // Update compass icon rotation when map bearing changes
    map.on('rotate', function(e) {
      var bearing = map.getBearing();
      compassSvg.style.transform = 'rotate(' + bearing + 'deg)';
      
      // Show compass button as active when map is rotated
      if (Math.abs(bearing) > 1) {
        compassButton.classList.add('active');
      } else if (!isCompassMode && !isNavigationMode) {
        compassButton.classList.remove('active');
      }
    });
    
    // Toggle compass mode (rotate map to match heading)
    function toggleCompassMode() {
      if (isNavigationMode) {
        // During navigation, compass button resets to north temporarily
        map.setBearing(0);
        return;
      }
      isCompassMode = !isCompassMode;
      if (isCompassMode) {
        compassButton.classList.add('active');
        setMapRotation(currentHeading);
      } else {
        compassButton.classList.remove('active');
        // Reset map to north
        map.setBearing(0);
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'compassModeChanged', 
        enabled: isCompassMode 
      }));
    }
    
    // Enable compass mode programmatically
    function setCompassMode(enabled) {
      isCompassMode = enabled;
      if (enabled) {
        compassButton.classList.add('active');
        setMapRotation(currentHeading);
      } else if (!isNavigationMode) {
        compassButton.classList.remove('active');
        map.setBearing(0);
      }
    }
    
    function setNavigationMode(enabled) {
      isNavigationMode = enabled;
      if (enabled) {
        compassButton.classList.add('active');
        map.setZoom(17);
        // Update user marker to show navigation marker
        if (userMarker) {
          var pos = userMarker.getLatLng();
          var icon = L.divIcon({ 
            className: '', 
            html: '<div class="user-marker-navigation"></div>', 
            iconSize: [40, 40], 
            iconAnchor: [20, 20] 
          });
          userMarker.setIcon(icon);
        }
        // Apply current heading rotation
        if (currentHeading) {
          setMapRotation(currentHeading);
        }
        // Ensure compass mode is also enabled
        isCompassMode = true;
      } else {
        // Update user marker back to circle
        if (userMarker) {
          var icon = L.divIcon({ 
            className: '', 
            html: '<div class="user-marker"></div>', 
            iconSize: [20, 20], 
            iconAnchor: [10, 10] 
          });
          userMarker.setIcon(icon);
        }
        if (!isCompassMode) {
          compassButton.classList.remove('active');
          map.setBearing(0);
        }
      }
    }
    
    // Rotate map based on heading (bearing) - like Google Maps navigation
    // The map rotates so that the direction you're heading is always UP on screen
    function setMapRotation(heading) {
      currentHeading = heading || 0;
      
      if (!isCompassMode && !isNavigationMode) {
        return;
      }
      
      // Rotate the map so the heading direction points UP
      // If heading is 90 (east), we rotate map by -90 so east points up
      map.setBearing(-currentHeading);
      
      // Update user marker arrow to always point UP (forward direction)
      if (userMarker && isNavigationMode) {
        var markerElement = userMarker.getElement();
        if (markerElement) {
          var arrowDiv = markerElement.querySelector('.user-marker-navigation');
          if (arrowDiv) {
            // Arrow should always point UP on screen (no rotation needed since map rotates)
            arrowDiv.style.transform = 'rotate(0deg)';
          }
        }
      }
    }
    
    // Long press detection variables
    var longPressTimer = null;
    var longPressStartPos = null;
    var longPressTriggered = false;
    var LONG_PRESS_DURATION = 700;
    var MOVE_THRESHOLD = 15;
    
    function triggerLongPress(lat, lng) {
      longPressTriggered = true;
      setSelectedLocation(lat, lng);
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'longPress', 
        latitude: lat, 
        longitude: lng 
      }));
    }
    
    function cancelLongPress() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressStartPos = null;
    }
    
    // Use Leaflet's built-in touch events for better compatibility
    map.on('mousedown', function(e) {
      if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length === 1) {
        longPressTriggered = false;
        longPressStartPos = { lat: e.latlng.lat, lng: e.latlng.lng, x: e.containerPoint.x, y: e.containerPoint.y };
        longPressTimer = setTimeout(function() {
          if (longPressStartPos && !longPressTriggered) {
            triggerLongPress(longPressStartPos.lat, longPressStartPos.lng);
          }
        }, LONG_PRESS_DURATION);
      }
    });
    
    map.on('mousemove', function(e) {
      if (longPressTimer && longPressStartPos) {
        var dx = e.containerPoint.x - longPressStartPos.x;
        var dy = e.containerPoint.y - longPressStartPos.y;
        if (Math.sqrt(dx*dx + dy*dy) > MOVE_THRESHOLD) {
          cancelLongPress();
        }
      }
    });
    
    map.on('mouseup', function() { cancelLongPress(); });
    map.on('dragstart', function() { cancelLongPress(); });
    map.on('zoomstart', function() { cancelLongPress(); });
    
    // Fallback: contextmenu event (right-click on desktop, long press on some mobile browsers)
    map.on('contextmenu', function(e) {
      L.DomEvent.preventDefault(e);
      if (!longPressTriggered) {
        triggerLongPress(e.latlng.lat, e.latlng.lng);
      }
    });
    
    // Additional touch event listeners on document for better capture
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        var touch = e.touches[0];
        var mapContainer = document.getElementById('map');
        var rect = mapContainer.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right && 
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          longPressTriggered = false;
          var point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
          var latlng = map.containerPointToLatLng(point);
          longPressStartPos = { lat: latlng.lat, lng: latlng.lng, x: touch.clientX, y: touch.clientY };
          longPressTimer = setTimeout(function() {
            if (longPressStartPos && !longPressTriggered) {
              triggerLongPress(longPressStartPos.lat, longPressStartPos.lng);
            }
          }, LONG_PRESS_DURATION);
        }
      }
    }, { passive: true, capture: true });
    
    document.addEventListener('touchmove', function(e) {
      if (longPressTimer && longPressStartPos && e.touches.length === 1) {
        var dx = e.touches[0].clientX - longPressStartPos.x;
        var dy = e.touches[0].clientY - longPressStartPos.y;
        if (Math.sqrt(dx*dx + dy*dy) > MOVE_THRESHOLD) {
          cancelLongPress();
        }
      }
    }, { passive: true, capture: true });
    
    document.addEventListener('touchend', function() {
      cancelLongPress();
    }, { passive: true, capture: true });
    
    document.addEventListener('touchcancel', function() {
      cancelLongPress();
    }, { passive: true, capture: true });
    
    function setSelectedLocation(lat, lng) {
      if (selectedMarker) { map.removeLayer(selectedMarker); selectedMarker = null; }
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        var icon = L.divIcon({ className: '', html: '<div class="selected-marker">&#x1F4CD;</div>', iconSize: [40, 40], iconAnchor: [20, 40] });
        selectedMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
      }
    }
    
    function clearSelectedLocation() {
      if (selectedMarker) { map.removeLayer(selectedMarker); selectedMarker = null; }
    }
    
    function updateUserPosition(lat, lng, centerMap, heading) {
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return;
      }
      
      if (!map) {
        return;
      }
      
      // Choose marker style based on navigation mode
      var markerClass = isNavigationMode ? 'user-marker-navigation' : 'user-marker';
      var markerSize = isNavigationMode ? [40, 40] : [20, 20];
      var markerAnchor = isNavigationMode ? [20, 20] : [10, 10];
      
      // Create marker HTML - simplified for better visibility
      var markerHtml = '<div class="' + markerClass + '"></div>';
      
      if (userMarker) { 
        userMarker.setLatLng([lat, lng]);
        var icon = L.divIcon({ className: '', html: markerHtml, iconSize: markerSize, iconAnchor: markerAnchor });
        userMarker.setIcon(icon);
      } else {
        var icon = L.divIcon({ className: '', html: markerHtml, iconSize: markerSize, iconAnchor: markerAnchor });
        userMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
      }
      
      // Update heading and rotate map
      if (heading !== undefined && heading !== null && !isNaN(heading)) {
        currentHeading = heading;
        if (isCompassMode || isNavigationMode) {
          setMapRotation(heading);
        }
      }
      
      if (!hasCenteredOnUser || centerMap) { 
        var zoomLevel = isNavigationMode ? 17 : 15;
        map.setView([lat, lng], zoomLevel, { animate: true }); 
        hasCenteredOnUser = true; 
      }
    }
    
    function setDestination(lat, lng) {
      if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        var icon = L.divIcon({ className: '', html: '<div class="destination-marker"></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
        destinationMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
      }
    }
    
    function setOccurrences(occs) {
      occurrenceMarkers.forEach(function(m) { map.removeLayer(m); });
      occurrenceMarkers = [];
      if (!occs || !Array.isArray(occs)) { return; }
      occs.forEach(function(occ) {
        if (!occ.lat || !occ.lng || isNaN(occ.lat) || isNaN(occ.lng)) { return; }
        var iconHtml = '<div class="occurrence-marker ' + (occ.severity || 'medium') + '">&#x26A0;</div>';
        var icon = L.divIcon({ className: '', html: iconHtml, iconSize: [32, 32], iconAnchor: [16, 16] });
        var marker = L.marker([occ.lat, occ.lng], { icon: icon }).addTo(map);
        marker.bindPopup('<div class="occurrence-popup"><div class="crime-type">' + (occ.crimeType || 'Ocorrencia') + '</div><div class="severity">Severidade: ' + (occ.severity || 'media') + '</div></div>');
        occurrenceMarkers.push(marker);
      });
    }
    
    function drawRoute(coords) {
      clearRoute();
      if (!coords || !Array.isArray(coords) || coords.length < 2) {
        return;
      }
      var latLngs = coords.filter(function(c) { 
        return c && typeof c.lat === 'number' && typeof c.lng === 'number' && 
               !isNaN(c.lat) && !isNaN(c.lng); 
      }).map(function(c) { return [c.lat, c.lng]; });
      
      if (latLngs.length < 2) {
        return;
      }
      
      routePolyline = L.polyline(latLngs, { 
        color: '#4285F4', 
        weight: 6, 
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);
      
      // Don't auto-fit bounds during navigation - let user position control the view
      if (!isNavigationMode) {
        map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
      }
    }
    
    function clearRoute() { if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; } }
    
    function animateToCoordinate(lat, lng, zoom) {
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
      map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
    }
    
    function fitBounds(coords) {
      if (!coords || !Array.isArray(coords) || coords.length === 0) return;
      var valid = coords.filter(function(c) { return c && typeof c.lat === 'number' && typeof c.lng === 'number'; });
      if (valid.length === 0) return;
      var bounds = L.latLngBounds(valid.map(function(c) { return [c.lat, c.lng]; }));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    function sendRegionChange() {
      var center = map.getCenter(), bounds = map.getBounds(), zoom = map.getZoom();
      var delta = 360 / Math.pow(2, zoom) / 10;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'regionChange',
        region: { latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta },
        bounds: { northEast: { latitude: bounds.getNorth(), longitude: bounds.getEast() }, southWest: { latitude: bounds.getSouth(), longitude: bounds.getWest() } }
      }));
    }
    
    map.on('moveend', sendRegionChange);
    map.on('zoomend', sendRegionChange);
    
    setTimeout(function() { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' })); }, 500);
  </script>
</body>
</html>`;
};


export const MapView = forwardRef<MapViewRef, MapViewProps>(
  (
    {
      userPosition,
      showUserMarker = true,
      followUser = false,
      isNavigating = false,
      userHeading = 0,
      compassMode = false,
      destination,
      routeCoordinates,
      occurrences,
      tapToSelectEnabled = false,
      onMapTap,
      onLongPress,
      onRegionChange,
      onRegionChangeComplete,
      onMapReady,
      onCompassModeChange,
      style,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const currentBoundsRef = useRef<MapBounds | null>(null);
    const hasInitializedRef = useRef(false);
    const pendingPositionRef = useRef<Coordinates | null>(null);
    const lastNavigationModeRef = useRef(false);
    
    const mapHTML = React.useMemo(() => {
      const lat = userPosition?.latitude;
      const lng = userPosition?.longitude;
      return generateMapHTML(lat, lng);
    }, []);

    const injectJS = useCallback((js: string) => {
      webViewRef.current?.injectJavaScript(`try { ${js} } catch(e) { console.warn('MapView JS error:', e); } true;`);
    }, []);

    useImperativeHandle(ref, () => ({
      animateToCoordinate: (coordinate: Coordinates) => {
        if (coordinate?.latitude && coordinate?.longitude) {
          injectJS(`animateToCoordinate(${coordinate.latitude}, ${coordinate.longitude}, ${DEFAULT_ZOOM})`);
        }
      },
      animateToRegion: (region: Region) => {
        if (region?.latitude && region?.longitude) {
          const zoom = Math.log2(360 / region.latitudeDelta) - 1;
          injectJS(`animateToCoordinate(${region.latitude}, ${region.longitude}, ${Math.min(zoom, 18)})`);
        }
      },
      fitToCoordinates: (coordinates: Coordinates[]) => {
        if (coordinates?.length > 0) {
          const coords = coordinates.filter(c => c?.latitude && c?.longitude).map(c => ({lat: c.latitude, lng: c.longitude}));
          if (coords.length > 0) injectJS(`fitBounds(${JSON.stringify(coords)})`);
        }
      },
      getMapBounds: async (): Promise<MapBounds> => {
        return currentBoundsRef.current || {
          northEast: {latitude: DEFAULT_LOCATION.latitude + 0.01, longitude: DEFAULT_LOCATION.longitude + 0.01},
          southWest: {latitude: DEFAULT_LOCATION.latitude - 0.01, longitude: DEFAULT_LOCATION.longitude - 0.01},
        };
      },
      setCamera: (camera: Partial<Camera>) => {
        if (camera.center?.latitude && camera.center?.longitude) {
          injectJS(`animateToCoordinate(${camera.center.latitude}, ${camera.center.longitude}, ${camera.zoom || DEFAULT_ZOOM})`);
        }
      },
      drawRoute: (coordinates: Coordinates[]) => {
        if (coordinates?.length > 0) {
          const coords = coordinates.filter(c => c?.latitude && c?.longitude).map(c => ({lat: c.latitude, lng: c.longitude}));
          if (coords.length > 0) injectJS(`drawRoute(${JSON.stringify(coords)})`);
        }
      },
      clearRoute: () => injectJS('clearRoute()'),
      setDestinationMarker: (coordinate: Coordinates | null) => {
        if (coordinate?.latitude && coordinate?.longitude) {
          injectJS(`setDestination(${coordinate.latitude}, ${coordinate.longitude})`);
        } else {
          injectJS('setDestination(null, null)');
        }
      },
      setOccurrenceMarkers: (occs: Array<{id: string; location: Coordinates; crimeType: string; severity: string}>) => {
        const markers = occs.filter(o => o?.location?.latitude && o?.location?.longitude).map(o => ({
          id: o.id, lat: o.location.latitude, lng: o.location.longitude, crimeType: o.crimeType, severity: o.severity,
        }));
        injectJS(`setOccurrences(${JSON.stringify(markers)})`);
      },
      enableTapToSelect: (enable: boolean) => injectJS(`tapToSelectEnabled = ${enable}`),
      setSelectedLocation: (coordinate: Coordinates | null) => {
        if (coordinate?.latitude && coordinate?.longitude) {
          injectJS(`setSelectedLocation(${coordinate.latitude}, ${coordinate.longitude})`);
        } else {
          injectJS('clearSelectedLocation()');
        }
      },
      clearSelectedLocation: () => injectJS('clearSelectedLocation()'),
      setNavigationMode: (enabled: boolean) => injectJS(`setNavigationMode(${enabled})`),
      setHeading: (heading: number) => injectJS(`setMapRotation(${heading})`),
      setCompassMode: (enabled: boolean) => injectJS(`setCompassMode(${enabled})`),
    }));

    useEffect(() => {
      if (!userPosition?.latitude || !userPosition?.longitude) {
        // FALLBACK: Se não tem posição real, criar marcador de teste em São Paulo (apenas uma vez)
        if (isMapReady && showUserMarker && !hasInitializedRef.current) {
          hasInitializedRef.current = true;
          const fallbackCommand = `
            if (map && !userMarker) {
              var fallbackIcon = L.divIcon({ 
                className: '', 
                html: '<div style="width:25px;height:25px;background:#FFA500;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>', 
                iconSize: [25, 25], 
                iconAnchor: [12, 12] 
              });
              userMarker = L.marker([-23.5505, -46.6333], { icon: fallbackIcon }).addTo(map);
              map.setView([-23.5505, -46.6333], 15, { animate: true });
            }
          `;
          setTimeout(() => injectJS(fallbackCommand), 1000);
        }
        return;
      }
      
      if (!isMapReady) { 
        pendingPositionRef.current = userPosition; 
        return; 
      }
      
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        const command = `updateUserPosition(${userPosition.latitude}, ${userPosition.longitude}, true, ${userHeading || 0})`;
        injectJS(command);
      } else if (showUserMarker) {
        const command = `updateUserPosition(${userPosition.latitude}, ${userPosition.longitude}, false, ${userHeading || 0})`;
        injectJS(command);
      }
    }, [isMapReady, userPosition, showUserMarker, userHeading, injectJS]);

    useEffect(() => {
      if (isMapReady && pendingPositionRef.current && !hasInitializedRef.current) {
        const pos = pendingPositionRef.current;
        hasInitializedRef.current = true;
        injectJS(`updateUserPosition(${pos.latitude}, ${pos.longitude}, true)`);
        pendingPositionRef.current = null;
      }
    }, [isMapReady, injectJS]);

    // Enable/disable navigation mode (3D perspective)
    useEffect(() => {
      if (isMapReady && isNavigating !== lastNavigationModeRef.current) {
        lastNavigationModeRef.current = isNavigating;
        injectJS(`setNavigationMode(${isNavigating})`);
      }
    }, [isMapReady, isNavigating, injectJS]);

    // Sync compass mode from prop
    useEffect(() => {
      if (isMapReady) {
        injectJS(`setCompassMode(${compassMode})`);
      }
    }, [isMapReady, compassMode, injectJS]);

    // Update map rotation based on user heading
    useEffect(() => {
      if (isMapReady && userHeading !== undefined && (isNavigating || compassMode)) {
        injectJS(`setMapRotation(${userHeading})`);
      }
    }, [isMapReady, userHeading, isNavigating, compassMode, injectJS]);

    useEffect(() => {
      if (isMapReady && followUser && userPosition?.latitude && userPosition?.longitude) {
        const zoom = isNavigating ? 17 : DEFAULT_ZOOM;
        injectJS(`animateToCoordinate(${userPosition.latitude}, ${userPosition.longitude}, ${zoom})`);
      }
    }, [isMapReady, followUser, userPosition, isNavigating, injectJS]);

    useEffect(() => {
      if (isMapReady && destination?.latitude && destination?.longitude) {
        injectJS(`setDestination(${destination.latitude}, ${destination.longitude})`);
      }
    }, [isMapReady, destination, injectJS]);

    useEffect(() => {
      if (isMapReady && routeCoordinates && routeCoordinates.length > 0) {
        const coords = routeCoordinates.filter(c => c?.latitude && c?.longitude).map(c => ({lat: c.latitude, lng: c.longitude}));
        if (coords.length > 0) injectJS(`drawRoute(${JSON.stringify(coords)})`);
      }
    }, [isMapReady, routeCoordinates, injectJS]);

    useEffect(() => {
      if (!isMapReady || !occurrences) return;
      
      // Small delay to ensure WebView has processed mapReady
      const timer = setTimeout(() => {
        const markers = occurrences.filter(o => o?.location?.latitude && o?.location?.longitude).map(o => ({
          id: o.id, lat: o.location.latitude, lng: o.location.longitude, crimeType: o.crimeType, severity: o.severity,
        }));
        injectJS(`setOccurrences(${JSON.stringify(markers)})`);
      }, 100);
      
      return () => clearTimeout(timer);
    }, [isMapReady, occurrences, injectJS]);

    const handleMessage = useCallback((event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'mapReady') { setIsMapReady(true); onMapReady?.(); }
        else if (data.type === 'regionChange') {
          if (data.bounds) currentBoundsRef.current = data.bounds;
          onRegionChange?.(data.region);
          onRegionChangeComplete?.(data.region, data.bounds);
        }
        else if (data.type === 'mapTap') { onMapTap?.({ latitude: data.latitude, longitude: data.longitude }); }
        else if (data.type === 'longPress') { onLongPress?.({ latitude: data.latitude, longitude: data.longitude }); }
        else if (data.type === 'compassModeChanged') { onCompassModeChange?.(data.enabled); }
      } catch (e) { console.warn('MapView message parse error:', e); }
    }, [onMapReady, onRegionChange, onRegionChangeComplete, onMapTap, onLongPress, onCompassModeChange]);

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{html: mapHTML}}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
        />
      </View>
    );
  },
);

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});

export default MapView;

/**
 * Script de Debug para Marcador de Posição
 * Execute este script no console do app para diagnosticar o problema
 */

// 1. Verificar se o hook useLocation está funcionando
console.log('=== DEBUG MARCADOR DE POSIÇÃO ===');

// 2. Verificar permissões
import { check, PERMISSIONS } from 'react-native-permissions';
import { Platform } from 'react-native';

const checkLocationPermission = async () => {
  const permission = Platform.OS === 'ios' 
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  
  const result = await check(permission);
  console.log('📍 Permissão de localização:', result);
  return result;
};

// 3. Verificar se o GPS está obtendo coordenadas
import Geolocation from '@react-native-community/geolocation';

const testGPS = () => {
  console.log('🛰️ Testando GPS...');
  
  Geolocation.getCurrentPosition(
    (position) => {
      console.log('✅ GPS funcionando:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    },
    (error) => {
      console.log('❌ Erro no GPS:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    }
  );
};

// 4. Verificar se o WebView está recebendo os comandos
const testWebViewInjection = (mapRef) => {
  if (!mapRef.current) {
    console.log('❌ MapRef não está disponível');
    return;
  }
  
  console.log('🌐 Testando injeção no WebView...');
  
  // Injetar comando de teste
  mapRef.current.injectJS(`
    console.log('WebView: Teste de injeção funcionando');
    console.log('WebView: userMarker existe?', !!userMarker);
    console.log('WebView: map existe?', !!map);
    
    // Forçar criação de marcador de teste
    if (map && !userMarker) {
      console.log('WebView: Criando marcador de teste...');
      var testIcon = L.divIcon({ 
        className: '', 
        html: '<div style="width:30px;height:30px;background:red;border:3px solid white;border-radius:50%;"></div>', 
        iconSize: [30, 30], 
        iconAnchor: [15, 15] 
      });
      userMarker = L.marker([-23.5505, -46.6333], { icon: testIcon }).addTo(map);
      map.setView([-23.5505, -46.6333], 15);
      console.log('WebView: Marcador de teste criado em São Paulo');
    }
  `);
};

// 5. Função principal de debug
export const debugMarker = async (mapRef, coordinates, hasPermission) => {
  console.log('🔍 Iniciando debug do marcador...');
  
  // Verificar permissão
  const permission = await checkLocationPermission();
  console.log('📱 hasPermission do hook:', hasPermission);
  console.log('📱 Permissão real:', permission);
  
  // Verificar coordenadas
  console.log('📍 Coordenadas do hook:', coordinates);
  
  // Testar GPS diretamente
  testGPS();
  
  // Testar WebView
  setTimeout(() => {
    testWebViewInjection(mapRef);
  }, 2000);
  
  // Verificar se o MapView está renderizando
  console.log('🗺️ MapRef atual:', mapRef.current);
  
  return {
    permission,
    coordinates,
    hasPermission,
    mapRef: !!mapRef.current
  };
};
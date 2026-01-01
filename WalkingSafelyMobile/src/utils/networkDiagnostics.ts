/**
 * Network Diagnostics Utility
 * Helps diagnose network connectivity issues
 */

import NetInfo from '@react-native-community/netinfo';
import {API_BASE_URL} from './constants';

export interface NetworkDiagnostics {
  isConnected: boolean;
  connectionType: string;
  apiReachable: boolean;
  latency?: number;
  error?: string;
}

/**
 * Perform comprehensive network diagnostics
 */
export const performNetworkDiagnostics = async (): Promise<NetworkDiagnostics> => {
  try {
    // Check basic connectivity
    const netInfo = await NetInfo.fetch();
    
    const result: NetworkDiagnostics = {
      isConnected: netInfo.isConnected ?? false,
      connectionType: netInfo.type,
      apiReachable: false,
    };

    if (!result.isConnected) {
      result.error = 'Sem conexão com a internet';
      return result;
    }

    // Test API connectivity
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      result.latency = endTime - startTime;
      result.apiReachable = response.ok;
      
      if (!response.ok) {
        result.error = `API retornou status ${response.status}`;
      }
    } catch (apiError: any) {
      result.error = `Não foi possível conectar com a API: ${apiError?.message || 'Erro desconhecido'}`;
    }

    return result;
  } catch (error: any) {
    return {
      isConnected: false,
      connectionType: 'unknown',
      apiReachable: false,
      error: `Erro no diagnóstico: ${error?.message || 'Erro desconhecido'}`,
    };
  }
};

/**
 * Format diagnostics for display
 */
export const formatDiagnostics = (diagnostics: NetworkDiagnostics): string => {
  let report = '🔍 Diagnóstico de Rede\n\n';
  
  report += `📶 Conexão: ${diagnostics.isConnected ? '✅ Conectado' : '❌ Desconectado'}\n`;
  report += `🌐 Tipo: ${diagnostics.connectionType}\n`;
  report += `🖥️ API: ${diagnostics.apiReachable ? '✅ Acessível' : '❌ Inacessível'}\n`;
  
  if (diagnostics.latency) {
    report += `⏱️ Latência: ${diagnostics.latency}ms\n`;
  }
  
  if (diagnostics.error) {
    report += `\n❌ Erro: ${diagnostics.error}`;
  }
  
  return report;
};

/**
 * Get network troubleshooting suggestions
 */
export const getTroubleshootingSuggestions = (diagnostics: NetworkDiagnostics): string[] => {
  const suggestions: string[] = [];
  
  if (!diagnostics.isConnected) {
    suggestions.push('Verifique se o Wi-Fi ou dados móveis estão ativados');
    suggestions.push('Tente se conectar a uma rede diferente');
  } else if (!diagnostics.apiReachable) {
    suggestions.push('Verifique se o servidor está funcionando');
    suggestions.push('Tente novamente em alguns minutos');
    suggestions.push('Verifique se não há bloqueio de firewall');
  } else if (diagnostics.latency && diagnostics.latency > 3000) {
    suggestions.push('Conexão lenta detectada');
    suggestions.push('Tente se aproximar do roteador Wi-Fi');
    suggestions.push('Considere usar dados móveis se disponível');
  }
  
  return suggestions;
};
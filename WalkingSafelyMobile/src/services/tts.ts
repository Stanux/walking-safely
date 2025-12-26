/**
 * Text-to-Speech Service
 * Provides voice navigation instructions
 */

import Tts from 'react-native-tts';

class TTSService {
  private isInitialized = false;
  private isSpeaking = false;
  private queue: string[] = [];

  /**
   * Initialize TTS engine
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set default language to Portuguese (Brazil)
      await Tts.setDefaultLanguage('pt-BR');
      
      // Set speech rate (0.5 = slower, 1.0 = normal, 1.5 = faster)
      await Tts.setDefaultRate(0.5);
      
      // Set pitch (0.5 = lower, 1.0 = normal, 1.5 = higher)
      await Tts.setDefaultPitch(1.0);

      // Event listeners
      Tts.addEventListener('tts-start', () => {
        this.isSpeaking = true;
      });

      Tts.addEventListener('tts-finish', () => {
        this.isSpeaking = false;
        this.processQueue();
      });

      Tts.addEventListener('tts-cancel', () => {
        this.isSpeaking = false;
      });

      this.isInitialized = true;
      console.log('[TTS] Initialized successfully');
    } catch (error) {
      console.error('[TTS] Failed to initialize:', error);
    }
  }

  /**
   * Speak text
   */
  async speak(text: string, interrupt = false): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (interrupt) {
      await this.stop();
      this.queue = [];
    }

    if (this.isSpeaking) {
      this.queue.push(text);
      return;
    }

    try {
      console.log('[TTS] Speaking:', text);
      await Tts.speak(text);
    } catch (error) {
      console.error('[TTS] Failed to speak:', error);
    }
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length > 0 && !this.isSpeaking) {
      const text = this.queue.shift();
      if (text) {
        await this.speak(text);
      }
    }
  }

  /**
   * Stop speaking
   */
  async stop(): Promise<void> {
    try {
      await Tts.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('[TTS] Failed to stop:', error);
    }
  }

  /**
   * Speak navigation instruction
   */
  async speakInstruction(instruction: string, distance: number): Promise<void> {
    const distanceText = this.formatDistance(distance);
    const text = `Em ${distanceText}, ${instruction}`;
    await this.speak(text);
  }

  /**
   * Speak turn instruction based on maneuver type
   */
  async speakManeuver(maneuver: string, distance: number, streetName?: string): Promise<void> {
    const distanceText = this.formatDistance(distance);
    let instruction = '';

    switch (maneuver) {
      case 'turn-left':
        instruction = 'vire à esquerda';
        break;
      case 'turn-right':
        instruction = 'vire à direita';
        break;
      case 'turn-slight-left':
        instruction = 'vire levemente à esquerda';
        break;
      case 'turn-slight-right':
        instruction = 'vire levemente à direita';
        break;
      case 'turn-sharp-left':
        instruction = 'vire acentuadamente à esquerda';
        break;
      case 'turn-sharp-right':
        instruction = 'vire acentuadamente à direita';
        break;
      case 'uturn-left':
      case 'uturn-right':
        instruction = 'faça o retorno';
        break;
      case 'straight':
        instruction = 'siga em frente';
        break;
      case 'merge':
        instruction = 'entre na via';
        break;
      case 'ramp-left':
        instruction = 'pegue a rampa à esquerda';
        break;
      case 'ramp-right':
        instruction = 'pegue a rampa à direita';
        break;
      case 'fork-left':
        instruction = 'mantenha-se à esquerda na bifurcação';
        break;
      case 'fork-right':
        instruction = 'mantenha-se à direita na bifurcação';
        break;
      case 'roundabout-left':
      case 'roundabout-right':
        instruction = 'entre na rotatória';
        break;
      case 'arrive':
        instruction = 'você chegou ao seu destino';
        break;
      case 'depart':
        instruction = 'inicie o percurso';
        break;
      default:
        instruction = 'continue';
    }

    let text = `Em ${distanceText}, ${instruction}`;
    if (streetName && maneuver !== 'arrive') {
      text += ` na ${streetName}`;
    }

    await this.speak(text);
  }

  /**
   * Speak risk alert
   */
  async speakRiskAlert(crimeType: string, distance: number): Promise<void> {
    const distanceText = this.formatDistance(distance);
    const text = `Atenção! Área de risco em ${distanceText}. ${crimeType} reportado nesta região.`;
    await this.speak(text, true); // Interrupt current speech for alerts
  }

  /**
   * Speak arrival
   */
  async speakArrival(): Promise<void> {
    await this.speak('Você chegou ao seu destino.', true);
  }

  /**
   * Speak recalculating
   */
  async speakRecalculating(): Promise<void> {
    await this.speak('Recalculando rota.', true);
  }

  /**
   * Format distance for speech
   */
  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      const km = meters / 1000;
      if (km >= 10) {
        return `${Math.round(km)} quilômetros`;
      }
      return `${km.toFixed(1).replace('.', ',')} quilômetros`;
    }
    
    if (meters >= 100) {
      return `${Math.round(meters / 10) * 10} metros`;
    }
    
    if (meters >= 50) {
      return `${Math.round(meters)} metros`;
    }
    
    return 'alguns metros';
  }

  /**
   * Check if TTS is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const engines = await Tts.engines();
      return engines && engines.length > 0;
    } catch {
      return false;
    }
  }
}

export const ttsService = new TTSService();
export default ttsService;

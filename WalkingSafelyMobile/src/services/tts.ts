/**
 * Text-to-Speech Service
 * Provides voice navigation instructions
 */

import Tts from 'react-native-tts';
import i18n from '../i18n';

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
      // Get current language from i18n
      const currentLanguage = i18n.language;
      
      // Set TTS language based on app language
      let ttsLanguage = 'pt-BR'; // Default
      if (currentLanguage.startsWith('en')) {
        ttsLanguage = 'en-US';
      } else if (currentLanguage.startsWith('es')) {
        ttsLanguage = 'es-ES';
      }
      
      await Tts.setDefaultLanguage(ttsLanguage);
      
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
      console.log('[TTS] Initialized successfully with language:', ttsLanguage);
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
  async speakManeuver(maneuver: string, distance: number, fullInstruction?: string): Promise<void> {
    const distanceText = this.formatDistance(distance);
    let instructionText = '';

    // Extract street name from full instruction if available
    let streetName = '';
    if (fullInstruction) {
      // Try to extract street name from instruction text
      const streetMatch = fullInstruction.match(/(?:na|on|onto|into)\s+(.+?)(?:\s|$|,)/i);
      if (streetMatch) {
        streetName = streetMatch[1].trim();
      }
    }

    // Map maneuver types to Portuguese instructions
    switch (maneuver) {
      case 'turn-left':
        instructionText = streetName ? `vire à esquerda na ${streetName}` : 'vire à esquerda';
        break;
      case 'turn-right':
        instructionText = streetName ? `vire à direita na ${streetName}` : 'vire à direita';
        break;
      case 'turn-slight-left':
        instructionText = streetName ? `mantenha-se à esquerda na ${streetName}` : 'mantenha-se à esquerda';
        break;
      case 'turn-slight-right':
        instructionText = streetName ? `mantenha-se à direita na ${streetName}` : 'mantenha-se à direita';
        break;
      case 'turn-sharp-left':
        instructionText = streetName ? `vire completamente à esquerda na ${streetName}` : 'vire completamente à esquerda';
        break;
      case 'turn-sharp-right':
        instructionText = streetName ? `vire completamente à direita na ${streetName}` : 'vire completamente à direita';
        break;
      case 'uturn-left':
      case 'uturn-right':
      case 'uturn':
        instructionText = 'faça o retorno';
        break;
      case 'straight':
      case 'continue':
        instructionText = streetName ? `continue em frente na ${streetName}` : 'continue em frente';
        break;
      case 'merge':
        instructionText = streetName ? `entre na ${streetName}` : 'entre na via';
        break;
      case 'ramp-left':
        instructionText = 'pegue a saída à esquerda';
        break;
      case 'ramp-right':
        instructionText = 'pegue a saída à direita';
        break;
      case 'fork-left':
        instructionText = 'mantenha-se à esquerda na bifurcação';
        break;
      case 'fork-right':
        instructionText = 'mantenha-se à direita na bifurcação';
        break;
      case 'roundabout-left':
      case 'roundabout-right':
      case 'roundabout':
        instructionText = 'entre na rotatória';
        break;
      case 'arrive':
        instructionText = 'você chegou ao seu destino';
        break;
      case 'depart':
        instructionText = streetName ? `siga pela ${streetName}` : 'inicie a rota';
        break;
      default:
        instructionText = streetName ? `continue na ${streetName}` : 'continue em frente';
    }

    // Format the complete message
    let text = '';
    if (maneuver === 'arrive') {
      text = instructionText;
    } else if (distance <= 10) {
      text = instructionText; // Don't say distance for very close instructions
    } else {
      text = `Em ${distanceText}, ${instructionText}`;
    }

    console.log('[TTS] Speaking:', text);
    await this.speak(text);
  }

  /**
   * Speak risk alert
   */
  async speakRiskAlert(crimeType: string, distance: number): Promise<void> {
    const distanceText = this.formatDistance(distance);
    const text = i18n.t('navigation.instructions.riskAlert', {
      distance: distanceText,
      crimeType: crimeType
    });
    await this.speak(text, true); // Interrupt current speech for alerts
  }

  /**
   * Speak arrival
   */
  async speakArrival(): Promise<void> {
    const text = i18n.t('navigation.instructions.arrive');
    await this.speak(text, true);
  }

  /**
   * Speak recalculating
   */
  async speakRecalculating(): Promise<void> {
    const text = i18n.t('navigation.instructions.recalculating');
    await this.speak(text, true);
  }

  /**
   * Format distance for speech
   */
  private formatDistance(meters: number): string {
    const isPortuguese = i18n.language.startsWith('pt');
    
    if (meters >= 1000) {
      const km = meters / 1000;
      const unit = isPortuguese ? 'quilômetros' : 'kilometers';
      if (km >= 10) {
        return `${Math.round(km)} ${unit}`;
      }
      const formattedKm = isPortuguese ? 
        km.toFixed(1).replace('.', ',') : 
        km.toFixed(1);
      return `${formattedKm} ${unit}`;
    }
    
    const unit = isPortuguese ? 'metros' : 'meters';
    
    if (meters >= 100) {
      return `${Math.round(meters / 10) * 10} ${unit}`;
    }
    
    if (meters >= 50) {
      return `${Math.round(meters)} ${unit}`;
    }
    
    return isPortuguese ? 'alguns metros' : 'a few meters';
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

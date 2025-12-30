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
  async speakManeuver(maneuver: string, distance: number, streetName?: string): Promise<void> {
    const distanceText = this.formatDistance(distance);
    let instructionKey = '';

    // Map maneuver types to translation keys
    switch (maneuver) {
      case 'turn-left':
        instructionKey = 'navigation.instructions.turnLeft';
        break;
      case 'turn-right':
        instructionKey = 'navigation.instructions.turnRight';
        break;
      case 'turn-slight-left':
        instructionKey = 'navigation.instructions.turnSlightLeft';
        break;
      case 'turn-slight-right':
        instructionKey = 'navigation.instructions.turnSlightRight';
        break;
      case 'turn-sharp-left':
        instructionKey = 'navigation.instructions.turnSharpLeft';
        break;
      case 'turn-sharp-right':
        instructionKey = 'navigation.instructions.turnSharpRight';
        break;
      case 'uturn-left':
        instructionKey = 'navigation.instructions.uturnLeft';
        break;
      case 'uturn-right':
        instructionKey = 'navigation.instructions.uturnRight';
        break;
      case 'uturn':
        instructionKey = 'navigation.instructions.uturn';
        break;
      case 'straight':
        instructionKey = 'navigation.instructions.straight';
        break;
      case 'merge':
        instructionKey = 'navigation.instructions.merge';
        break;
      case 'ramp-left':
        instructionKey = 'navigation.instructions.rampLeft';
        break;
      case 'ramp-right':
        instructionKey = 'navigation.instructions.rampRight';
        break;
      case 'fork-left':
        instructionKey = 'navigation.instructions.forkLeft';
        break;
      case 'fork-right':
        instructionKey = 'navigation.instructions.forkRight';
        break;
      case 'roundabout-left':
        instructionKey = 'navigation.instructions.roundaboutLeft';
        break;
      case 'roundabout-right':
        instructionKey = 'navigation.instructions.roundaboutRight';
        break;
      case 'roundabout':
        instructionKey = 'navigation.instructions.roundabout';
        break;
      case 'arrive':
        instructionKey = 'navigation.instructions.arrive';
        break;
      case 'depart':
        instructionKey = 'navigation.instructions.depart';
        break;
      default:
        instructionKey = 'navigation.instructions.continue';
    }

    // Get translated instruction
    const instruction = i18n.t(instructionKey);
    
    // Format the complete message
    let text = '';
    if (maneuver === 'arrive' || maneuver === 'depart') {
      text = instruction;
    } else {
      // Use translated format: "Em {distance}, {instruction}"
      const inText = i18n.language.startsWith('pt') ? 'Em' : 'In';
      text = `${inText} ${distanceText}, ${instruction.toLowerCase()}`;
      
      if (streetName && maneuver !== 'arrive') {
        const onText = i18n.language.startsWith('pt') ? 'na' : 'on';
        text += ` ${onText} ${streetName}`;
      }
    }

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

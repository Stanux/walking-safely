/**
 * Navigation E2E Tests
 * Tests for navigation between screens and tabs
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import {device, element, by, expect, waitFor} from 'detox';
import {
  TestIDs,
  TestCredentials,
  beforeAllTests,
  beforeEachTest,
  waitForElement,
  typeText,
  tapElement,
  loginWithCredentials,
  navigateToTab,
} from './setup';

describe('Navigation', () => {
  beforeAll(async () => {
    await beforeAllTests();
  });

  beforeEach(async () => {
    await beforeEachTest();
    // Login before each test
    await waitFor(element(by.text('Login')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.text('Login')).tap();
    await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);
    await loginWithCredentials(
      TestCredentials.validUser.email,
      TestCredentials.validUser.password,
    );
    await waitFor(element(by.id(TestIDs.MAP_VIEW)))
      .toBeVisible()
      .withTimeout(15000);
  });

  describe('Tab Navigation', () => {
    it('should display bottom tab navigation', async () => {
      // Requirement 16.1: Implement tab navigation at bottom
      await expect(element(by.id(TestIDs.TAB_MAP))).toBeVisible();
      await expect(element(by.id(TestIDs.TAB_STATISTICS))).toBeVisible();
      await expect(element(by.id(TestIDs.TAB_SETTINGS))).toBeVisible();
    });

    it('should navigate to Map tab', async () => {
      // Navigate away first
      await navigateToTab('settings');
      await waitFor(element(by.text('Configurações')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate back to map
      await navigateToTab('map');
      await waitFor(element(by.id(TestIDs.MAP_VIEW)))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Statistics tab', async () => {
      await navigateToTab('statistics');

      // Should show statistics screen
      await waitFor(element(by.text('Estatísticas')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Settings tab', async () => {
      await navigateToTab('settings');

      // Should show settings screen
      await waitFor(element(by.text('Configurações')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should preserve state when navigating between tabs', async () => {
      // Requirement 16.3: Maintain screen state when navigating between tabs
      // Enable heatmap on map
      await tapElement(TestIDs.HEATMAP_TOGGLE_BUTTON);

      // Navigate to settings
      await navigateToTab('settings');
      await waitFor(element(by.text('Configurações')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate back to map
      await navigateToTab('map');
      await waitFor(element(by.id(TestIDs.MAP_VIEW)))
        .toBeVisible()
        .withTimeout(5000);

      // Heatmap should still be enabled
      await expect(element(by.id('heatmap-layer'))).toBeVisible();
    });
  });

  describe('Stack Navigation', () => {
    it('should navigate to route preview and back', async () => {
      // Requirement 16.2: Implement stack navigation for specific flows
      // Search for address
      await tapElement(TestIDs.SEARCH_BAR);
      await typeText(TestIDs.SEARCH_BAR, 'Avenida Paulista');

      await waitFor(element(by.text('Avenida Paulista')).atIndex(0))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.text('Avenida Paulista')).atIndex(0).tap();

      // Should navigate to route preview
      await waitFor(element(by.id(TestIDs.ROUTE_PREVIEW_MAP)))
        .toBeVisible()
        .withTimeout(10000);

      // Go back
      await element(by.text('←')).tap();

      // Should return to map
      await waitFor(element(by.id(TestIDs.MAP_VIEW)))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to occurrence report and back', async () => {
      // Navigate to report occurrence
      await tapElement(TestIDs.REPORT_OCCURRENCE_BUTTON);

      await waitFor(element(by.text('Reportar Ocorrência')))
        .toBeVisible()
        .withTimeout(5000);

      // Go back
      await element(by.text('←')).tap();

      // Should return to map
      await waitFor(element(by.id(TestIDs.MAP_VIEW)))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Settings Navigation', () => {
    beforeEach(async () => {
      await navigateToTab('settings');
      await waitFor(element(by.text('Configurações')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Alert Preferences', async () => {
      await tapElement(TestIDs.SETTINGS_ALERTS);

      await waitFor(element(by.text('Preferências de Alerta')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Language Settings', async () => {
      await tapElement(TestIDs.SETTINGS_LANGUAGE);

      await waitFor(element(by.text('Idioma')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Privacy Settings', async () => {
      await tapElement(TestIDs.SETTINGS_PRIVACY);

      await waitFor(element(by.text('Privacidade')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate back from settings sub-screens', async () => {
      // Navigate to alerts
      await tapElement(TestIDs.SETTINGS_ALERTS);
      await waitFor(element(by.text('Preferências de Alerta')))
        .toBeVisible()
        .withTimeout(5000);

      // Go back
      await element(by.text('←')).tap();

      // Should return to settings
      await waitFor(element(by.text('Configurações')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Header Navigation', () => {
    it('should display header with title', async () => {
      // Requirement 16.5: Display header with current screen title
      await navigateToTab('settings');

      await expect(element(by.text('Configurações'))).toBeVisible();
    });

    it('should display back button on stack screens', async () => {
      // Requirement 16.5: Display back button when appropriate
      await tapElement(TestIDs.REPORT_OCCURRENCE_BUTTON);

      await waitFor(element(by.text('Reportar Ocorrência')))
        .toBeVisible()
        .withTimeout(5000);

      // Back button should be visible
      await expect(element(by.text('←'))).toBeVisible();
    });
  });

  describe('Gesture Navigation', () => {
    it('should support swipe back gesture on iOS', async () => {
      // Requirement 16.4: Support navigation gestures (swipe back on iOS)
      if (device.getPlatform() === 'ios') {
        // Navigate to a stack screen
        await tapElement(TestIDs.REPORT_OCCURRENCE_BUTTON);
        await waitFor(element(by.text('Reportar Ocorrência')))
          .toBeVisible()
          .withTimeout(5000);

        // Swipe from left edge to go back
        await element(by.id('report-occurrence-screen')).swipe('right', 'fast');

        // Should return to map
        await waitFor(element(by.id(TestIDs.MAP_VIEW)))
          .toBeVisible()
          .withTimeout(5000);
      }
    });
  });

  describe('Deep Linking', () => {
    it('should handle deep link to map screen', async () => {
      // Test deep linking functionality
      await device.openURL({
        url: 'walkingsafely://map',
      });

      await waitFor(element(by.id(TestIDs.MAP_VIEW)))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle deep link to settings screen', async () => {
      await device.openURL({
        url: 'walkingsafely://settings',
      });

      await waitFor(element(by.text('Configurações')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});

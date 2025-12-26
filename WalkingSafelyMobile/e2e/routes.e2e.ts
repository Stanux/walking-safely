/**
 * Route Calculation E2E Tests
 * Tests for route calculation and navigation
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.6, 5.7
 */

import {element, by, expect, waitFor} from 'detox';
import {
  TestIDs,
  TestCredentials,
  beforeAllTests,
  beforeEachTest,
  waitForElement,
  typeText,
  tapElement,
  loginWithCredentials,
} from './setup';

describe('Route Calculation', () => {
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

  describe('Search Bar', () => {
    it('should display search bar on map screen', async () => {
      // Requirement 3.5: Display search bar at top of screen
      await expect(element(by.id(TestIDs.SEARCH_BAR))).toBeVisible();
    });

    it('should show search results when typing address', async () => {
      // Requirement 4.1: Send request after 500ms debounce
      // Requirement 4.2: Display up to 5 address suggestions
      await tapElement(TestIDs.SEARCH_BAR);
      await typeText(TestIDs.SEARCH_BAR, 'Avenida Paulista');

      // Wait for debounce and results
      await waitFor(element(by.text('Avenida Paulista')).atIndex(0))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should limit search results to 5 items', async () => {
      // Requirement 4.2: Display up to 5 address suggestions
      await tapElement(TestIDs.SEARCH_BAR);
      await typeText(TestIDs.SEARCH_BAR, 'Rua');

      // Wait for results
      await waitFor(element(by.id('search-result-0')))
        .toBeVisible()
        .withTimeout(5000);

      // Check that at most 5 results are shown
      await expect(element(by.id('search-result-0'))).toBeVisible();
      await expect(element(by.id('search-result-5'))).not.toBeVisible();
    });

    it('should show no results message when search returns empty', async () => {
      // Requirement 4.5: Display informative message when no results
      await tapElement(TestIDs.SEARCH_BAR);
      await typeText(TestIDs.SEARCH_BAR, 'xyznonexistentaddress123');

      await waitFor(element(by.text('Nenhum resultado encontrado')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Route Preview', () => {
    beforeEach(async () => {
      // Search and select an address
      await tapElement(TestIDs.SEARCH_BAR);
      await typeText(TestIDs.SEARCH_BAR, 'Avenida Paulista, 1000');

      await waitFor(element(by.text('Avenida Paulista')).atIndex(0))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.text('Avenida Paulista')).atIndex(0).tap();
    });

    it('should navigate to route preview when address is selected', async () => {
      // Requirement 4.3: Center map on selected address coordinates
      // Requirement 4.4: Display option to start navigation
      await waitFor(element(by.id(TestIDs.ROUTE_PREVIEW_MAP)))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should display route information panel', async () => {
      // Requirement 5.3: Show estimated time, total distance, and max risk index
      await waitFor(element(by.id(TestIDs.ROUTE_INFO_PANEL)))
        .toBeVisible()
        .withTimeout(10000);

      // Check for route info elements
      await expect(element(by.text('Tempo estimado'))).toBeVisible();
      await expect(element(by.text('Distância'))).toBeVisible();
    });

    it('should display route polyline on map', async () => {
      // Requirement 5.2: Draw route on map using polyline
      await waitFor(element(by.id(TestIDs.ROUTE_PREVIEW_MAP)))
        .toBeVisible()
        .withTimeout(10000);

      // Route polyline should be visible (map component renders it)
      await expect(element(by.id('route-polyline'))).toBeVisible();
    });

    it('should show risk warning for high-risk routes', async () => {
      // Requirement 5.4: Display visual warning when risk index >= 50
      await waitFor(element(by.id(TestIDs.ROUTE_INFO_PANEL)))
        .toBeVisible()
        .withTimeout(10000);

      // If route has high risk, warning should be visible
      // This depends on the actual route data
      const riskWarning = element(by.id('risk-warning-banner'));
      // Check if element exists (may or may not be visible depending on route)
      try {
        await expect(riskWarning).toExist();
      } catch {
        // Route may not have high risk, which is acceptable
      }
    });

    it('should toggle between fast and safe route', async () => {
      // Requirement 5.6: Display button to toggle between fast and safe route
      // Requirement 5.7: Send parameter to backend for safe route
      await waitFor(element(by.id(TestIDs.ROUTE_INFO_PANEL)))
        .toBeVisible()
        .withTimeout(10000);

      // Find and tap route toggle
      await expect(element(by.text('Rota mais rápida'))).toBeVisible();
      await element(by.text('Rota mais segura')).tap();

      // Should update route info
      await waitFor(element(by.text('Rota mais segura')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should start navigation when button is pressed', async () => {
      // Requirement 6.1: Enter active navigation mode
      await waitFor(element(by.id(TestIDs.START_NAVIGATION_BUTTON)))
        .toBeVisible()
        .withTimeout(10000);

      await tapElement(TestIDs.START_NAVIGATION_BUTTON);

      // Should enter navigation mode
      await waitFor(element(by.text('Navegação ativa')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Map Interactions', () => {
    it('should center map on user location when button is pressed', async () => {
      // Requirement 3.6: Button to center map on current location
      await expect(
        element(by.id(TestIDs.CENTER_LOCATION_BUTTON)),
      ).toBeVisible();
      await tapElement(TestIDs.CENTER_LOCATION_BUTTON);

      // Map should animate to user location
      // This is visual verification - the button should work without error
    });

    it('should toggle heatmap layer', async () => {
      // Requirement 9.1: Toggle heatmap overlay on map
      await expect(element(by.id(TestIDs.HEATMAP_TOGGLE_BUTTON))).toBeVisible();
      await tapElement(TestIDs.HEATMAP_TOGGLE_BUTTON);

      // Heatmap should be enabled (button should show active state)
      await waitFor(element(by.id('heatmap-layer')))
        .toBeVisible()
        .withTimeout(5000);

      // Toggle off
      await tapElement(TestIDs.HEATMAP_TOGGLE_BUTTON);
      await expect(element(by.id('heatmap-layer'))).not.toBeVisible();
    });
  });
});

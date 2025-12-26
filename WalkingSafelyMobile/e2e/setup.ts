/**
 * Detox E2E Test Setup
 * Global setup and utilities for E2E tests
 */

import {device, element, by, waitFor} from 'detox';

/**
 * Test IDs used across the app for E2E testing
 */
export const TestIDs = {
  // Auth screens
  LOGIN_EMAIL_INPUT: 'login-email-input',
  LOGIN_PASSWORD_INPUT: 'login-password-input',
  LOGIN_SUBMIT_BUTTON: 'login-submit-button',
  REGISTER_BUTTON: 'register-button',
  WELCOME_LOGIN_BUTTON: 'welcome-login-button',
  WELCOME_REGISTER_BUTTON: 'welcome-register-button',

  // Map screen
  MAP_VIEW: 'map-view',
  SEARCH_BAR: 'search-bar',
  CENTER_LOCATION_BUTTON: 'center-location-button',
  HEATMAP_TOGGLE_BUTTON: 'heatmap-toggle-button',
  REPORT_OCCURRENCE_BUTTON: 'report-occurrence-button',

  // Route preview
  ROUTE_PREVIEW_MAP: 'route-preview-map',
  START_NAVIGATION_BUTTON: 'start-navigation-button',
  ROUTE_INFO_PANEL: 'route-info-panel',

  // Occurrence reporting
  SUBMIT_OCCURRENCE_BUTTON: 'submit-occurrence-button',
  CRIME_TYPE_SELECTOR: 'crime-type-selector',
  SEVERITY_SELECTOR: 'severity-selector',

  // Navigation tabs
  TAB_MAP: 'tab-map',
  TAB_STATISTICS: 'tab-statistics',
  TAB_SETTINGS: 'tab-settings',

  // Settings
  SETTINGS_ALERTS: 'settings-alerts',
  SETTINGS_LANGUAGE: 'settings-language',
  SETTINGS_PRIVACY: 'settings-privacy',
  LOGOUT_BUTTON: 'logout-button',
};

/**
 * Test user credentials for E2E tests
 */
export const TestCredentials = {
  validUser: {
    email: 'test@walkingsafely.com',
    password: 'TestPassword123!',
  },
  invalidUser: {
    email: 'invalid@test.com',
    password: 'wrongpassword',
  },
};

/**
 * Helper function to wait for element to be visible
 */
export async function waitForElement(
  testID: string,
  timeout: number = 10000,
): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Helper function to tap element by test ID
 */
export async function tapElement(testID: string): Promise<void> {
  await element(by.id(testID)).tap();
}

/**
 * Helper function to type text into input
 */
export async function typeText(testID: string, text: string): Promise<void> {
  await element(by.id(testID)).typeText(text);
}

/**
 * Helper function to clear and type text into input
 */
export async function clearAndTypeText(
  testID: string,
  text: string,
): Promise<void> {
  await element(by.id(testID)).clearText();
  await element(by.id(testID)).typeText(text);
}

/**
 * Helper function to scroll to element
 */
export async function scrollToElement(
  testID: string,
  scrollViewID: string,
  direction: 'up' | 'down' = 'down',
): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id(scrollViewID))
    .scroll(200, direction);
}

/**
 * Helper function to dismiss keyboard
 */
export async function dismissKeyboard(): Promise<void> {
  if (device.getPlatform() === 'ios') {
    await element(by.id('keyboard-dismiss')).tap();
  } else {
    await device.pressBack();
  }
}

/**
 * Helper function to login with credentials
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<void> {
  await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);
  await typeText(TestIDs.LOGIN_EMAIL_INPUT, email);
  await typeText(TestIDs.LOGIN_PASSWORD_INPUT, password);
  await tapElement(TestIDs.LOGIN_SUBMIT_BUTTON);
}

/**
 * Helper function to logout
 */
export async function logout(): Promise<void> {
  await tapElement(TestIDs.TAB_SETTINGS);
  await waitForElement(TestIDs.LOGOUT_BUTTON);
  await tapElement(TestIDs.LOGOUT_BUTTON);
}

/**
 * Helper function to navigate to a tab
 */
export async function navigateToTab(
  tab: 'map' | 'statistics' | 'settings',
): Promise<void> {
  const tabIDs = {
    map: TestIDs.TAB_MAP,
    statistics: TestIDs.TAB_STATISTICS,
    settings: TestIDs.TAB_SETTINGS,
  };
  await tapElement(tabIDs[tab]);
}

/**
 * Before each test hook - relaunch app
 */
export async function beforeEachTest(): Promise<void> {
  await device.reloadReactNative();
}

/**
 * Before all tests hook - launch app
 */
export async function beforeAllTests(): Promise<void> {
  await device.launchApp({
    newInstance: true,
    permissions: {
      location: 'always',
      notifications: 'YES',
    },
  });
}

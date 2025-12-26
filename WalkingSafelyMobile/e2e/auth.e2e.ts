/**
 * Authentication E2E Tests
 * Tests for login flow and authentication
 * Requirements: 2.1, 2.2, 2.3, 2.5
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

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await beforeAllTests();
  });

  beforeEach(async () => {
    await beforeEachTest();
  });

  describe('Welcome Screen', () => {
    it('should display welcome screen with login and register options', async () => {
      // Requirement 2.1: Display welcome screen with login and register options
      await waitFor(element(by.text('Walking Safely')))
        .toBeVisible()
        .withTimeout(10000);

      // Check for login button
      await expect(element(by.text('Login'))).toBeVisible();

      // Check for register button
      await expect(element(by.text('Cadastrar'))).toBeVisible();
    });

    it('should navigate to login screen when login button is tapped', async () => {
      await waitFor(element(by.text('Login')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.text('Login')).tap();

      // Should show login form
      await waitFor(element(by.id(TestIDs.LOGIN_EMAIL_INPUT)))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Login Screen', () => {
    beforeEach(async () => {
      // Navigate to login screen
      await waitFor(element(by.text('Login')))
        .toBeVisible()
        .withTimeout(10000);
      await element(by.text('Login')).tap();
    });

    it('should display login form with email and password fields', async () => {
      // Requirement 2.2: Login form with email and password
      await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);
      await expect(element(by.id(TestIDs.LOGIN_EMAIL_INPUT))).toBeVisible();
      await expect(element(by.id(TestIDs.LOGIN_PASSWORD_INPUT))).toBeVisible();
      await expect(element(by.id(TestIDs.LOGIN_SUBMIT_BUTTON))).toBeVisible();
    });

    it('should show validation error for empty email', async () => {
      await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);

      // Type only password
      await typeText(TestIDs.LOGIN_PASSWORD_INPUT, 'password123');
      await tapElement(TestIDs.LOGIN_SUBMIT_BUTTON);

      // Should show validation error
      await waitFor(element(by.text('Campo obrigatório')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show validation error for invalid email format', async () => {
      await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);

      // Type invalid email
      await typeText(TestIDs.LOGIN_EMAIL_INPUT, 'invalidemail');
      await typeText(TestIDs.LOGIN_PASSWORD_INPUT, 'password123');
      await tapElement(TestIDs.LOGIN_SUBMIT_BUTTON);

      // Should show validation error
      await waitFor(element(by.text('Campo obrigatório')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show error message for invalid credentials', async () => {
      // Requirement 2.3: Display localized error message on login failure
      await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);

      await loginWithCredentials(
        TestCredentials.invalidUser.email,
        TestCredentials.invalidUser.password,
      );

      // Should show error message
      await waitFor(element(by.text('Erro ao fazer login')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should successfully login with valid credentials', async () => {
      // Requirement 2.2: Submit credentials and authenticate
      await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);

      await loginWithCredentials(
        TestCredentials.validUser.email,
        TestCredentials.validUser.password,
      );

      // Should navigate to main screen (map)
      await waitFor(element(by.id(TestIDs.MAP_VIEW)))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should show loading indicator during login', async () => {
      await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);

      await typeText(
        TestIDs.LOGIN_EMAIL_INPUT,
        TestCredentials.validUser.email,
      );
      await typeText(
        TestIDs.LOGIN_PASSWORD_INPUT,
        TestCredentials.validUser.password,
      );
      await tapElement(TestIDs.LOGIN_SUBMIT_BUTTON);

      // Should show loading indicator
      await waitFor(element(by.text('Carregando...')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to register screen', async () => {
      await waitForElement(TestIDs.LOGIN_EMAIL_INPUT);

      // Find and tap register link
      await element(by.text('Cadastrar')).tap();

      // Should navigate to register screen
      await waitFor(element(by.text('Criar Conta')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      // Login first
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

    it('should logout and return to welcome screen', async () => {
      // Requirement 2.5: Logout removes token and redirects to login
      // Navigate to settings
      await tapElement(TestIDs.TAB_SETTINGS);

      // Tap logout
      await waitForElement(TestIDs.LOGOUT_BUTTON);
      await tapElement(TestIDs.LOGOUT_BUTTON);

      // Should return to welcome/login screen
      await waitFor(element(by.text('Walking Safely')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});

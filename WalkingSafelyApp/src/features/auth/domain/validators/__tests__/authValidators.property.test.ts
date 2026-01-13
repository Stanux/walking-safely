/**
 * Property-Based Tests for Auth Validators
 * Feature: walking-safely-app
 *
 * Tests validation functions using property-based testing with fast-check
 */

import fc from 'fast-check';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateName,
} from '../authValidators';

describe('Auth Validators - Property Tests', () => {
  /**
   * Feature: walking-safely-app, Property 1: Validação de Email
   * Validates: Requisitos 7.2, 8.3, 9.2
   *
   * For any string input, validateEmail returns isValid: true iff:
   * - Contains exactly one @
   * - Has at least one character before @
   * - Has at least one . after @
   * - Does not contain spaces
   */
  describe('Property 1: Email Validation', () => {
    it('should validate emails correctly for all inputs', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = validateEmail(input);
          const trimmed = input.trim();

          // Check the conditions for a valid email
          const hasNoSpaces = !trimmed.includes(' ');
          const atCount = (trimmed.match(/@/g) || []).length;
          const hasExactlyOneAt = atCount === 1;

          let hasValidFormat = false;
          if (hasExactlyOneAt && hasNoSpaces && trimmed.length > 0) {
            const parts = trimmed.split('@');
            const hasCharBeforeAt = parts[0].length > 0;
            const hasDotAfterAt = parts[1].includes('.');

            // Check domain parts are not empty
            const domainParts = parts[1].split('.');
            const domainPartsValid = domainParts.every((part) => part.length > 0);

            hasValidFormat = hasCharBeforeAt && hasDotAfterAt && domainPartsValid;
          }

          return result.isValid === hasValidFormat;
        }),
        { numRuns: 100 }
      );
    });

    it('should return isValid: true for valid email formats', () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const result = validateEmail(email);
          return result.isValid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should return isValid: false for strings without @', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.includes('@')),
          (input) => {
            const result = validateEmail(input);
            return result.isValid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: walking-safely-app, Property 2: Validação de Senha
   * Validates: Requisitos 7.3, 8.4
   *
   * For any string input, validatePassword returns isValid: true iff:
   * - String has at least 8 characters
   * - String is not empty
   */
  describe('Property 2: Password Validation', () => {
    it('should validate passwords correctly for all inputs', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = validatePassword(input);
          const isValidLength = input.length >= 8;

          return result.isValid === isValidLength;
        }),
        { numRuns: 100 }
      );
    });

    it('should return isValid: true for passwords with 8+ characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 8 }), (password) => {
          const result = validatePassword(password);
          return result.isValid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should return isValid: false for passwords with less than 8 characters', () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 7 }), (password) => {
          const result = validatePassword(password);
          return result.isValid === false;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: walking-safely-app, Property 3: Confirmação de Senha
   * Validates: Requisito 8.5
   *
   * For any two strings (password and confirmation), validatePasswordConfirmation
   * returns isValid: true iff both strings are exactly equal.
   */
  describe('Property 3: Password Confirmation', () => {
    it('should validate password confirmation correctly for all inputs', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (password, confirmation) => {
          const result = validatePasswordConfirmation(password, confirmation);
          const areEqual = password === confirmation;

          return result.isValid === areEqual;
        }),
        { numRuns: 100 }
      );
    });

    it('should return isValid: true when password and confirmation are identical', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const result = validatePasswordConfirmation(password, password);
          return result.isValid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should return isValid: false when password and confirmation differ', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string().filter((s) => s.length > 0),
          (password, suffix) => {
            // Ensure they are different by appending suffix
            const confirmation = password + suffix;
            const result = validatePasswordConfirmation(password, confirmation);
            return result.isValid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: walking-safely-app, Property 4: Validação de Nome
   * Validates: Requisito 8.2
   *
   * For any string input, validateName returns isValid: true iff:
   * - String (after trim) has at least 2 characters
   */
  describe('Property 4: Name Validation', () => {
    it('should validate names correctly for all inputs', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = validateName(input);
          const trimmed = input.trim();
          const isValidLength = trimmed.length >= 2;

          return result.isValid === isValidLength;
        }),
        { numRuns: 100 }
      );
    });

    it('should return isValid: true for names with 2+ characters after trim', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2 }).filter((s) => s.trim().length >= 2),
          (name) => {
            const result = validateName(name);
            return result.isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return isValid: false for names with less than 2 characters after trim', () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 1 }), (name) => {
          const result = validateName(name);
          return result.isValid === false;
        }),
        { numRuns: 100 }
      );
    });

    it('should trim whitespace before validating', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2 }).filter((s) => s.trim().length >= 2),
          fc.string().filter((s) => /^\s*$/.test(s)),
          (name, whitespace) => {
            // Add whitespace around the name
            const paddedName = whitespace + name + whitespace;
            const result = validateName(paddedName);
            return result.isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

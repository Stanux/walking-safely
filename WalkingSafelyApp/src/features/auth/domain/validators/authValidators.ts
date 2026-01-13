/**
 * Auth Validators
 * Validation functions for authentication forms
 * Requirements: 7.2, 7.3, 8.2, 8.3, 8.4, 8.5
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates email format
 * Property 1: Returns isValid: true iff string contains exactly one @,
 * has at least one character before @, has at least one . after @, and no spaces
 * Requirements: 7.2, 8.3, 9.2
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Email é obrigatório' };
  }

  // Check for spaces
  if (trimmed.includes(' ')) {
    return { isValid: false, error: 'Email não pode conter espaços' };
  }

  // Check for exactly one @
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  const parts = trimmed.split('@');

  // Check for at least one character before @
  if (parts[0].length === 0) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  // Check for at least one . after @
  if (!parts[1].includes('.')) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  // Check that domain part has content before and after the dot
  const domainParts = parts[1].split('.');
  if (domainParts.some((part) => part.length === 0)) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  return { isValid: true };
};


/**
 * Validates password
 * Property 2: Returns isValid: true iff string has at least 8 characters and is not empty
 * Requirements: 7.3, 8.4
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Senha é obrigatória' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
  }

  return { isValid: true };
};

/**
 * Validates password confirmation
 * Property 3: Returns isValid: true iff both strings are exactly equal
 * Requirement: 8.5
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmation: string
): ValidationResult => {
  if (password !== confirmation) {
    return { isValid: false, error: 'Senhas não conferem' };
  }

  return { isValid: true };
};

/**
 * Validates name
 * Property 4: Returns isValid: true iff string (after trim) has at least 2 characters
 * Requirement: 8.2
 */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Nome é obrigatório' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }

  return { isValid: true };
};

/**
 * Validates login form
 * Requirements: 7.2, 7.3
 */
export const validateLoginForm = (
  email: string,
  password: string
): {
  isValid: boolean;
  errors: {
    email?: string;
    password?: string;
  };
} => {
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);

  return {
    isValid: emailResult.isValid && passwordResult.isValid,
    errors: {
      email: emailResult.error,
      password: passwordResult.error,
    },
  };
};

/**
 * Validates register form
 * Requirements: 8.2, 8.3, 8.4, 8.5
 */
export const validateRegisterForm = (
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string
): {
  isValid: boolean;
  errors: {
    name?: string;
    email?: string;
    password?: string;
    passwordConfirmation?: string;
  };
} => {
  const nameResult = validateName(name);
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const confirmResult = validatePasswordConfirmation(password, passwordConfirmation);

  return {
    isValid:
      nameResult.isValid &&
      emailResult.isValid &&
      passwordResult.isValid &&
      confirmResult.isValid,
    errors: {
      name: nameResult.error,
      email: emailResult.error,
      password: passwordResult.error,
      passwordConfirmation: confirmResult.error,
    },
  };
};

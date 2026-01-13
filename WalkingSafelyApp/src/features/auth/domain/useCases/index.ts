/**
 * Auth Use Cases
 * Export all authentication use cases
 *
 * @module features/auth/domain/useCases
 */

export { loginUseCase } from './loginUseCase';
export type { LoginInput, LoginResult } from './loginUseCase';

export { registerUseCase } from './registerUseCase';
export type { RegisterInput, RegisterResult, Locale } from './registerUseCase';

export { forgotPasswordUseCase } from './forgotPasswordUseCase';
export type { ForgotPasswordInput, ForgotPasswordResult } from './forgotPasswordUseCase';

export { logoutUseCase } from './logoutUseCase';
export type { LogoutResult } from './logoutUseCase';

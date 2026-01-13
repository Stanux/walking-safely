<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * Controller for authentication.
 *
 * @see Requirement 16.3 - Secure authentication with two-factor support
 * @see Requirement 16.4 - Account lockout after failed attempts
 */
class AuthController extends Controller
{
    /**
     * Register a new user.
     *
     * @OA\Post(
     *     path="/auth/register",
     *     operationId="register",
     *     tags={"Authentication"},
     *     summary="Registrar novo usuário",
     *     description="Cria uma nova conta de usuário e retorna um token de autenticação",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "email", "password", "password_confirmation"},
     *             @OA\Property(property="name", type="string", maxLength=255, example="João Silva"),
     *             @OA\Property(property="email", type="string", format="email", maxLength=255, example="joao@email.com"),
     *             @OA\Property(property="password", type="string", format="password", minLength=8, example="senha123"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="senha123"),
     *             @OA\Property(property="locale", type="string", enum={"pt_BR", "en", "es"}, example="pt_BR")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Usuário registrado com sucesso",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/User"),
     *             @OA\Property(property="token", type="string", example="1|abc123xyz..."),
     *             @OA\Property(property="token_type", type="string", example="Bearer"),
     *             @OA\Property(property="message", type="string", example="Registro realizado com sucesso")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     )
     * )
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'locale' => $validated['locale'] ?? config('app.locale'),
        ]);

        // Create API token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Log the registration
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'user_registered',
            'target_type' => User::class,
            'target_id' => $user->id,
            'details' => [
                'email' => $user->email,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => new UserResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
            'message' => __('messages.registration_successful'),
        ], 201);
    }

    /**
     * Login a user.
     *
     * @OA\Post(
     *     path="/auth/login",
     *     operationId="login",
     *     tags={"Authentication"},
     *     summary="Autenticar usuário",
     *     description="Autentica um usuário e retorna um token de acesso. Conta é bloqueada após 5 tentativas falhas.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email", "password"},
     *             @OA\Property(property="email", type="string", format="email", example="joao@email.com"),
     *             @OA\Property(property="password", type="string", format="password", example="senha123"),
     *             @OA\Property(property="revoke_existing", type="boolean", example=false, description="Revogar tokens existentes")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Login realizado com sucesso",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/User"),
     *             @OA\Property(property="token", type="string", example="1|abc123xyz..."),
     *             @OA\Property(property="token_type", type="string", example="Bearer"),
     *             @OA\Property(property="message", type="string", example="Login realizado com sucesso")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Credenciais inválidas",
     *         @OA\JsonContent(
     *             @OA\Property(property="error", type="string", example="invalid_credentials"),
     *             @OA\Property(property="message", type="string", example="Credenciais inválidas"),
     *             @OA\Property(property="attempts_remaining", type="integer", example=4)
     *         )
     *     ),
     *     @OA\Response(
     *         response=423,
     *         description="Conta bloqueada",
     *         @OA\JsonContent(
     *             @OA\Property(property="error", type="string", example="account_locked"),
     *             @OA\Property(property="message", type="string", example="Conta bloqueada por 15 minutos"),
     *             @OA\Property(property="locked_until", type="string", format="date-time"),
     *             @OA\Property(property="remaining_seconds", type="integer", example=900)
     *         )
     *     )
     * )
     *
     * @see Requirement 16.4 - Account lockout after failed attempts
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Find user by email
        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return response()->json([
                'error' => 'invalid_credentials',
                'message' => __('messages.invalid_credentials'),
            ], 401);
        }

        // Check if account is locked (Requirement 16.4)
        if ($user->isLocked()) {
            $remainingSeconds = $user->getRemainingLockoutSeconds();
            $remainingMinutes = ceil($remainingSeconds / 60);

            return response()->json([
                'error' => 'account_locked',
                'message' => __('messages.account_locked', ['minutes' => $remainingMinutes]),
                'locked_until' => $user->locked_until->toIso8601String(),
                'remaining_seconds' => $remainingSeconds,
            ], 423);
        }

        // Verify password
        if (!Hash::check($validated['password'], $user->password)) {
            // Increment failed attempts (Requirement 16.4)
            $user->incrementFailedAttempts();

            $attemptsRemaining = User::MAX_FAILED_ATTEMPTS - $user->failed_login_attempts;

            // Log failed attempt
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'login_failed',
                'target_type' => User::class,
                'target_id' => $user->id,
                'details' => [
                    'failed_attempts' => $user->failed_login_attempts,
                    'locked' => $user->isLocked(),
                ],
                'ip_address' => $request->ip(),
            ]);

            if ($user->isLocked()) {
                return response()->json([
                    'error' => 'account_locked',
                    'message' => __('messages.account_locked_after_attempts', [
                        'minutes' => User::LOCKOUT_DURATION_MINUTES,
                    ]),
                    'locked_until' => $user->locked_until->toIso8601String(),
                ], 423);
            }

            return response()->json([
                'error' => 'invalid_credentials',
                'message' => __('messages.invalid_credentials'),
                'attempts_remaining' => max(0, $attemptsRemaining),
            ], 401);
        }

        // Reset failed attempts on successful login
        $user->resetFailedAttempts();

        // Revoke existing tokens if requested
        if ($validated['revoke_existing'] ?? false) {
            $user->tokens()->delete();
        }

        // Create new token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Log successful login
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'login_successful',
            'target_type' => User::class,
            'target_id' => $user->id,
            'details' => [],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => new UserResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
            'message' => __('messages.login_successful'),
        ]);
    }

    /**
     * Logout the current user.
     *
     * @OA\Post(
     *     path="/auth/logout",
     *     operationId="logout",
     *     tags={"Authentication"},
     *     summary="Encerrar sessão",
     *     description="Revoga o token de acesso atual do usuário",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Logout realizado com sucesso",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Logout realizado com sucesso")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Não autenticado",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'unauthorized',
                'message' => __('messages.unauthorized'),
            ], 401);
        }

        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        // Log logout
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'logout',
            'target_type' => User::class,
            'target_id' => $user->id,
            'details' => [],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => __('messages.logout_successful'),
        ]);
    }

    /**
     * Get the current authenticated user.
     *
     * @OA\Get(
     *     path="/auth/me",
     *     operationId="me",
     *     tags={"Authentication"},
     *     summary="Obter usuário atual",
     *     description="Retorna os dados do usuário autenticado",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Dados do usuário",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/User")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Não autenticado",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'unauthorized',
                'message' => __('messages.unauthorized'),
            ], 401);
        }

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }
}

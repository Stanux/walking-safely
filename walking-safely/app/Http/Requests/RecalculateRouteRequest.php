<?php

namespace App\Http\Requests;

use App\Models\NavigationSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request validation for route recalculation.
 *
 * @see Requirement 3.1 - Recalculate route during active navigation
 */
class RecalculateRouteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'session_id' => [
                'required',
                'integer',
                Rule::exists('navigation_sessions', 'id')->where(function ($query) {
                    $query->where('status', NavigationSession::STATUS_ACTIVE);
                }),
            ],
            'current_position' => ['required', 'array'],
            'current_position.latitude' => ['required', 'numeric', 'between:-90,90'],
            'current_position.longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'session_id.required' => __('validation.route.session_id_required'),
            'session_id.exists' => __('validation.route.session_not_found'),
            'current_position.required' => __('validation.route.current_position_required'),
            'current_position.latitude.required' => __('validation.route.latitude_required'),
            'current_position.latitude.between' => __('validation.route.latitude_invalid'),
            'current_position.longitude.required' => __('validation.route.longitude_required'),
            'current_position.longitude.between' => __('validation.route.longitude_invalid'),
        ];
    }
}

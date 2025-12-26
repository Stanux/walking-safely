<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request validation for checking alerts.
 *
 * @see Requirement 6.1 - Check alert conditions
 */
class CheckAlertsRequest extends FormRequest
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
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'speed' => ['sometimes', 'numeric', 'min:0', 'max:300'],
            'upcoming_waypoints' => ['sometimes', 'array', 'max:10'],
            'upcoming_waypoints.*.latitude' => ['required_with:upcoming_waypoints', 'numeric', 'between:-90,90'],
            'upcoming_waypoints.*.longitude' => ['required_with:upcoming_waypoints', 'numeric', 'between:-180,180'],
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
            'latitude.required' => __('validation.alert.latitude_required'),
            'latitude.between' => __('validation.alert.latitude_invalid'),
            'longitude.required' => __('validation.alert.longitude_required'),
            'longitude.between' => __('validation.alert.longitude_invalid'),
            'speed.min' => __('validation.alert.speed_invalid'),
        ];
    }
}

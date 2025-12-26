<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request validation for route calculation.
 *
 * @see Requirement 2.1 - Calculate routes between two points
 */
class CalculateRouteRequest extends FormRequest
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
            'origin' => ['required', 'array'],
            'origin.latitude' => ['required', 'numeric', 'between:-90,90'],
            'origin.longitude' => ['required', 'numeric', 'between:-180,180'],
            'destination' => ['required', 'array'],
            'destination.latitude' => ['required', 'numeric', 'between:-90,90'],
            'destination.longitude' => ['required', 'numeric', 'between:-180,180'],
            'prefer_safe_route' => ['sometimes', 'boolean'],
            'start_navigation' => ['sometimes', 'boolean'],
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
            'origin.required' => __('validation.route.origin_required'),
            'origin.latitude.required' => __('validation.route.origin_latitude_required'),
            'origin.latitude.between' => __('validation.route.latitude_invalid'),
            'origin.longitude.required' => __('validation.route.origin_longitude_required'),
            'origin.longitude.between' => __('validation.route.longitude_invalid'),
            'destination.required' => __('validation.route.destination_required'),
            'destination.latitude.required' => __('validation.route.destination_latitude_required'),
            'destination.latitude.between' => __('validation.route.latitude_invalid'),
            'destination.longitude.required' => __('validation.route.destination_longitude_required'),
            'destination.longitude.between' => __('validation.route.longitude_invalid'),
        ];
    }
}

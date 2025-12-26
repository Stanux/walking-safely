<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request validation for reverse geocoding.
 *
 * @see Requirement 9.2 - Reverse geocode coordinates
 */
class ReverseGeocodeRequest extends FormRequest
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
            'latitude.required' => __('validation.geocode.latitude_required'),
            'latitude.between' => __('validation.geocode.latitude_invalid'),
            'longitude.required' => __('validation.geocode.longitude_required'),
            'longitude.between' => __('validation.geocode.longitude_invalid'),
        ];
    }
}

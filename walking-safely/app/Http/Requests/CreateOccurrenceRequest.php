<?php

namespace App\Http\Requests;

use App\Enums\OccurrenceSeverity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request validation for creating occurrences.
 *
 * @see Requirement 7.1 - Required fields: timestamp, GPS coordinates, crime type, severity
 * @see Requirement 7.2 - Validate location proximity
 */
class CreateOccurrenceRequest extends FormRequest
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
            'crime_type_id' => ['required', 'integer', 'exists:crime_types,id'],
            'severity' => ['required', 'string', Rule::in(OccurrenceSeverity::values())],
            'timestamp' => ['sometimes', 'date'],
            'user_location' => ['required', 'array'],
            'user_location.latitude' => ['required', 'numeric', 'between:-90,90'],
            'user_location.longitude' => ['required', 'numeric', 'between:-180,180'],
            'metadata' => ['sometimes', 'array'],
            'metadata.description' => ['sometimes', 'string', 'max:500'],
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
            'latitude.required' => __('validation.occurrence.latitude_required'),
            'latitude.between' => __('validation.occurrence.latitude_invalid'),
            'longitude.required' => __('validation.occurrence.longitude_required'),
            'longitude.between' => __('validation.occurrence.longitude_invalid'),
            'crime_type_id.required' => __('validation.occurrence.crime_type_required'),
            'crime_type_id.exists' => __('validation.occurrence.crime_type_invalid'),
            'severity.required' => __('validation.occurrence.severity_required'),
            'severity.in' => __('validation.occurrence.severity_invalid'),
            'user_location.required' => __('validation.occurrence.user_location_required'),
            'user_location.latitude.required' => __('validation.occurrence.user_latitude_required'),
            'user_location.longitude.required' => __('validation.occurrence.user_longitude_required'),
        ];
    }
}

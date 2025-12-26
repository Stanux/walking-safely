<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request validation for updating alert preferences.
 *
 * @see Requirement 6.3 - Enable/disable alerts by occurrence type
 * @see Requirement 6.5 - Define specific hours for alert activation
 */
class UpdateAlertPreferencesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'alerts_enabled' => ['sometimes', 'boolean'],
            'enabled_crime_types' => ['sometimes', 'array'],
            'enabled_crime_types.*' => ['integer', 'exists:crime_types,id'],
            'active_hours_start' => ['sometimes', 'nullable', 'date_format:H:i'],
            'active_hours_end' => ['sometimes', 'nullable', 'date_format:H:i'],
            'active_days' => ['sometimes', 'array'],
            'active_days.*' => ['integer', 'between:0,6'],
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
            'enabled_crime_types.*.exists' => __('validation.alert.crime_type_invalid'),
            'active_hours_start.date_format' => __('validation.alert.time_format_invalid'),
            'active_hours_end.date_format' => __('validation.alert.time_format_invalid'),
            'active_days.*.between' => __('validation.alert.day_invalid'),
        ];
    }
}

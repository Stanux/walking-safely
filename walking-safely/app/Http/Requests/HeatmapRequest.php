<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request validation for heatmap data.
 *
 * @see Requirement 10.1 - Heatmap visualization
 * @see Requirement 10.2 - Filter by crime type and time period
 */
class HeatmapRequest extends FormRequest
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
            'min_lat' => ['sometimes', 'numeric', 'between:-90,90'],
            'min_lng' => ['sometimes', 'numeric', 'between:-180,180'],
            'max_lat' => ['sometimes', 'numeric', 'between:-90,90'],
            'max_lng' => ['sometimes', 'numeric', 'between:-180,180'],
            'zoom' => ['sometimes', 'integer', 'between:1,18'],
            'crime_type_id' => ['sometimes', 'integer', 'exists:crime_types,id'],
            'crime_category_id' => ['sometimes', 'integer', 'exists:crime_categories,id'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
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
            'min_lat.between' => __('validation.heatmap.latitude_invalid'),
            'max_lat.between' => __('validation.heatmap.latitude_invalid'),
            'min_lng.between' => __('validation.heatmap.longitude_invalid'),
            'max_lng.between' => __('validation.heatmap.longitude_invalid'),
            'zoom.between' => __('validation.heatmap.zoom_invalid'),
            'crime_type_id.exists' => __('validation.heatmap.crime_type_invalid'),
            'crime_category_id.exists' => __('validation.heatmap.crime_category_invalid'),
            'end_date.after_or_equal' => __('validation.heatmap.date_range_invalid'),
        ];
    }
}

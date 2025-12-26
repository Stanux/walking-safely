<?php

namespace App\Http\Requests;

use App\Services\TimeSeriesService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request validation for time series data.
 *
 * @see Requirement 11.1 - Time series visualization
 * @see Requirement 11.2 - Filter by region and crime type
 * @see Requirement 11.3 - Select temporal granularity
 */
class TimeSeriesRequest extends FormRequest
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
            'region_id' => ['sometimes', 'integer', 'exists:regions,id'],
            'region_ids' => ['sometimes', 'array'],
            'region_ids.*' => ['integer', 'exists:regions,id'],
            'crime_type_id' => ['sometimes', 'integer', 'exists:crime_types,id'],
            'crime_category_id' => ['sometimes', 'integer', 'exists:crime_categories,id'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'granularity' => ['sometimes', 'string', Rule::in(TimeSeriesService::VALID_GRANULARITIES)],
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
            'region_id.exists' => __('validation.timeseries.region_invalid'),
            'region_ids.*.exists' => __('validation.timeseries.region_invalid'),
            'crime_type_id.exists' => __('validation.timeseries.crime_type_invalid'),
            'crime_category_id.exists' => __('validation.timeseries.crime_category_invalid'),
            'end_date.after_or_equal' => __('validation.timeseries.date_range_invalid'),
            'granularity.in' => __('validation.timeseries.granularity_invalid'),
        ];
    }
}

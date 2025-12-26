<?php

namespace App\Http\Requests;

use App\Enums\OccurrenceSeverity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request validation for listing occurrences.
 */
class ListOccurrencesRequest extends FormRequest
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
            'crime_type_id' => ['sometimes', 'integer', 'exists:crime_types,id'],
            'severity' => ['sometimes', 'string', Rule::in(OccurrenceSeverity::values())],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'radius' => ['sometimes', 'numeric', 'min:100', 'max:50000'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}

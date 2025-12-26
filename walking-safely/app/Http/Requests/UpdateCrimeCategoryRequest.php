<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request validation for updating crime categories.
 *
 * @see Requirement 13.2 - Taxonomy versioning
 */
class UpdateCrimeCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAdminPrivileges() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['sometimes', 'nullable', 'integer', 'exists:crime_categories,id'],
            'weight' => ['sometimes', 'numeric', 'min:0', 'max:10'],
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
            'name.required' => __('validation.taxonomy.name_required'),
            'parent_id.exists' => __('validation.taxonomy.parent_invalid'),
            'weight.min' => __('validation.taxonomy.weight_invalid'),
            'weight.max' => __('validation.taxonomy.weight_invalid'),
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request validation for updating translations.
 *
 * @see Requirement 22.3 - Translation management
 */
class UpdateTranslationRequest extends FormRequest
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
            'key' => ['required', 'string', 'max:255'],
            'locale' => ['required', 'string', 'in:pt_BR,en,es'],
            'value' => ['required', 'string'],
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
            'key.required' => __('validation.translation.key_required'),
            'locale.required' => __('validation.translation.locale_required'),
            'locale.in' => __('validation.translation.locale_invalid'),
            'value.required' => __('validation.translation.value_required'),
        ];
    }
}

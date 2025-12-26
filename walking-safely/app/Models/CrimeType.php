<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrimeType extends Model
{
    use HasFactory;
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'category_id',
        'name',
        'description',
    ];

    /**
     * Get the category this crime type belongs to.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(CrimeCategory::class, 'category_id');
    }

    /**
     * Get the translations for this crime type.
     */
    public function translations(): HasMany
    {
        return $this->hasMany(CrimeTypeTranslation::class);
    }

    /**
     * Get the external mappings for this crime type.
     */
    public function externalMappings(): HasMany
    {
        return $this->hasMany(ExternalMapping::class);
    }

    /**
     * Get the localized name for this crime type.
     */
    public function getLocalizedName(string $locale): string
    {
        $translation = $this->translations()
            ->where('locale', $locale)
            ->first();

        if ($translation) {
            return $translation->name;
        }

        // Fallback to default locale (pt_BR)
        $fallbackTranslation = $this->translations()
            ->where('locale', config('app.fallback_locale', 'pt_BR'))
            ->first();

        if ($fallbackTranslation) {
            return $fallbackTranslation->name;
        }

        // Final fallback to the base name
        return $this->name;
    }

    /**
     * Get the localized description for this crime type.
     */
    public function getLocalizedDescription(string $locale): ?string
    {
        $translation = $this->translations()
            ->where('locale', $locale)
            ->first();

        if ($translation && $translation->description) {
            return $translation->description;
        }

        // Fallback to default locale (pt_BR)
        $fallbackTranslation = $this->translations()
            ->where('locale', config('app.fallback_locale', 'pt_BR'))
            ->first();

        if ($fallbackTranslation && $fallbackTranslation->description) {
            return $fallbackTranslation->description;
        }

        // Final fallback to the base description
        return $this->description;
    }

    /**
     * Get the weight from the parent category.
     */
    public function getWeight(): float
    {
        return $this->category?->weight ?? 1.0;
    }

    /**
     * Get the external mapping for a specific source.
     */
    public function getExternalMapping(string $source): ?ExternalMapping
    {
        return $this->externalMappings()
            ->where('source', $source)
            ->first();
    }

    /**
     * Convert the model to an array for serialization.
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

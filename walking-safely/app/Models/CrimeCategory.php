<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrimeCategory extends Model
{
    use HasFactory;
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'parent_id',
        'weight',
        'version',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'weight' => 'float',
            'version' => 'integer',
        ];
    }

    /**
     * Get the parent category.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(CrimeCategory::class, 'parent_id');
    }

    /**
     * Get the child categories.
     */
    public function children(): HasMany
    {
        return $this->hasMany(CrimeCategory::class, 'parent_id');
    }

    /**
     * Get the crime types in this category.
     */
    public function crimeTypes(): HasMany
    {
        return $this->hasMany(CrimeType::class, 'category_id');
    }

    /**
     * Get the translations for this category.
     */
    public function translations(): HasMany
    {
        return $this->hasMany(CrimeCategoryTranslation::class);
    }

    /**
     * Get the version history for this category.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(CrimeCategoryVersion::class);
    }

    /**
     * Get the localized name for this category.
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
     * Check if this category is a root category (has no parent).
     */
    public function isRoot(): bool
    {
        return $this->parent_id === null;
    }

    /**
     * Get all ancestors of this category.
     */
    public function getAncestors(): array
    {
        $ancestors = [];
        $current = $this->parent;

        while ($current !== null) {
            $ancestors[] = $current;
            $current = $current->parent;
        }

        return $ancestors;
    }

    /**
     * Get all descendants of this category.
     */
    public function getDescendants(): array
    {
        $descendants = [];

        foreach ($this->children as $child) {
            $descendants[] = $child;
            $descendants = array_merge($descendants, $child->getDescendants());
        }

        return $descendants;
    }

    /**
     * Check if this category has a cycle in its hierarchy.
     */
    public function hasCycle(): bool
    {
        $visited = [$this->id];
        $current = $this->parent;

        while ($current !== null) {
            if (in_array($current->id, $visited)) {
                return true;
            }
            $visited[] = $current->id;
            $current = $current->parent;
        }

        return false;
    }

    /**
     * Create a new version of this category.
     */
    public function createVersion(?int $updatedBy = null): CrimeCategoryVersion
    {
        return $this->versions()->create([
            'version' => $this->version,
            'name' => $this->name,
            'parent_id' => $this->parent_id,
            'weight' => $this->weight,
            'updated_by' => $updatedBy,
        ]);
    }

    /**
     * Increment the version number.
     */
    public function incrementVersion(): void
    {
        $this->version++;
        $this->save();
    }

    /**
     * Convert the model to an array for serialization.
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'parent_id' => $this->parent_id,
            'weight' => $this->weight,
            'version' => $this->version,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

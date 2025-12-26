<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrimeCategoryVersion extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'crime_category_versions';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'crime_category_id',
        'version',
        'name',
        'parent_id',
        'weight',
        'updated_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'weight' => 'float',
        ];
    }

    /**
     * Get the parent crime category.
     */
    public function crimeCategory(): BelongsTo
    {
        return $this->belongsTo(CrimeCategory::class);
    }

    /**
     * Get the user who created this version.
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

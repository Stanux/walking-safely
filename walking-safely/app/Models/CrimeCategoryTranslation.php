<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrimeCategoryTranslation extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'crime_category_translations';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'crime_category_id',
        'locale',
        'name',
    ];

    /**
     * Get the parent crime category.
     */
    public function crimeCategory(): BelongsTo
    {
        return $this->belongsTo(CrimeCategory::class);
    }
}

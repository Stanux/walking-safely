<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrimeTypeTranslation extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'crime_type_translations';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'crime_type_id',
        'locale',
        'name',
        'description',
    ];

    /**
     * Get the parent crime type.
     */
    public function crimeType(): BelongsTo
    {
        return $this->belongsTo(CrimeType::class);
    }
}

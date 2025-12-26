<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalMapping extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'external_mappings';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'crime_type_id',
        'source',
        'external_code',
        'external_name',
    ];

    /**
     * Get the crime type this mapping belongs to.
     */
    public function crimeType(): BelongsTo
    {
        return $this->belongsTo(CrimeType::class);
    }

    /**
     * Find a crime type by external source and code.
     */
    public static function findCrimeType(string $source, string $externalCode): ?CrimeType
    {
        $mapping = static::where('source', $source)
            ->where('external_code', $externalCode)
            ->first();

        return $mapping?->crimeType;
    }
}

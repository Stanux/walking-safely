<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use MatanYadaev\EloquentSpatial\Objects\Polygon;
use MatanYadaev\EloquentSpatial\Objects\Point;
use MatanYadaev\EloquentSpatial\Traits\HasSpatial;

class Region extends Model
{
    use HasSpatial;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'boundary',
        'parent_id',
        'type',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'boundary' => Polygon::class,
        ];
    }

    /**
     * Get the parent region.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'parent_id');
    }

    /**
     * Get the child regions.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Region::class, 'parent_id');
    }

    /**
     * Get the occurrences in this region.
     */
    public function occurrences(): HasMany
    {
        return $this->hasMany(Occurrence::class);
    }

    /**
     * Get the risk index for this region.
     */
    public function riskIndex(): HasOne
    {
        return $this->hasOne(RiskIndex::class);
    }

    /**
     * Check if a point is within this region's boundary.
     */
    public function containsPoint(Point $point): bool
    {
        return self::query()
            ->where('id', $this->id)
            ->whereContains('boundary', $point)
            ->exists();
    }
}

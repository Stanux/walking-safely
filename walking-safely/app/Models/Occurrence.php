<?php

namespace App\Models;

use App\Enums\OccurrenceSeverity;
use App\Enums\OccurrenceSource;
use App\Enums\OccurrenceStatus;
use App\ValueObjects\Coordinates;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use MatanYadaev\EloquentSpatial\Objects\Point;
use MatanYadaev\EloquentSpatial\Traits\HasSpatial;

class Occurrence extends Model
{
    use HasSpatial;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'timestamp',
        'location',
        'crime_type_id',
        'severity',
        'confidence_score',
        'source',
        'source_id',
        'region_id',
        'status',
        'expires_at',
        'created_by',
        'merged_into_id',
        'metadata',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'location' => Point::class,
            'severity' => OccurrenceSeverity::class,
            'confidence_score' => 'integer',
            'source' => OccurrenceSource::class,
            'status' => OccurrenceStatus::class,
            'expires_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the crime type for this occurrence.
     */
    public function crimeType(): BelongsTo
    {
        return $this->belongsTo(CrimeType::class);
    }

    /**
     * Get the region for this occurrence.
     */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /**
     * Get the user who created this occurrence.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the occurrence this was merged into.
     */
    public function mergedInto(): BelongsTo
    {
        return $this->belongsTo(Occurrence::class, 'merged_into_id');
    }

    /**
     * Get occurrences that were merged into this one.
     */
    public function mergedOccurrences(): HasMany
    {
        return $this->hasMany(Occurrence::class, 'merged_into_id');
    }

    /**
     * Get the validations for this occurrence.
     */
    public function validations(): HasMany
    {
        return $this->hasMany(OccurrenceValidation::class);
    }

    /**
     * Scope to filter by active status.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', OccurrenceStatus::ACTIVE);
    }

    /**
     * Scope to filter by source type.
     */
    public function scopeBySource(Builder $query, OccurrenceSource $source): Builder
    {
        return $query->where('source', $source);
    }

    /**
     * Scope to filter collaborative occurrences.
     */
    public function scopeCollaborative(Builder $query): Builder
    {
        return $query->where('source', OccurrenceSource::COLLABORATIVE);
    }

    /**
     * Scope to filter official occurrences.
     */
    public function scopeOfficial(Builder $query): Builder
    {
        return $query->where('source', OccurrenceSource::OFFICIAL);
    }

    /**
     * Scope to filter by crime type.
     */
    public function scopeByCrimeType(Builder $query, int $crimeTypeId): Builder
    {
        return $query->where('crime_type_id', $crimeTypeId);
    }

    /**
     * Scope to filter by severity.
     */
    public function scopeBySeverity(Builder $query, OccurrenceSeverity $severity): Builder
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope to filter by region.
     */
    public function scopeInRegion(Builder $query, int $regionId): Builder
    {
        return $query->where('region_id', $regionId);
    }

    /**
     * Scope to filter by date range.
     */
    public function scopeInDateRange(Builder $query, \DateTimeInterface $start, \DateTimeInterface $end): Builder
    {
        return $query->whereBetween('timestamp', [$start, $end]);
    }

    /**
     * Scope to filter occurrences within the last N days.
     */
    public function scopeWithinDays(Builder $query, int $days): Builder
    {
        return $query->where('timestamp', '>=', now()->subDays($days));
    }

    /**
     * Scope to filter expired occurrences.
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('status', OccurrenceStatus::ACTIVE)
            ->where('expires_at', '<=', now());
    }

    /**
     * Scope to filter occurrences near a point.
     */
    public function scopeNearPoint(Builder $query, Point $point, float $distanceMeters): Builder
    {
        return $query->whereDistanceSphere('location', $point, '<=', $distanceMeters);
    }

    /**
     * Scope to filter occurrences within a polygon.
     */
    public function scopeWithinBoundary(Builder $query, $polygon): Builder
    {
        return $query->whereWithin('location', $polygon);
    }

    /**
     * Get the coordinates as a value object.
     */
    public function getCoordinates(): ?Coordinates
    {
        if ($this->location === null) {
            return null;
        }

        return Coordinates::fromPoint($this->location);
    }

    /**
     * Set the location from coordinates.
     */
    public function setCoordinatesAttribute(Coordinates $coordinates): void
    {
        $this->location = $coordinates->toPoint();
    }

    /**
     * Check if this occurrence is collaborative.
     */
    public function isCollaborative(): bool
    {
        return $this->source === OccurrenceSource::COLLABORATIVE;
    }

    /**
     * Check if this occurrence is from an official source.
     */
    public function isOfficial(): bool
    {
        return $this->source === OccurrenceSource::OFFICIAL;
    }

    /**
     * Check if this occurrence is active.
     */
    public function isActive(): bool
    {
        return $this->status === OccurrenceStatus::ACTIVE;
    }

    /**
     * Check if this occurrence has expired.
     */
    public function hasExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Increase the confidence score by a given amount, up to maximum.
     */
    public function increaseConfidenceScore(int $amount = 1, int $max = 4): void
    {
        $this->confidence_score = min($this->confidence_score + $amount, $max);
        $this->save();
    }

    /**
     * Mark this occurrence as expired.
     */
    public function markAsExpired(): void
    {
        $this->status = OccurrenceStatus::EXPIRED;
        $this->save();
    }

    /**
     * Mark this occurrence as rejected.
     */
    public function markAsRejected(): void
    {
        $this->status = OccurrenceStatus::REJECTED;
        $this->save();
    }

    /**
     * Mark this occurrence as merged into another.
     */
    public function markAsMergedInto(Occurrence $target): void
    {
        $this->status = OccurrenceStatus::MERGED;
        $this->merged_into_id = $target->id;
        $this->save();
    }

    /**
     * Convert to array for JSON serialization.
     */
    public function toArray(): array
    {
        $data = [
            'id' => $this->id,
            'timestamp' => $this->timestamp?->toIso8601String(),
            'location' => $this->location ? [
                'latitude' => $this->location->latitude,
                'longitude' => $this->location->longitude,
            ] : null,
            'crime_type_id' => $this->crime_type_id,
            'severity' => $this->severity?->value,
            'confidence_score' => $this->confidence_score,
            'source' => $this->source?->value,
            'source_id' => $this->source_id,
            'region_id' => $this->region_id,
            'status' => $this->status?->value,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_by' => $this->created_by,
            'merged_into_id' => $this->merged_into_id,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];

        return $data;
    }

    /**
     * Create an occurrence from JSON data.
     */
    public static function createFromJson(string $json): self
    {
        $data = json_decode($json, true);
        return self::fromArray($data);
    }

    /**
     * Create an occurrence from array data.
     */
    public static function fromArray(array $data): self
    {
        $occurrence = new self();

        if (isset($data['id'])) {
            $occurrence->id = $data['id'];
        }

        if (isset($data['timestamp'])) {
            $occurrence->timestamp = \Carbon\Carbon::parse($data['timestamp']);
        }

        if (isset($data['location'])) {
            $occurrence->location = new Point(
                $data['location']['latitude'],
                $data['location']['longitude']
            );
        }

        $occurrence->crime_type_id = $data['crime_type_id'] ?? null;
        $occurrence->severity = isset($data['severity']) 
            ? OccurrenceSeverity::from($data['severity']) 
            : null;
        $occurrence->confidence_score = $data['confidence_score'] ?? 2;
        $occurrence->source = isset($data['source']) 
            ? OccurrenceSource::from($data['source']) 
            : null;
        $occurrence->source_id = $data['source_id'] ?? null;
        $occurrence->region_id = $data['region_id'] ?? null;
        $occurrence->status = isset($data['status']) 
            ? OccurrenceStatus::from($data['status']) 
            : OccurrenceStatus::ACTIVE;

        if (isset($data['expires_at'])) {
            $occurrence->expires_at = \Carbon\Carbon::parse($data['expires_at']);
        }

        $occurrence->created_by = $data['created_by'] ?? null;
        $occurrence->merged_into_id = $data['merged_into_id'] ?? null;
        $occurrence->metadata = $data['metadata'] ?? null;

        if (isset($data['created_at'])) {
            $occurrence->created_at = \Carbon\Carbon::parse($data['created_at']);
        }

        if (isset($data['updated_at'])) {
            $occurrence->updated_at = \Carbon\Carbon::parse($data['updated_at']);
        }

        return $occurrence;
    }
}

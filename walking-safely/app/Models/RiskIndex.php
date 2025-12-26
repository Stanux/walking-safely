<?php

namespace App\Models;

use App\ValueObjects\RiskFactor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class RiskIndex extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'risk_indexes';

    /**
     * Minimum valid risk index value.
     */
    public const MIN_VALUE = 0;

    /**
     * Maximum valid risk index value.
     */
    public const MAX_VALUE = 100;

    /**
     * Threshold for high risk regions.
     */
    public const HIGH_RISK_THRESHOLD = 70;

    /**
     * Threshold for warning on routes.
     */
    public const WARNING_THRESHOLD = 50;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'region_id',
        'value',
        'calculated_at',
        'factors',
        'occurrence_count',
        'dominant_crime_type_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'float',
            'calculated_at' => 'datetime',
            'factors' => 'array',
            'occurrence_count' => 'integer',
        ];
    }

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (RiskIndex $riskIndex) {
            $riskIndex->validateValue();
        });
    }

    /**
     * Validate that the risk index value is within valid range.
     *
     * @throws InvalidArgumentException
     */
    public function validateValue(): void
    {
        if ($this->value < self::MIN_VALUE || $this->value > self::MAX_VALUE) {
            throw new InvalidArgumentException(
                "Risk index value must be between " . self::MIN_VALUE . " and " . self::MAX_VALUE . ". Got: {$this->value}"
            );
        }
    }

    /**
     * Get the region this risk index belongs to.
     */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /**
     * Get the dominant crime type for this region.
     */
    public function dominantCrimeType(): BelongsTo
    {
        return $this->belongsTo(CrimeType::class, 'dominant_crime_type_id');
    }

    /**
     * Check if this is a high risk region.
     */
    public function isHighRisk(): bool
    {
        return $this->value >= self::HIGH_RISK_THRESHOLD;
    }

    /**
     * Check if this region requires a warning.
     */
    public function requiresWarning(): bool
    {
        return $this->value >= self::WARNING_THRESHOLD;
    }

    /**
     * Get the risk factors as RiskFactor value objects.
     *
     * @return RiskFactor[]
     */
    public function getRiskFactors(): array
    {
        if (empty($this->factors)) {
            return [];
        }

        return array_map(
            fn(array $factor) => RiskFactor::fromArray($factor),
            $this->factors
        );
    }

    /**
     * Set the risk factors from RiskFactor value objects.
     *
     * @param RiskFactor[] $factors
     */
    public function setRiskFactors(array $factors): void
    {
        $this->factors = array_map(
            fn(RiskFactor $factor) => $factor->toArray(),
            $factors
        );
    }

    /**
     * Get a specific risk factor by type.
     */
    public function getRiskFactorByType(string $type): ?RiskFactor
    {
        foreach ($this->getRiskFactors() as $factor) {
            if ($factor->type === $type) {
                return $factor;
            }
        }

        return null;
    }

    /**
     * Convert to array for JSON serialization.
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'region_id' => $this->region_id,
            'value' => $this->value,
            'calculated_at' => $this->calculated_at?->toIso8601String(),
            'factors' => $this->factors,
            'occurrence_count' => $this->occurrence_count,
            'dominant_crime_type_id' => $this->dominant_crime_type_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Create a RiskIndex from JSON data.
     */
    public static function createFromJson(string $json): self
    {
        $data = json_decode($json, true);
        return self::fromArray($data);
    }

    /**
     * Create a RiskIndex from array data.
     */
    public static function fromArray(array $data): self
    {
        $riskIndex = new self();

        if (isset($data['id'])) {
            $riskIndex->id = $data['id'];
        }

        $riskIndex->region_id = $data['region_id'] ?? null;
        $riskIndex->value = (float) ($data['value'] ?? 0);

        if (isset($data['calculated_at'])) {
            $riskIndex->calculated_at = \Carbon\Carbon::parse($data['calculated_at']);
        }

        $riskIndex->factors = $data['factors'] ?? null;
        $riskIndex->occurrence_count = (int) ($data['occurrence_count'] ?? 0);
        $riskIndex->dominant_crime_type_id = $data['dominant_crime_type_id'] ?? null;

        if (isset($data['created_at'])) {
            $riskIndex->created_at = \Carbon\Carbon::parse($data['created_at']);
        }

        if (isset($data['updated_at'])) {
            $riskIndex->updated_at = \Carbon\Carbon::parse($data['updated_at']);
        }

        return $riskIndex;
    }

    /**
     * Convert to JSON string.
     */
    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
}

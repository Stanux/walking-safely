<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Translation extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'key',
        'locale',
        'value',
        'version',
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
        ];
    }

    /**
     * Get the user who last updated this translation.
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the version history for this translation.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(TranslationVersion::class);
    }

    /**
     * Convert the translation to an array for JSON serialization.
     *
     * @return array<string, mixed>
     */
    public function toSerializableArray(): array
    {
        return [
            'key' => $this->key,
            'locale' => $this->locale,
            'value' => $this->value,
            'version' => $this->version,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Create a Translation instance from an array.
     *
     * @param array<string, mixed> $data
     * @return static
     */
    public static function fromArray(array $data): static
    {
        $translation = new static();
        $translation->key = $data['key'] ?? '';
        $translation->locale = $data['locale'] ?? '';
        $translation->value = $data['value'] ?? '';
        $translation->version = $data['version'] ?? 1;
        $translation->updated_by = $data['updated_by'] ?? null;
        
        return $translation;
    }

    /**
     * Serialize the translation to JSON.
     *
     * @return string
     */
    public function toJsonString(): string
    {
        return json_encode($this->toSerializableArray(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    /**
     * Create a Translation instance from JSON string.
     *
     * @param string $json
     * @return static|null
     */
    public static function createFromJsonString(string $json): ?static
    {
        $data = json_decode($json, true);
        
        if (!is_array($data)) {
            return null;
        }
        
        return static::fromArray($data);
    }

    /**
     * Get the latest version number.
     *
     * @return int
     */
    public function getLatestVersionNumber(): int
    {
        return $this->version;
    }

    /**
     * Check if this translation has version history.
     *
     * @return bool
     */
    public function hasVersionHistory(): bool
    {
        return $this->versions()->exists();
    }

    /**
     * Get a specific version from history.
     *
     * @param int $versionNumber
     * @return TranslationVersion|null
     */
    public function getVersion(int $versionNumber): ?TranslationVersion
    {
        return $this->versions()->where('version', $versionNumber)->first();
    }
}

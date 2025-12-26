<?php

namespace Database\Factories;

use App\Models\CrimeCategory;
use App\Models\CrimeType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CrimeType>
 */
class CrimeTypeFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = CrimeType::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => CrimeCategory::factory(),
            'name' => fake()->unique()->words(3, true),
            'description' => fake()->sentence(),
        ];
    }

    /**
     * Indicate that the crime type belongs to a specific category.
     */
    public function forCategory(CrimeCategory $category): static
    {
        return $this->state(fn (array $attributes) => [
            'category_id' => $category->id,
        ]);
    }

    /**
     * Create a crime type with a specific name.
     */
    public function withName(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
        ]);
    }
}

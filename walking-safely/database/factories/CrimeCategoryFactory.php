<?php

namespace Database\Factories;

use App\Models\CrimeCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CrimeCategory>
 */
class CrimeCategoryFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = CrimeCategory::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'parent_id' => null,
            'weight' => fake()->randomFloat(2, 0.1, 1.0),
            'version' => 1,
        ];
    }

    /**
     * Indicate that the category is a child of another category.
     */
    public function childOf(CrimeCategory $parent): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_id' => $parent->id,
        ]);
    }

    /**
     * Indicate that the category has high weight.
     */
    public function highWeight(): static
    {
        return $this->state(fn (array $attributes) => [
            'weight' => fake()->randomFloat(2, 0.8, 1.0),
        ]);
    }

    /**
     * Indicate that the category has low weight.
     */
    public function lowWeight(): static
    {
        return $this->state(fn (array $attributes) => [
            'weight' => fake()->randomFloat(2, 0.1, 0.3),
        ]);
    }
}

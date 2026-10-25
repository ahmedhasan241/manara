<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plan>
 */
class PlanFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->slug(2),
            'name' => fake()->words(2, true),
            'price_monthly_cents' => fake()->randomElement([0, 1900, 4900, 19900]),
            'price_yearly_cents' => 0,
            'max_students' => 100,
            'max_staff' => 5,
            'features' => ['Gradebook', 'Attendance'],
        ];
    }
}

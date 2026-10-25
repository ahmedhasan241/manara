<?php

namespace App\Models;

use Database\Factories\PlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'description', 'price_monthly_cents', 'price_yearly_cents', 'currency', 'max_students', 'max_staff', 'storage_gb', 'features', 'translations', 'is_active', 'sort_order'])]
class Plan extends Model
{
    /** @use HasFactory<PlanFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'translations' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Built-in translations for the standard plans (database/data).
     *
     * @return array<string, array{name: string, description: string, features: list<string>}>|null
     */
    public static function defaultTranslations(string $code): ?array
    {
        $all = json_decode((string) file_get_contents(database_path('data/plan-translations.json')), true);

        return $all[$code] ?? null;
    }

    /**
     * The plan as shown to visitors: name, description and features in the
     * request's language when translated (English otherwise).
     *
     * @return array<string, mixed>
     */
    public function localized(?string $locale = null): array
    {
        $plan = $this->toArray();
        $plan['includes_previous'] = str_starts_with($this->features[0] ?? '', 'Everything in');
        $translation = $this->translations[$locale ?? app()->getLocale()] ?? [];
        foreach (['name', 'description', 'features'] as $field) {
            if (! empty($translation[$field])) {
                $plan[$field] = $translation[$field];
            }
        }
        unset($plan['translations']);

        return $plan;
    }

    /**
     * @return HasMany<Subscription, $this>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}

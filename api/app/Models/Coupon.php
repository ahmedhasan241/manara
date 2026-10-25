<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A workspace's discount code for its online courses: a percentage off one
 * course, or off all of them, optionally limited in uses and time.
 */
#[Fillable(['tenant_id', 'course_id', 'code', 'percent_off', 'max_uses', 'uses_count', 'expires_at', 'is_active'])]
class Coupon extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return ['percent_off' => 'integer', 'max_uses' => 'integer', 'uses_count' => 'integer', 'expires_at' => 'datetime', 'is_active' => 'boolean'];
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class)->withoutGlobalScopes();
    }

    /** Whether the code can be used right now (ignores which courses it covers). */
    public function isRedeemable(): bool
    {
        return $this->is_active
            && ($this->expires_at === null || $this->expires_at->isFuture())
            && ($this->max_uses === null || $this->uses_count < $this->max_uses);
    }

    public function appliesTo(Course $course): bool
    {
        return $course->tenant_id === $this->tenant_id && ($this->course_id === null || $this->course_id === $course->id);
    }

    /** The discounted price, in cents. */
    public function apply(int $priceCents): int
    {
        return (int) round($priceCents * (100 - $this->percent_off) / 100);
    }

    /**
     * A code as typed by a learner (any case, stray spaces), outside the tenant scope.
     */
    public static function findByCode(string $code): ?self
    {
        return static::withoutGlobalScopes()->where('code', strtoupper(trim($code)))->first();
    }
}

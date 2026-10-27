<?php

namespace App\Models;

use App\Services\Currencies;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['slug', 'name', 'type', 'status', 'country', 'locale', 'timezone', 'custom_domain', 'branding', 'site', 'settings'])]
class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory, SoftDeletes;

    /** @var list<string> */
    public const array TYPES = ['teacher', 'school', 'university'];

    protected function casts(): array
    {
        return [
            'branding' => 'array',
            'site' => 'array',
            'settings' => 'array',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * The workspace's own currency (from its country), for pricing its courses.
     */
    public function currency(): string
    {
        return app(Currencies::class)->forCountry($this->country);
    }

    public function requiresMfa(): bool
    {
        return (bool) data_get($this->settings, 'require_mfa', false);
    }

    /**
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'memberships')->withPivot('role')->withTimestamps();
    }

    /**
     * @return HasMany<Course, $this>
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    /**
     * @return HasMany<Subscription, $this>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * @return HasOne<Subscription, $this>
     */
    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }
}

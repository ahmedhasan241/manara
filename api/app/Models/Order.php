<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A learner's purchase of one or more marketplace courses.
 */
#[Fillable(['user_id', 'number', 'status', 'subtotal_cents', 'discount_cents', 'total_cents', 'currency', 'coupon_code', 'display_currency', 'exchange_rate', 'provider', 'provider_reference', 'paid_at'])]
class Order extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['paid_at' => 'datetime', 'subtotal_cents' => 'integer', 'total_cents' => 'integer', 'discount_cents' => 'integer', 'exchange_rate' => 'float'];
    }

    protected static function booted(): void
    {
        static::creating(function (Order $order): void {
            $order->number ??= 'MN-'.strtoupper(Str::random(8));
        });
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

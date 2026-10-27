<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One course in an order, with the price paid at the time.
 */
#[Fillable(['order_id', 'course_id', 'tenant_id', 'title', 'price_cents', 'list_price_cents', 'commission_percent'])]
class OrderItem extends Model
{
    protected function casts(): array
    {
        return ['price_cents' => 'integer', 'commission_percent' => 'integer'];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class)->withoutGlobalScopes();
    }
}

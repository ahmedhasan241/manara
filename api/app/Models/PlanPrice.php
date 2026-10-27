<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A plan's price in one country, in that country's currency.
 */
#[Fillable(['plan_id', 'country', 'currency', 'price_monthly_cents', 'price_yearly_cents', 'extra_student_cents', 'extra_staff_cents', 'video_addon_cents'])]
class PlanPrice extends Model
{
    /** Fields that make up a price, shared with the plan's own default price. */
    public const array PRICE_FIELDS = ['currency', 'price_monthly_cents', 'price_yearly_cents', 'extra_student_cents', 'extra_staff_cents', 'video_addon_cents'];

    /**
     * @return BelongsTo<Plan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}

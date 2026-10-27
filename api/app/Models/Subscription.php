<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'plan_id', 'status', 'interval', 'extra_students', 'extra_staff', 'video_addon', 'country', 'currency', 'amount_cents', 'trial_ends_at', 'current_period_ends_at', 'canceled_at', 'provider', 'provider_id'])]
class Subscription extends Model
{
    protected function casts(): array
    {
        return [
            'video_addon' => 'boolean',
            'trial_ends_at' => 'datetime',
            'current_period_ends_at' => 'datetime',
            'canceled_at' => 'datetime',
        ];
    }

    /**
     * Students the workspace may have: the plan's allowance plus extra seats (null: unlimited).
     */
    public function studentSeats(): ?int
    {
        return $this->plan->max_students === null ? null : $this->plan->max_students + $this->extra_students;
    }

    /**
     * Staff (owners, admins, teachers) the workspace may have (null: unlimited).
     */
    public function staffSeats(): ?int
    {
        return $this->plan->max_staff === null ? null : $this->plan->max_staff + $this->extra_staff;
    }

    /**
     * Video meetings come with the add-on, with plans that include them, and during the free trial.
     */
    public function hasVideoMeetings(): bool
    {
        return $this->video_addon
            || ! $this->plan->sellsVideoAddon()
            || ($this->status === 'trialing' && $this->isUsable());
    }

    public function isUsable(): bool
    {
        return match ($this->status) {
            'active' => true,
            'trialing' => $this->trial_ends_at === null || $this->trial_ends_at->isFuture(),
            default => false,
        };
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * @return BelongsTo<Plan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}

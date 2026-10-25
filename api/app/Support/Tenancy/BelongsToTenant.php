<?php

namespace App\Support\Tenancy;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Scopes every query to the current tenant and stamps tenant_id on create.
 * Outside a tenant context (console, platform admin) the scope is not applied.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $query): void {
            $tenant = app(CurrentTenant::class);
            if ($tenant->has()) {
                $query->where($query->qualifyColumn('tenant_id'), $tenant->id());
            }
        });

        static::creating(function ($model): void {
            $tenant = app(CurrentTenant::class);
            if ($tenant->has() && empty($model->tenant_id)) {
                $model->tenant_id = $tenant->id();
            }
        });
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

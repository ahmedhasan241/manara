<?php

namespace App\Support\Tenancy;

use App\Models\Membership;
use App\Models\Tenant;

/**
 * Holds the tenant (and the caller's membership in it) for the current request.
 * Bound as a scoped singleton so it resets between requests and queue jobs.
 */
class CurrentTenant
{
    private ?Tenant $tenant = null;

    private ?Membership $membership = null;

    private ?int $studentId = null;

    public function set(Tenant $tenant, ?Membership $membership = null, ?int $studentId = null): void
    {
        $this->tenant = $tenant;
        $this->membership = $membership;
        $this->studentId = $studentId;
    }

    public function clear(): void
    {
        $this->tenant = null;
        $this->membership = null;
        $this->studentId = null;
    }

    /**
     * For a parent, the child whose records this request is about.
     */
    public function studentId(): ?int
    {
        return $this->studentId;
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?int
    {
        return $this->tenant?->id;
    }

    public function membership(): ?Membership
    {
        return $this->membership;
    }

    public function has(): bool
    {
        return $this->tenant !== null;
    }
}

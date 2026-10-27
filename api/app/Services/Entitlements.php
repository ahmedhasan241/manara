<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Membership;
use App\Models\Tenant;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * What a workspace's subscription allows: how many students and staff it may
 * have, and whether it can hold video meetings. Workspaces without a
 * subscription (set up by hand) are not limited.
 */
class Entitlements
{
    /**
     * Seats in use and available, per kind (null limit: unlimited).
     *
     * @return array{students: array{used: int, limit: int|null}, staff: array{used: int, limit: int|null}}
     */
    public function seats(Tenant $tenant): array
    {
        $subscription = $tenant->subscription()->with('plan')->first();

        return [
            'students' => ['used' => $this->used($tenant, 'students'), 'limit' => $subscription?->studentSeats()],
            'staff' => ['used' => $this->used($tenant, 'staff'), 'limit' => $subscription?->staffSeats()],
        ];
    }

    /**
     * Stops adding people in this role beyond the paid seats. Parents never use a seat.
     */
    public function ensureSeatsFor(Tenant $tenant, Role $role, int $adding = 1): void
    {
        $kind = self::seatKind($role);
        if ($kind === null || $adding < 1) {
            return;
        }

        $seat = $this->seats($tenant)[$kind];
        if ($seat['limit'] === null || $seat['limit'] >= $seat['used'] + $adding) {
            return;
        }

        $message = $kind === 'students'
            ? __('Your package has room for :limit students (:used in use). Add student seats or upgrade your package.', ['limit' => $seat['limit'], 'used' => $seat['used']])
            : __('Your package has room for :limit staff members (:used in use). Add staff seats or upgrade your package.', ['limit' => $seat['limit'], 'used' => $seat['used']]);

        throw new HttpResponseException(response()->json([
            'message' => $message,
            'code' => 'seat_limit',
            'seats' => $kind,
            'limit' => $seat['limit'],
            'used' => $seat['used'],
        ], 422));
    }

    /**
     * Which seats a role uses: students, staff, or none (parents).
     */
    public static function seatKind(Role $role): ?string
    {
        return match (true) {
            $role === Role::Student => 'students',
            $role->isStaff() => 'staff',
            default => null,
        };
    }

    public function hasVideoMeetings(Tenant $tenant): bool
    {
        $subscription = $tenant->subscription()->with('plan')->first();

        return $subscription === null || $subscription->hasVideoMeetings();
    }

    public function ensureVideoMeetings(Tenant $tenant): void
    {
        if ($this->hasVideoMeetings($tenant)) {
            return;
        }

        throw new HttpResponseException(response()->json([
            'message' => __('Video meetings are an add-on. Add it to your package to schedule and start live lessons.'),
            'code' => 'addon_required',
            'addon' => 'video',
        ], 403));
    }

    private function used(Tenant $tenant, string $kind): int
    {
        $roles = $kind === 'students'
            ? [Role::Student->value]
            : [Role::Owner->value, Role::Admin->value, Role::Teacher->value];

        return Membership::withoutGlobalScopes()->where('tenant_id', $tenant->id)->whereIn('role', $roles)->count();
    }
}

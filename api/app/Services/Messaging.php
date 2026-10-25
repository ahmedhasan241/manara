<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Membership;

/**
 * Who may start a conversation with whom inside a workspace.
 *
 * Staff can message anyone in the workspace. Students and parents can message
 * staff, and reply in any conversation they were added to.
 */
class Messaging
{
    public function canContact(Membership $from, Membership $to): bool
    {
        if ($from->tenant_id !== $to->tenant_id || $from->user_id === $to->user_id) {
            return false;
        }

        return $from->role->isStaff() || $to->role->isStaff();
    }

    public function canCreateGroups(Membership $membership): bool
    {
        return $membership->role->isStaff();
    }

    /**
     * Roles a membership is allowed to start conversations with.
     *
     * @return list<Role>
     */
    public function contactableRoles(Membership $membership): array
    {
        return $membership->role->isStaff()
            ? Role::cases()
            : [Role::Owner, Role::Admin, Role::Teacher];
    }
}

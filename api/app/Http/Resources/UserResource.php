<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'locale' => $this->locale,
            'phone' => $this->phone,
            'headline' => $this->headline,
            'bio' => $this->bio,
            'country' => $this->country,
            'city' => $this->city,
            'area' => $this->area,
            'is_platform_admin' => $this->is_platform_admin,
            'mfa_enabled' => $this->hasMfaEnabled(),
            'last_login_at' => $this->last_login_at,
            'memberships' => $this->whenLoaded('memberships', fn () => $this->memberships->map(fn ($membership) => [
                'role' => $membership->role->value,
                'permissions' => $membership->role->permissions(),
                'tenant' => [
                    'id' => $membership->tenant->id,
                    'slug' => $membership->tenant->slug,
                    'name' => $membership->tenant->name,
                    'type' => $membership->tenant->type,
                ],
            ])),
        ];
    }
}

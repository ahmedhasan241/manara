<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'user_id', 'action', 'subject_type', 'subject_id', 'changes', 'ip_address', 'user_agent'])]
class ActivityLog extends Model
{
    use BelongsToTenant;

    public const UPDATED_AT = null;

    /** @var list<string> Values never copied into the log. */
    private const array REDACTED = ['password', 'mfa_secret', 'mfa_recovery_codes', 'remember_token', 'feedback', 'phone'];

    protected function casts(): array
    {
        return ['changes' => 'array'];
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    public static function record(string $action, ?Model $subject = null, array $changes = [], ?User $user = null): self
    {
        $request = request();

        return static::create([
            'tenant_id' => $subject?->getAttribute('tenant_id') ?? app(CurrentTenant::class)->id(),
            'user_id' => $user?->id ?? $request->user()?->id,
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'changes' => array_diff_key($changes, array_flip(self::REDACTED)) ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255) ?: null,
        ]);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

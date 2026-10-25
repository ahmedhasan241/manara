<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An end-to-end encrypted message. `ciphertext` is the body encrypted with a
 * random per-message key; `keys` holds that key sealed to each participant's
 * public key. The server never sees the body or the message key.
 */
#[Fillable(['id', 'tenant_id', 'conversation_id', 'sender_id', 'ciphertext', 'nonce', 'keys'])]
class Message extends Model
{
    use BelongsToTenant, HasUuids;

    protected function casts(): array
    {
        return ['keys' => 'array'];
    }

    /**
     * @return BelongsTo<Conversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}

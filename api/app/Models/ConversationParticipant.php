<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['conversation_id', 'user_id', 'last_read_at', 'notify', 'muted_until'])]
class ConversationParticipant extends Model
{
    protected function casts(): array
    {
        return [
            'last_read_at' => 'datetime',
            'muted_until' => 'datetime',
        ];
    }

    /**
     * Whether a new message in this conversation should alert this participant.
     */
    public function wantsAlerts(): bool
    {
        return $this->notify !== 'none' && ($this->muted_until === null || $this->muted_until->isPast());
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Conversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}

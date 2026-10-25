<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A user's messaging key pair. The private key is encrypted by the client with a
 * passphrase-derived key (Argon2id + XSalsa20-Poly1305); the server can't open it.
 * Storing it here is what lets a new device restore the user's chat history.
 */
#[Fillable(['user_id', 'public_key', 'encrypted_private_key', 'private_key_nonce', 'kdf_salt', 'kdf_ops_limit', 'kdf_mem_limit', 'version'])]
class UserKey extends Model
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

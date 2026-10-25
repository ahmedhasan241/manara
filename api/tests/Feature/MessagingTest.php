<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserKey;
use App\Notifications\NewMessage;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessagingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Creates a key pair the way the client does and registers its public half.
     *
     * @return string the secret key (kept by the "client")
     */
    private function giveKey(User $user): string
    {
        $pair = sodium_crypto_box_keypair();
        UserKey::create([
            'user_id' => $user->id,
            'public_key' => base64_encode(sodium_crypto_box_publickey($pair)),
            'encrypted_private_key' => base64_encode(random_bytes(72)),
            'private_key_nonce' => base64_encode(random_bytes(24)),
            'kdf_salt' => base64_encode(random_bytes(16)),
            'kdf_ops_limit' => 2,
            'kdf_mem_limit' => 67108864,
        ]);

        return sodium_crypto_box_secretkey($pair);
    }

    /**
     * Encrypts a message for the given users exactly like the web client.
     *
     * @param  list<User>  $recipients
     * @return array<string, mixed>
     */
    private function encrypt(string $plaintext, array $recipients): array
    {
        $messageKey = sodium_crypto_aead_xchacha20poly1305_ietf_keygen();
        $nonce = random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);

        return [
            'id' => (string) Str::uuid(),
            'ciphertext' => base64_encode(sodium_crypto_aead_xchacha20poly1305_ietf_encrypt($plaintext, '', $nonce, $messageKey)),
            'nonce' => base64_encode($nonce),
            'keys' => collect($recipients)->mapWithKeys(fn (User $u) => [
                $u->id => base64_encode(sodium_crypto_box_seal($messageKey, base64_decode($u->fresh()->messagingKey->public_key))),
            ])->all(),
        ];
    }

    public function test_key_backup_is_stored_and_a_different_key_needs_reset(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $payload = [
            'public_key' => base64_encode(random_bytes(32)),
            'encrypted_private_key' => base64_encode(random_bytes(48)),
            'private_key_nonce' => base64_encode(random_bytes(24)),
            'kdf_salt' => base64_encode(random_bytes(16)),
            'kdf_ops_limit' => 2,
            'kdf_mem_limit' => 67108864,
        ];

        $this->putJson('/api/v1/me/messaging-key', $payload)->assertCreated();
        $this->getJson('/api/v1/me/messaging-key')->assertOk()->assertJsonPath('data.public_key', $payload['public_key']);

        // New passphrase, same key: allowed.
        $this->putJson('/api/v1/me/messaging-key', [...$payload, 'kdf_salt' => base64_encode(random_bytes(16))])->assertOk();

        // Different key without reset: refused, so history isn't lost by accident.
        $other = [...$payload, 'public_key' => base64_encode(random_bytes(32))];
        $this->putJson('/api/v1/me/messaging-key', $other)->assertUnprocessable();
        $this->putJson('/api/v1/me/messaging-key', [...$other, 'reset' => true])->assertOk()->assertJsonPath('data.version', 2);
    }

    public function test_students_can_message_staff_but_not_other_students(): void
    {
        $tenant = Tenant::factory()->create();
        $student = $this->member($tenant, Role::Student);
        $classmate = $this->member($tenant, Role::Student);
        $teacher = $this->member($tenant, Role::Teacher);

        $this->asMember($student, $tenant, 'POST', '/api/v1/conversations', ['type' => 'direct', 'user_id' => $classmate->id])->assertUnprocessable();
        $first = $this->asMember($student, $tenant, 'POST', '/api/v1/conversations', ['type' => 'direct', 'user_id' => $teacher->id])->assertCreated()->json('id');

        // Starting again returns the same conversation.
        $this->asMember($teacher, $tenant, 'POST', '/api/v1/conversations', ['type' => 'direct', 'user_id' => $student->id])->assertOk()->assertJsonPath('id', $first);
        $this->asMember($student, $tenant, 'POST', '/api/v1/conversations', ['type' => 'group', 'title' => 'Study group', 'user_ids' => [$classmate->id]])->assertForbidden();
    }

    public function test_sending_an_encrypted_message_broadcasts_and_alerts_participants(): void
    {
        Event::fake([MessageSent::class]);
        Notification::fake();

        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $student = $this->member($tenant, Role::Student);
        $parent = $this->member($tenant, Role::Parent, ['guardian_of_id' => $student->id]);
        $this->giveKey($teacher);
        $studentSecret = $this->giveKey($student);
        $this->giveKey($parent);

        $conversationId = $this->asMember($teacher, $tenant, 'POST', '/api/v1/conversations', [
            'type' => 'group', 'title' => 'Progress', 'user_ids' => [$student->id, $parent->id],
        ])->assertCreated()->json('id');
        $this->asMember($parent, $tenant, 'PATCH', "/api/v1/conversations/{$conversationId}/settings", ['notify' => 'none'])->assertOk();

        // A key missing for one participant is rejected.
        $incomplete = $this->encrypt('Hi', [$teacher, $student]);
        $this->asMember($teacher, $tenant, 'POST', "/api/v1/conversations/{$conversationId}/messages", $incomplete)->assertUnprocessable();

        $payload = $this->encrypt('Great progress this week!', [$teacher, $student, $parent]);
        $this->asMember($teacher, $tenant, 'POST', "/api/v1/conversations/{$conversationId}/messages", $payload)->assertCreated();
        // Retrying the same message is idempotent.
        $this->asMember($teacher, $tenant, 'POST', "/api/v1/conversations/{$conversationId}/messages", $payload)->assertOk();
        $this->assertSame(1, Message::withoutGlobalScopes()->count());

        // The server only has ciphertext; the student's key opens it.
        $stored = Message::withoutGlobalScopes()->first();
        $this->assertStringNotContainsString('progress', base64_decode($stored->ciphertext));
        $studentPublic = base64_decode($student->fresh()->messagingKey->public_key);
        $messageKey = sodium_crypto_box_seal_open(base64_decode($stored->keys[$student->id]), sodium_crypto_box_keypair_from_secretkey_and_publickey($studentSecret, $studentPublic));
        $this->assertSame('Great progress this week!', sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(base64_decode($stored->ciphertext), '', base64_decode($stored->nonce), $messageKey));

        Event::assertDispatched(MessageSent::class, fn (MessageSent $e) => count($e->broadcastOn()) === 3);
        Notification::assertSentTo($student, NewMessage::class);
        Notification::assertNotSentTo($parent, NewMessage::class); // muted
        Notification::assertNotSentTo($teacher, NewMessage::class); // sender

        $this->asMember($student, $tenant, 'GET', '/api/v1/conversations')->assertOk()->assertJsonPath('0.unread', 1);
        $this->asMember($student, $tenant, 'POST', "/api/v1/conversations/{$conversationId}/read")->assertNoContent();
        $this->asMember($student, $tenant, 'GET', '/api/v1/conversations')->assertJsonPath('0.unread', 0);
    }

    public function test_outsiders_cannot_read_a_conversation(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $student = $this->member($tenant, Role::Student);
        $outsider = $this->member($tenant, Role::Admin);
        $conversation = Conversation::create(['tenant_id' => $tenant->id, 'type' => 'direct', 'created_by' => $teacher->id]);
        $conversation->participantRows()->create(['user_id' => $teacher->id]);
        $conversation->participantRows()->create(['user_id' => $student->id]);

        $this->asMember($outsider, $tenant, 'GET', "/api/v1/conversations/{$conversation->id}/messages")->assertNotFound();
        $this->asMember($student, $tenant, 'GET', "/api/v1/conversations/{$conversation->id}/messages")->assertOk();

        $otherTenant = Tenant::factory()->create();
        $foreigner = $this->member($otherTenant, Role::Admin);
        $this->asMember($foreigner, $otherTenant, 'GET', "/api/v1/conversations/{$conversation->id}/messages")->assertNotFound();
    }

    public function test_users_can_only_join_their_own_realtime_channel(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => '1',
        ]);
        // Channel rules were registered on the test's null broadcaster at boot; load them onto Reverb.
        app(BroadcastManager::class)->purge();
        require base_path('routes/channels.php');
        $user = User::factory()->create();
        $other = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => "private-users.{$user->id}"])
            ->assertOk()
            ->assertJsonStructure(['auth']);
        $this->postJson('/api/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => "private-users.{$other->id}"])
            ->assertForbidden();
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use App\Notifications\NewMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class MessageController extends TenantController
{
    private const string BASE64 = 'regex:/^[A-Za-z0-9+\/_-]+={0,2}$/';

    /**
     * Encrypted messages, newest first. `before` pages back through history;
     * `since` returns everything newer (used for multi-device sync and backups).
     */
    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($conversation->hasParticipant($request->user()), 404);
        $request->validate(['before' => ['nullable', 'date'], 'since' => ['nullable', 'date'], 'limit' => ['nullable', 'integer', 'min:1', 'max:200']]);

        $messages = $conversation->messages()
            ->when($request->query('before'), fn ($q, $before) => $q->where('created_at', '<', Carbon::parse($before)))
            // Inclusive so messages sharing the cursor's second aren't skipped; clients dedupe by id.
            ->when($request->query('since'), fn ($q, $since) => $q->where('created_at', '>=', Carbon::parse($since)))
            ->orderByDesc('created_at')
            ->limit($request->integer('limit', 50))
            ->get(['id', 'conversation_id', 'sender_id', 'ciphertext', 'nonce', 'keys', 'created_at']);

        return response()->json($messages);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        abort_unless($conversation->hasParticipant($user), 404);

        $data = $request->validate([
            'id' => ['required', 'uuid'],
            'ciphertext' => ['required', 'string', 'max:131072', self::BASE64],
            'nonce' => ['required', 'string', 'max:64', self::BASE64],
            'keys' => ['required', 'array'],
            'keys.*' => ['required', 'string', 'max:256', self::BASE64],
        ]);

        // Resending the same message (e.g. after a timeout) is a no-op.
        if ($existing = Message::find($data['id'])) {
            abort_unless($existing->sender_id === $user->id, 409);

            return response()->json($existing);
        }

        $participants = $conversation->participantRows()->with('user.messagingKey')->get();
        $expected = $participants->filter(fn ($p) => $p->user->messagingKey)->pluck('user_id')->map('strval')->sort()->values()->all();
        $given = collect(array_keys($data['keys']))->map('strval')->sort()->values()->all();

        // Every participant with a key must get a copy of the message key, and no one else.
        if ($expected !== $given) {
            throw ValidationException::withMessages(['keys' => __('Message keys must be sealed for exactly the participants who have messaging keys.'), 'expected' => $expected]);
        }

        $message = $conversation->messages()->create([...$data, 'sender_id' => $user->id]);
        $conversation->update(['last_message_at' => $message->created_at]);
        $participants->firstWhere('user_id', $user->id)?->update(['last_read_at' => $message->created_at]);

        MessageSent::dispatch($message, $participants->pluck('user_id')->all());

        foreach ($participants as $participant) {
            if ($participant->user_id !== $user->id && $participant->wantsAlerts()) {
                $participant->user->notify(new NewMessage($message, $user->name, $conversation->title));
            }
        }

        return response()->json($message, 201);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Membership;
use App\Models\Message;
use App\Models\User;
use App\Services\Messaging;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConversationController extends TenantController
{
    public function __construct(private Messaging $messaging) {}

    /**
     * The caller's conversations, most recent first, with unread counts.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversations = Conversation::query()
            ->forUser($user)
            ->with(['participants:id,name', 'participants.messagingKey:id,user_id,public_key'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $reads = ConversationParticipant::where('user_id', $user->id)
            ->whereIn('conversation_id', $conversations->modelKeys())
            ->get()
            ->keyBy('conversation_id');

        $unread = Message::query()
            ->whereIn('conversation_id', $conversations->modelKeys())
            ->where('sender_id', '!=', $user->id)
            ->where(function ($q) use ($reads) {
                foreach ($reads as $conversationId => $row) {
                    $q->orWhere(fn ($q) => $q->where('conversation_id', $conversationId)
                        ->when($row->last_read_at, fn ($q, $at) => $q->where('created_at', '>', $at)));
                }
            })
            ->selectRaw('conversation_id, count(*) as total')
            ->groupBy('conversation_id')
            ->pluck('total', 'conversation_id');

        return response()->json($conversations->map(fn (Conversation $c) => $this->present($c, $reads[$c->id] ?? null, (int) ($unread[$c->id] ?? 0))));
    }

    /**
     * Starts a direct conversation (or returns the existing one), or creates a group.
     */
    public function store(Request $request): JsonResponse
    {
        $me = $this->membership();
        $data = $request->validate([
            'type' => ['required', Rule::in(['direct', 'group'])],
            'user_id' => ['required_if:type,direct', 'integer'],
            'user_ids' => ['required_if:type,group', 'array', 'max:500'],
            'user_ids.*' => ['integer'],
            'title' => ['required_if:type,group', 'nullable', 'string', 'max:120'],
            'course_id' => ['nullable', 'uuid', Rule::exists('courses', 'id')->where('tenant_id', $this->tenant()->id)],
        ]);

        if ($data['type'] === 'direct') {
            $other = Membership::where('user_id', $data['user_id'])->first();
            if (! $other || ! $this->messaging->canContact($me, $other)) {
                throw ValidationException::withMessages(['user_id' => __('You cannot message this person.')]);
            }

            $existing = Conversation::query()
                ->where('type', 'direct')
                ->forUser($request->user())
                ->whereHas('participantRows', fn ($q) => $q->where('user_id', $other->user_id))
                ->first();
            if ($existing) {
                return response()->json($this->present($existing->load('participants.messagingKey')));
            }

            $memberIds = [$me->user_id, $other->user_id];
        } else {
            abort_unless($this->messaging->canCreateGroups($me), 403, __('Only staff can create group conversations.'));
            $memberIds = Membership::whereIn('user_id', $data['user_ids'])->pluck('user_id')->push($me->user_id)->unique()->values()->all();
        }

        $conversation = DB::transaction(function () use ($data, $memberIds, $request) {
            $conversation = Conversation::create([
                'type' => $data['type'],
                'title' => $data['type'] === 'group' ? $data['title'] : null,
                'course_id' => $data['course_id'] ?? null,
                'created_by' => $request->user()->id,
            ]);
            foreach ($memberIds as $userId) {
                $conversation->participantRows()->create(['user_id' => $userId]);
            }

            return $conversation;
        });

        return response()->json($this->present($conversation->load('participants.messagingKey')), 201);
    }

    /**
     * Per-conversation notification settings for the caller.
     */
    public function settings(Request $request, Conversation $conversation): JsonResponse
    {
        $row = $this->participantRow($request->user(), $conversation);
        $row->update($request->validate([
            'notify' => ['sometimes', Rule::in(['all', 'none'])],
            'muted_until' => ['nullable', 'date', 'after:now'],
        ]));

        return response()->json($row->only(['notify', 'muted_until']));
    }

    public function read(Request $request, Conversation $conversation): JsonResponse
    {
        $this->participantRow($request->user(), $conversation)->update(['last_read_at' => now()]);

        return response()->json(null, 204);
    }

    /**
     * People the caller may start a conversation with, and whether each has set up
     * encrypted messaging yet.
     */
    public function contacts(Request $request): JsonResponse
    {
        $me = $this->membership();

        $contacts = Membership::query()
            ->whereIn('role', $this->messaging->contactableRoles($me))
            ->where('user_id', '!=', $me->user_id)
            ->with('user:id,name', 'user.messagingKey:id,user_id')
            ->when($request->query('search'), fn ($q, $search) => $q->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%")))
            ->limit(200)
            ->get()
            ->map(fn (Membership $m) => [
                'id' => $m->user_id,
                'name' => $m->user->name,
                'role' => $m->role->value,
                'has_key' => $m->user->messagingKey !== null,
            ])
            ->sortBy('name')
            ->values();

        return response()->json($contacts);
    }

    private function participantRow(User $user, Conversation $conversation): ConversationParticipant
    {
        return $conversation->participantRows()->where('user_id', $user->id)->firstOr(fn () => abort(404));
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Conversation $conversation, ?ConversationParticipant $mine = null, int $unread = 0): array
    {
        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'title' => $conversation->title,
            'course_id' => $conversation->course_id,
            'last_message_at' => $conversation->last_message_at,
            'unread' => $unread,
            'notify' => $mine?->notify ?? 'all',
            'muted_until' => $mine?->muted_until,
            'participants' => $conversation->participants->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'public_key' => $u->messagingKey?->public_key,
            ]),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends TenantController
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()
            ->where('data->tenant_id', $this->tenant()->id)
            ->when($request->boolean('unread'), fn ($q) => $q->whereNull('read_at'))
            ->limit(50)
            ->get(['id', 'type', 'data', 'read_at', 'created_at']);

        return response()->json([
            'data' => $notifications,
            'unread_count' => $request->user()->unreadNotifications()->where('data->tenant_id', $this->tenant()->id)->count(),
        ]);
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        $request->user()->notifications()->whereKey($notification)->update(['read_at' => now()]);

        return response()->json(null, 204);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->where('data->tenant_id', $this->tenant()->id)->update(['read_at' => now()]);

        return response()->json(null, 204);
    }
}

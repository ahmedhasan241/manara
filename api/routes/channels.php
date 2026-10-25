<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// A user's own channel: new messages, notifications, grade and announcement
// alerts, and (for platform staff) critical system alerts.
Broadcast::channel('users.{id}', fn (User $user, int $id) => $user->id === $id);

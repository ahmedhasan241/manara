<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes an activity_logs row for every create, update and delete on the model.
 */
trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        static::created(fn (Model $model) => ActivityLog::record('created', $model, $model->getAttributes()));
        static::updated(fn (Model $model) => ActivityLog::record('updated', $model, $model->getChanges()));
        static::deleted(fn (Model $model) => ActivityLog::record('deleted', $model));
    }
}

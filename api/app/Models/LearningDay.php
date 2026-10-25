<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Time a learner spent learning on one day (from the player's progress pings).
 */
#[Fillable(['user_id', 'day', 'seconds', 'lectures_completed'])]
class LearningDay extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        // "day" stays a plain Y-m-d string so lookups match the unique (user_id, day) key.
        return ['seconds' => 'integer', 'lectures_completed' => 'integer'];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

/**
 * Where a learner is in a lecture, and whether they finished it.
 */
#[Table('lecture_progress')]
#[Fillable(['user_id', 'course_id', 'lecture_id', 'position_seconds', 'completed_at'])]
class LectureProgress extends Model
{
    protected function casts(): array
    {
        return ['completed_at' => 'datetime', 'position_seconds' => 'integer'];
    }
}

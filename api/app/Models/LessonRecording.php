<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A lesson recording shown on the course page: downloaded from Zoom cloud
 * recording, uploaded by the teacher, or linked from elsewhere.
 */
#[Fillable(['tenant_id', 'course_id', 'live_lesson_id', 'title', 'source', 'provider_file_id', 'status', 'disk', 'path', 'external_url', 'mime_type', 'size_bytes', 'duration_seconds', 'view_count', 'published_at', 'uploaded_by'])]
#[Hidden(['disk', 'path', 'provider_file_id'])]
class LessonRecording extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function isReady(): bool
    {
        return $this->status === 'ready';
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<LiveLesson, $this>
     */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(LiveLesson::class, 'live_lesson_id');
    }
}

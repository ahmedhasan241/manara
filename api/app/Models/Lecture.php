<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One self-paced lecture: an uploaded or linked video, or a written article.
 * Preview lectures can be watched by anyone before buying.
 */
#[Fillable(['tenant_id', 'course_id', 'section_id', 'title', 'type', 'body', 'video_url', 'disk', 'path', 'mime_type', 'size_bytes', 'duration_seconds', 'is_preview', 'position'])]
#[Hidden(['disk', 'path'])]
class Lecture extends Model
{
    use BelongsToTenant, HasUuids;

    public const array TYPES = ['video', 'article'];

    protected function casts(): array
    {
        return ['is_preview' => 'boolean', 'duration_seconds' => 'integer', 'position' => 'integer'];
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<CourseSection, $this>
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(CourseSection::class, 'section_id');
    }
}

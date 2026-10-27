<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Closure;
use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['tenant_id', 'id', 'code', 'title', 'subject', 'academic_level_id', 'class_group_id', 'credit_hours', 'periods_per_week', 'pass_percent', 'description', 'term', 'category', 'teacher_id', 'is_archived', 'is_public', 'marketplace_status', 'slug', 'subtitle', 'level', 'language', 'price_cents', 'currency', 'outcomes', 'requirements', 'marketplace_published_at'])]
class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected static function booted(): void
    {
        // New courses are priced in their workspace's own currency.
        static::creating(function (Course $course): void {
            $course->currency ??= Tenant::find($course->tenant_id)?->currency();
        });
    }

    protected function casts(): array
    {
        return [
            'is_archived' => 'boolean',
            'is_public' => 'boolean',
            'price_cents' => 'integer',
            'credit_hours' => 'float',
            'periods_per_week' => 'integer',
            'pass_percent' => 'integer',
            'outcomes' => 'array',
            'requirements' => 'array',
            'marketplace_published_at' => 'datetime',
        ];
    }

    /**
     * Courses anyone can find and buy in the public catalog.
     *
     * @param  Builder<Course>  $query
     */
    public function scopeOnMarketplace(Builder $query): void
    {
        $query->where('is_public', true)->where('marketplace_status', 'published')->where('is_archived', false);
    }

    public function isOnMarketplace(): bool
    {
        return $this->is_public && $this->marketplace_status === 'published' && ! $this->is_archived;
    }

    public function isFree(): bool
    {
        return $this->price_cents === 0;
    }

    /**
     * @return HasMany<CourseSection, $this>
     */
    public function sections(): HasMany
    {
        return $this->hasMany(CourseSection::class)->orderBy('position');
    }

    /**
     * @return HasMany<Lecture, $this>
     */
    public function lectures(): HasMany
    {
        return $this->hasMany(Lecture::class);
    }

    /**
     * @return HasMany<CourseAccess, $this>
     */
    public function accesses(): HasMany
    {
        return $this->hasMany(CourseAccess::class);
    }

    /**
     * Limits courses to what the membership may see: staff see all,
     * students see their enrollments, parents see their child's.
     *
     * @param  Builder<Course>  $query
     */
    public function scopeVisibleTo(Builder $query, Membership $membership): void
    {
        if ($membership->role->isStaff()) {
            return;
        }

        $query->whereHas('enrollments', fn (Builder $q) => $q->where('student_id', $membership->learnerId()));
    }

    /**
     * withCount() entries for lesson progress ("lesson 5 of 7"): online lessons
     * planned (not canceled) and already held.
     *
     * @return array<string, Closure(Builder<LiveLesson>): void>
     */
    public static function lessonCounts(): array
    {
        return [
            'liveLessons as lessons_count' => fn (Builder $q) => $q->where('status', '!=', 'canceled'),
            'liveLessons as lessons_done_count' => fn (Builder $q) => $q->where('status', 'ended'),
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * @return BelongsTo<AcademicLevel, $this>
     */
    public function academicLevel(): BelongsTo
    {
        return $this->belongsTo(AcademicLevel::class);
    }

    /**
     * @return BelongsTo<ClassGroup, $this>
     */
    public function classGroup(): BelongsTo
    {
        return $this->belongsTo(ClassGroup::class);
    }

    /**
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'enrollments', 'course_id', 'student_id')->withTimestamps();
    }

    /**
     * @return HasMany<Assessment, $this>
     */
    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class);
    }

    /**
     * @return HasMany<ClassSession, $this>
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(ClassSession::class);
    }

    /**
     * @return HasMany<LiveLesson, $this>
     */
    public function liveLessons(): HasMany
    {
        return $this->hasMany(LiveLesson::class);
    }

    /**
     * @return HasMany<LessonRecording, $this>
     */
    public function recordings(): HasMany
    {
        return $this->hasMany(LessonRecording::class);
    }

    /**
     * @return HasMany<CourseReview, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(CourseReview::class);
    }

    /**
     * @return HasMany<Material, $this>
     */
    public function materials(): HasMany
    {
        return $this->hasMany(Material::class);
    }
}

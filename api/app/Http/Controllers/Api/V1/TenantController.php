<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Membership;
use App\Models\Tenant;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Validation\ValidationException;

/**
 * Base for controllers that run inside a tenant (behind the `tenant` middleware).
 */
abstract class TenantController extends Controller
{
    protected function tenant(): Tenant
    {
        return app(CurrentTenant::class)->get();
    }

    protected function membership(): Membership
    {
        return app(CurrentTenant::class)->membership();
    }

    protected function ensureCanSeeCourse(Course $course): void
    {
        $visible = Course::query()->visibleTo($this->membership())->whereKey($course->getKey())->exists();

        abort_unless($visible, 404);
    }

    /**
     * @param  list<int>  $studentIds
     */
    protected function ensureEnrolled(Course $course, array $studentIds): void
    {
        $enrolled = $course->enrollments()->whereIn('student_id', $studentIds)->pluck('student_id')->all();
        $missing = array_values(array_diff(array_unique($studentIds), $enrolled));

        if ($missing !== []) {
            throw ValidationException::withMessages(['student_id' => __('Students not enrolled in this course: :students', ['students' => implode(', ', $missing)])]);
        }
    }
}

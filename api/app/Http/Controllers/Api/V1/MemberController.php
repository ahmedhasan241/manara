<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Models\ActivityLog;
use App\Models\Course;
use App\Models\Guardianship;
use App\Models\Membership;
use App\Models\User;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MemberController extends TenantController
{
    public function index(Request $request): LengthAwarePaginator
    {
        Gate::authorize('courses.manage');

        return Membership::query()
            ->with('user:id,name,email,last_login_at,country,city,area')
            ->when($request->query('role'), fn ($q, $role) => $q->where('role', $role))
            ->when($request->query('search'), fn ($q, $search) => $q->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")))
            ->orderBy('role')
            ->paginate(min($request->integer('per_page', 50), 200));
    }

    /**
     * Adds a person to the workspace. New users get a password-reset link to set
     * their own password.
     */
    public function store(Request $request): JsonResponse
    {
        Gate::authorize('members.manage');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'role' => ['required', Rule::enum(Role::class)->except([Role::Owner])],
            'student_number' => ['nullable', 'string', 'max:60'],
            'children' => ['nullable', 'required_if:role,parent', 'array', 'max:10'],
            'children.*' => ['integer', Rule::exists('memberships', 'user_id')->where('tenant_id', $this->tenant()->id)->where('role', Role::Student->value)],
            'relationship' => ['nullable', 'string', 'max:40'],
        ]);

        $membership = DB::transaction(function () use ($data) {
            $user = User::firstOrCreate(
                ['email' => strtolower($data['email'])],
                ['name' => $data['name'], 'password' => Str::password(32)],
            );

            $membership = Membership::updateOrCreate(
                ['user_id' => $user->id],
                collect($data)->only(['role', 'student_number'])->all(),
            );

            foreach ($data['children'] ?? [] as $studentId) {
                Guardianship::firstOrCreate(
                    ['guardian_id' => $user->id, 'student_id' => $studentId],
                    ['relationship' => $data['relationship'] ?? null],
                );
            }

            return $membership;
        });

        if ($membership->wasRecentlyCreated && $membership->user->wasRecentlyCreated) {
            Password::sendResetLink(['email' => $membership->user->email]);
        }

        ActivityLog::record('member.added', $membership, ['role' => $data['role']]);

        return response()->json($membership->load('user:id,name,email'), 201);
    }

    /**
     * Adds many people at once (pasted from a spreadsheet), optionally enrolling
     * new students in a course. Existing members keep their role.
     */
    public function bulk(Request $request): JsonResponse
    {
        Gate::authorize('members.manage');

        $data = $request->validate([
            'role' => ['required', Rule::in([Role::Student->value, Role::Teacher->value, Role::Parent->value])],
            'people' => ['required', 'array', 'min:1', 'max:500'],
            'people.*.name' => ['required', 'string', 'max:120'],
            'people.*.email' => ['required', 'email', 'max:190'],
            'people.*.student_number' => ['nullable', 'string', 'max:60'],
            'course_id' => ['nullable', 'uuid', Rule::exists('courses', 'id')->where('tenant_id', $this->tenant()->id)],
        ]);

        $added = 0;
        $existing = 0;
        DB::transaction(function () use ($data, &$added, &$existing): void {
            $course = isset($data['course_id']) ? Course::find($data['course_id']) : null;

            foreach ($data['people'] as $person) {
                $user = User::firstOrCreate(
                    ['email' => strtolower($person['email'])],
                    ['name' => $person['name'], 'password' => Str::password(32)],
                );
                $membership = Membership::firstOrCreate(
                    ['user_id' => $user->id],
                    ['role' => $data['role'], 'student_number' => $person['student_number'] ?? null],
                );
                $membership->wasRecentlyCreated ? $added++ : $existing++;

                if ($course && $membership->role === Role::Student) {
                    $course->enrollments()->firstOrCreate(['student_id' => $user->id]);
                    if ($course->is_public) {
                        app(Marketplace::class)->grant($user, $course, 'enrollment');
                    }
                }
                if ($user->wasRecentlyCreated) {
                    Password::sendResetLink(['email' => $user->email]);
                }
            }
        });

        ActivityLog::record('member.bulk_added', $this->tenant(), ['role' => $data['role'], 'added' => $added]);

        return response()->json(['added' => $added, 'existing' => $existing], 201);
    }

    public function update(Request $request, Membership $membership): Membership
    {
        Gate::authorize('members.manage');
        abort_if($membership->role === Role::Owner, 422, __('The owner role cannot be changed here.'));

        $membership->update($request->validate([
            'role' => ['sometimes', Rule::enum(Role::class)->except([Role::Owner])],
            'student_number' => ['nullable', 'string', 'max:60'],
        ]));

        ActivityLog::record('member.updated', $membership, $membership->getChanges());

        return $membership;
    }

    public function destroy(Membership $membership): JsonResponse
    {
        Gate::authorize('members.manage');
        abort_if($membership->role === Role::Owner, 422, __('The owner cannot be removed.'));

        $membership->delete();
        ActivityLog::record('member.removed', $membership);

        return response()->json(null, 204);
    }
}

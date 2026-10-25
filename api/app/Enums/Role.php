<?php

namespace App\Enums;

enum Role: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Teacher = 'teacher';
    case Student = 'student';
    case Parent = 'parent';

    /**
     * Every permission the API checks. Gates are registered for each one.
     *
     * @var list<string>
     */
    public const array PERMISSIONS = [
        'tenant.manage',
        'members.manage',
        'courses.manage',
        'courses.view',
        'grades.write',
        'grades.view',
        'attendance.write',
        'attendance.view',
        'materials.write',
        'materials.view',
        'announcements.write',
        'reports.view',
        'activity.view',
    ];

    /**
     * Permissions granted to this role inside its tenant.
     *
     * @return list<string>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner, self::Admin => self::PERMISSIONS,
            self::Teacher => [
                'courses.manage', 'courses.view',
                'grades.write', 'grades.view',
                'attendance.write', 'attendance.view',
                'materials.write', 'materials.view',
                'announcements.write', 'reports.view',
            ],
            self::Student, self::Parent => [
                'courses.view', 'grades.view', 'attendance.view', 'materials.view',
            ],
        };
    }

    public function can(string $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }

    /**
     * Staff roles see every record in the tenant; learners only see their own.
     */
    public function isStaff(): bool
    {
        return in_array($this, [self::Owner, self::Admin, self::Teacher], true);
    }
}

<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A grade level (school) or study year (university) inside an education stage.
 */
#[Fillable(['tenant_id', 'stage', 'name', 'department', 'position'])]
class AcademicLevel extends Model
{
    use BelongsToTenant, HasUuids;

    /** School stages, then higher-education stages. */
    public const array STAGES = ['kindergarten', 'primary', 'preparatory', 'secondary', 'diploma', 'undergraduate', 'postgraduate'];

    /**
     * @return HasMany<ClassGroup, $this>
     */
    public function groups(): HasMany
    {
        return $this->hasMany(ClassGroup::class)->orderBy('name');
    }

    /**
     * @return HasMany<Course, $this>
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}

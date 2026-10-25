<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - Parents can follow several children (guardianships replace memberships.guardian_of_id).
     * - Platform staff can suspend any user.
     * - The product website's text is editable from the platform admin.
     */
    public function up(): void
    {
        Schema::create('guardianships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guardian_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('relationship')->nullable(); // mother, father, guardian...
            $table->timestamps();
            $table->unique(['tenant_id', 'guardian_id', 'student_id']);
            $table->index(['tenant_id', 'student_id']);
        });

        DB::table('memberships')->whereNotNull('guardian_of_id')->orderBy('id')->each(function ($m): void {
            DB::table('guardianships')->insert([
                'tenant_id' => $m->tenant_id,
                'guardian_id' => $m->user_id,
                'student_id' => $m->guardian_of_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        Schema::table('memberships', function (Blueprint $table) {
            $table->dropConstrainedForeignId('guardian_of_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable()->after('is_platform_admin');
            $table->string('suspension_reason')->nullable()->after('suspended_at');
        });

        Schema::create('site_content', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // hero, audiences, benefits, testimonials, faq, cta, stats
            $table->json('content');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_content');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['suspended_at', 'suspension_reason']);
        });
        Schema::table('memberships', function (Blueprint $table) {
            $table->foreignId('guardian_of_id')->nullable()->constrained('users')->nullOnDelete();
        });
        Schema::dropIfExists('guardianships');
    }
};

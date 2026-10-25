<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A public profile for people who teach: a one-line headline
     * ("Consultant cardiologist") and a short bio, shown on their page in the
     * learner portal.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('headline', 160)->nullable()->after('name');
            $table->text('bio')->nullable()->after('headline');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['headline', 'bio']);
        });
    }
};

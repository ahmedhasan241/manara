<?php

use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - Website sections are edited per language (existing edits were English).
     * - Plans carry their name, description and features in other languages.
     */
    public function up(): void
    {
        Schema::table('site_content', function (Blueprint $table) {
            $table->dropUnique(['key']);
            $table->string('locale', 5)->default('en')->after('key');
            $table->unique(['key', 'locale']);
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('features');
        });

        foreach (DB::table('plans')->pluck('code') as $code) {
            if ($translations = Plan::defaultTranslations($code)) {
                DB::table('plans')->where('code', $code)->update(['translations' => json_encode($translations, JSON_UNESCAPED_UNICODE)]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('translations');
        });

        Schema::table('site_content', function (Blueprint $table) {
            $table->dropUnique(['key', 'locale']);
            $table->dropColumn('locale');
            $table->unique('key');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Orders are charged in the course currency, but remember the currency the
     * buyer was viewing prices in and the rate at that moment, so receipts can
     * show both.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('display_currency', 3)->nullable()->after('currency');
            $table->decimal('exchange_rate', 16, 6)->nullable()->after('display_currency');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['display_currency', 'exchange_rate']);
        });
    }
};

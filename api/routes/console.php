<?php

use App\Services\Currencies;
use App\Services\LiveLessons;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('lessons:tick', function (LiveLessons $lessons) {
    $reminded = $lessons->sendReminders();
    $closed = $lessons->closeAbandoned();
    $this->info("Reminders sent: {$reminded}. Abandoned lessons closed: {$closed}.");
})->purpose('Send "starting soon" reminders and close lessons left running');

Artisan::command('currencies:refresh', function (Currencies $currencies) {
    $currencies->refresh() ? $this->info('Exchange rates updated.') : $this->warn('Could not reach the rates service; keeping the last rates.');
})->purpose('Fetch live exchange rates for showing prices in local currencies');

Schedule::command('currencies:refresh')->hourly()->withoutOverlapping();
Schedule::command('lessons:tick')->everyMinute()->withoutOverlapping();

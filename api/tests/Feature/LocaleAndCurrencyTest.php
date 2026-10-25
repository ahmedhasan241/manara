<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Currencies;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LocaleAndCurrencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_follow_the_requested_language(): void
    {
        $this->getJson('/api/v1/me', ['X-Locale' => 'ar'])->assertUnauthorized()->assertJsonPath('message', 'يجب تسجيل الدخول.');
        $this->getJson('/api/v1/me', ['X-Locale' => 'fr'])->assertJsonPath('message', 'Non authentifié.');

        $this->postJson('/api/v1/auth/login', ['email' => 'not-an-email'], ['X-Locale' => 'es'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'correo debe ser un correo válido.');
    }

    public function test_unknown_language_falls_back_to_the_browser_then_the_default(): void
    {
        $this->getJson('/api/v1/me', ['X-Locale' => 'xx', 'Accept-Language' => 'pt-BR,pt;q=0.9'])->assertJsonPath('message', 'Não autenticado.');
        $this->getJson('/api/v1/me', ['X-Locale' => 'xx'])->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_the_language_is_remembered_for_notifications(): void
    {
        $user = User::factory()->create(['locale' => 'en']);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/me', ['X-Locale' => 'zh'])->assertOk();

        $this->assertSame('zh', $user->fresh()->preferredLocale());
    }

    public function test_rates_use_fallbacks_until_refreshed_and_keep_them_on_failure(): void
    {
        $this->getJson('/api/v1/currencies')->assertOk()
            ->assertJsonPath('base', 'USD')
            ->assertJsonPath('live', false)
            ->assertJsonPath('rates.SAR', 3.75);

        Http::fake(['*' => Http::response(['rates' => ['SAR' => 3.76, 'EGP' => 50.1]])]);
        $this->artisan('currencies:refresh')->assertSuccessful();

        $this->getJson('/api/v1/currencies')
            ->assertJsonPath('live', true)
            ->assertJsonPath('rates.EGP', 50.1)
            ->assertJsonPath('rates.EUR', 0.92);

        Http::fake(['*' => Http::response('down', 500)]);
        $this->artisan('currencies:refresh')->assertSuccessful();
        $this->getJson('/api/v1/currencies')->assertJsonPath('rates.EGP', 50.1);

        $this->assertSame(10020, app(Currencies::class)->convert(200, 'USD', 'EGP'));
    }

    public function test_orders_remember_the_currency_the_buyer_saw(): void
    {
        $tenant = Tenant::factory()->create();
        $course = Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'marketplace_status' => 'published', 'slug' => 'priced', 'price_cents' => 2000]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/orders', ['course_ids' => [$course->id]], ['X-Currency' => 'SAR'])
            ->assertCreated()
            ->assertJsonPath('order.total_cents', 2000)
            ->assertJsonPath('order.currency', 'USD')
            ->assertJsonPath('order.display_currency', 'SAR')
            ->assertJsonPath('order.exchange_rate', 3.75);
    }
}

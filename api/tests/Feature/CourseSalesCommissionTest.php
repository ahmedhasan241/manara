<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Course;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CourseSalesCommissionTest extends TestCase
{
    use RefreshDatabase;

    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.payments.platform_fee_percent' => 30]);
        $this->plan = Plan::factory()->create(['code' => 'school', 'commission_percent' => 15]);
        $this->plan->prices()->create(['country' => 'SA', 'currency' => 'SAR', 'price_monthly_cents' => 749900, 'price_yearly_cents' => 7499000, 'commission_percent' => 12]);
    }

    private function seller(string $country, ?string $status = 'active'): Tenant
    {
        $tenant = Tenant::factory()->create(['country' => $country]);
        if ($status !== null) {
            Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $this->plan->id, 'status' => $status, 'interval' => 'monthly', 'country' => $country]);
        }

        return $tenant;
    }

    private function course(Tenant $tenant, int $price, string $slug): Course
    {
        return Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'marketplace_status' => 'published', 'slug' => $slug, 'price_cents' => $price]);
    }

    /**
     * Buys the course as a new learner and returns the paid order's first item.
     *
     * @return array<string, mixed>
     */
    private function buy(Course $course): array
    {
        Sanctum::actingAs(User::factory()->create());
        $order = $this->postJson('/api/v1/orders', ['course_ids' => [$course->id]])->assertCreated()->json('order');
        $this->postJson("/api/v1/orders/{$order['id']}/pay")->assertOk();

        return $order['items'][0];
    }

    public function test_new_courses_are_priced_in_the_sellers_currency(): void
    {
        $this->assertSame('SAR', $this->course($this->seller('SA'), 19900, 'riyadh')->currency);
        $this->assertSame('EGP', $this->course($this->seller('EG'), 49900, 'cairo')->currency);
        $this->assertSame('BRL', $this->course($this->seller('BR'), 9900, 'rio')->currency);
        // Countries without a supported currency price in the base currency.
        $this->assertSame('USD', $this->course($this->seller('KE'), 2900, 'nairobi')->currency);
    }

    public function test_commission_follows_the_sellers_package_and_country(): void
    {
        // Saudi seller on the School package: the Saudi rate.
        $this->assertSame(12, $this->buy($this->course($this->seller('SA'), 19900, 'saudi-course'))['commission_percent']);
        // Egyptian seller on the same package, no Egyptian rate: the package's rate.
        $this->assertSame(15, $this->buy($this->course($this->seller('EG'), 49900, 'egypt-course'))['commission_percent']);
        // Seller whose package lapsed: the default rate.
        $this->assertSame(30, $this->buy($this->course($this->seller('EG', 'canceled'), 49900, 'lapsed-course'))['commission_percent']);
    }

    public function test_sales_report_uses_each_sales_commission_in_the_sellers_currency(): void
    {
        $seller = $this->seller('SA');
        $this->buy($this->course($seller, 10000, 'hundred-riyals'));
        $owner = $this->member($seller, Role::Owner);

        $this->asMember($owner, $seller, 'GET', '/api/v1/sales')->assertOk()
            ->assertJsonPath('currency', 'SAR')
            ->assertJsonPath('revenue_cents', 10000)
            ->assertJsonPath('earnings_cents', 8800)
            ->assertJsonPath('platform_fee_percent', 12);
    }

    public function test_public_plans_show_their_commission(): void
    {
        $this->getJson('/api/v1/plans', ['X-Country' => 'SA'])->assertJsonPath('0.commission_percent', 12);
        $this->getJson('/api/v1/plans', ['X-Country' => 'EG'])->assertJsonPath('0.commission_percent', 15);
    }
}

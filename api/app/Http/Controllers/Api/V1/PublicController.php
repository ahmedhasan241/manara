<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Plan;
use App\Models\SiteContent;
use App\Models\Tenant;
use App\Services\Currencies;
use App\Services\PlanPricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Unauthenticated endpoints for the marketing site and subscriber websites.
 */
class PublicController extends Controller
{
    /**
     * Exchange rates for showing prices in the visitor's currency.
     */
    public function currencies(Currencies $currencies): JsonResponse
    {
        return response()->json($currencies->rates());
    }

    /**
     * Active plans, translated and priced for the visitor's country.
     */
    public function plans(Request $request, PlanPricing $pricing): JsonResponse
    {
        return response()->json($this->publicPlans($request, $pricing));
    }

    /**
     * Everything the product website shows, in one call.
     */
    public function marketing(Request $request, PlanPricing $pricing): JsonResponse
    {
        return response()->json([
            ...SiteContent::allSections(),
            'plans' => $this->publicPlans($request, $pricing),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function publicPlans(Request $request, PlanPricing $pricing): array
    {
        $country = $pricing->countryFrom($request);

        return Plan::with('prices')->where('is_active', true)->orderBy('sort_order')->get()
            ->map(fn (Plan $plan) => $pricing->present($plan, $country))
            ->all();
    }

    public function site(string $slug): JsonResponse
    {
        $tenant = Tenant::where('slug', $slug)->where('status', 'active')->firstOrFail();

        $news = Announcement::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereNull('course_id')
            ->whereNotNull('published_at')
            ->where('priority', '!=', 'urgent')
            ->latest('published_at')
            ->limit(6)
            ->get(['id', 'title', 'body', 'published_at']);

        return response()->json([
            'slug' => $tenant->slug,
            'name' => $tenant->name,
            'type' => $tenant->type,
            'locale' => $tenant->locale,
            'branding' => $tenant->branding ?? (object) [],
            'site' => $tenant->site ?? (object) [],
            'news' => $news,
        ]);
    }
}

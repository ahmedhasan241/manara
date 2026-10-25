<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Plan;
use App\Models\SiteContent;
use App\Models\Tenant;
use App\Services\Currencies;
use Illuminate\Http\JsonResponse;

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

    public function plans(): JsonResponse
    {
        return response()->json(Plan::where('is_active', true)->orderBy('sort_order')->get()->map->localized());
    }

    /**
     * Everything the product website shows, in one call.
     */
    public function marketing(): JsonResponse
    {
        return response()->json([
            ...SiteContent::allSections(),
            'plans' => Plan::where('is_active', true)->orderBy('sort_order')->get()->map->localized(),
        ]);
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

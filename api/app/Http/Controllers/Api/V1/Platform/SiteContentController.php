<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SiteContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Edits the product website's text, one language at a time (the language the
 * admin is using, from X-Locale). Each section has its own shape; the rules
 * below keep edits in that shape so the site always renders.
 */
class SiteContentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([...SiteContent::allSections(), 'locale' => app()->getLocale()]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        abort_unless(array_key_exists($key, config('marketing.sections')), 404);

        $content = $request->validate(['content' => ['required', 'array']])['content'];
        validator(['content' => $content], $this->rules($key))->validate();

        SiteContent::updateOrCreate(['key' => $key, 'locale' => app()->getLocale()], ['content' => $content, 'updated_by' => $request->user()->id]);
        ActivityLog::record('platform.website.updated', null, ['section' => $key, 'locale' => app()->getLocale()]);

        return response()->json(SiteContent::allSections()[$key]);
    }

    /**
     * Restores a section to its default text.
     */
    public function destroy(string $key): JsonResponse
    {
        SiteContent::where('key', $key)->where('locale', app()->getLocale())->delete();

        return response()->json(SiteContent::allSections()[$key] ?? null);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(string $key): array
    {
        $text = ['required', 'string', 'max:300'];
        $long = ['required', 'string', 'max:2000'];

        return match ($key) {
            'hero' => ['content.eyebrow' => $text, 'content.title' => $text, 'content.subtitle' => $long, 'content.primary_cta' => $text, 'content.secondary_cta' => $text],
            'cta' => ['content.title' => $text, 'content.subtitle' => $long, 'content.button' => $text],
            'stats' => ['content' => ['array', 'max:6'], 'content.*.value' => ['required', 'string', 'max:20'], 'content.*.label' => $text],
            'audiences' => [
                'content' => ['array', 'max:6'],
                'content.*.key' => ['required', 'alpha_dash', 'max:30'],
                'content.*.title' => $text,
                'content.*.subtitle' => $long,
                'content.*.benefits' => ['array', 'max:8'],
                'content.*.benefits.*' => $text,
            ],
            'features' => [
                'content' => ['array', 'max:12'],
                'content.*.icon' => ['required', Rule::in(['video', 'grades', 'attendance', 'family', 'messages', 'analytics', 'security', 'mobile', 'materials', 'globe'])],
                'content.*.title' => $text,
                'content.*.body' => $long,
            ],
            'testimonials' => ['content' => ['array', 'max:9'], 'content.*.quote' => $long, 'content.*.name' => $text, 'content.*.role' => $text],
            'faq' => ['content' => ['array', 'max:20'], 'content.*.question' => $text, 'content.*.answer' => $long],
            default => [],
        };
    }
}

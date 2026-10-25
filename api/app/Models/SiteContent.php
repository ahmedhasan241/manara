<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * One editable section of the product website (hero, benefits, FAQ...), in
 * one language. Defaults live in lang/{locale}/marketing.php (English in
 * config/marketing.php); a row here overrides them for that language.
 */
#[Fillable(['key', 'locale', 'content', 'updated_by'])]
class SiteContent extends Model
{
    protected $table = 'site_content';

    protected function casts(): array
    {
        return ['content' => 'array'];
    }

    /**
     * Default text for every section in a language.
     *
     * @return array<string, mixed>
     */
    public static function defaults(string $locale): array
    {
        $translated = trans('marketing.sections', [], $locale);

        return is_array($translated) ? $translated + config('marketing.sections') : config('marketing.sections');
    }

    /**
     * Every section in a language (the request's by default), edits over defaults.
     *
     * @return array<string, mixed>
     */
    public static function allSections(?string $locale = null): array
    {
        $locale ??= app()->getLocale();
        $stored = static::query()->where('locale', $locale)->pluck('content', 'key')->map(fn ($c) => is_string($c) ? json_decode($c, true) : $c);

        return collect(static::defaults($locale))
            ->map(fn (array $default, string $key) => $stored[$key] ?? $default)
            ->all();
    }
}

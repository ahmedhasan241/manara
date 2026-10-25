<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Google's public sample-video bucket now answers 403, so seeded lectures
     * pointing at it could not play. Swap them for openly licensed copies.
     *
     * @var array<string, string>
     */
    private const array REPLACEMENTS = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' => 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' => 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' => 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' => 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' => 'https://archive.org/download/Sintel/sintel-2048-surround_512kb.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' => 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' => 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' => 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' => 'https://archive.org/download/Sintel/sintel-2048-surround_512kb.mp4',
    ];

    public function up(): void
    {
        foreach (self::REPLACEMENTS as $dead => $working) {
            DB::table('lectures')->where('video_url', $dead)->update(['video_url' => $working]);
        }
    }

    public function down(): void
    {
        foreach (self::REPLACEMENTS as $dead => $working) {
            DB::table('lectures')->where('video_url', $working)->update(['video_url' => $dead]);
        }
    }
};

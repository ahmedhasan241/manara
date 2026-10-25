<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Certificates of completion: a learner's own list, and public verification
 * by code (for employers or schools checking a certificate).
 */
class CertificateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Certificate::where('user_id', $request->user()->id)->with('course:id,slug')->latest('issued_at')->get()->map->toPublicArray());
    }

    public function verify(string $code): JsonResponse
    {
        $certificate = Certificate::with('course:id,slug')->where('code', strtoupper($code))->firstOrFail();

        return response()->json($certificate->toPublicArray());
    }
}

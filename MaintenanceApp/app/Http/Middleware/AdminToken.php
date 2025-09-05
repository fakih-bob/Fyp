<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminToken
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next)
    {
        $expected = 'Bearer ' . config('app.admin_demo_token', 'admin-demo-token');
        if ($request->header('Authorization') !== $expected) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        // mark request as admin if your controller wants to know
        $request->attributes->set('is_admin', true);
        return $next($request);
    }
}

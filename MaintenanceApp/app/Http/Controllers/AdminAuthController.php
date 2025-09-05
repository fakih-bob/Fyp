<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate(['username'=>'required', 'password'=>'required']);
        if ($request->username === 'admin' && $request->password === 'admin') {
            return response()->json([
                'status' => 'success',
                'token'  => config('app.admin_demo_token', 'admin-demo-token'),
            ]);
        }
        return response()->json(['error'=>'Invalid credentials'], 401);
    }
}

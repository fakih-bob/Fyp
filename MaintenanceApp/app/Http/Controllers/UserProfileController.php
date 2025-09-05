<?php

namespace App\Http\Controllers;

use App\Models\User;
use Auth;
use DB;
use Hash;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserProfileController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        return response()->json($user);
    }

    // Update the authenticated user's profile
    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => ['string', 'max:255'],
            'email' => ['email', Rule::unique('users')->ignore($user->id)],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:6', 'confirmed'], // password_confirmation field expected
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (array_key_exists('phone_number', $validated)) {
            $user->phone_number = $validated['phone_number'];
        }
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user,
        ]);
    }

    // Delete the authenticated user's profile (account)
    public function destroy()
    {
        $user = Auth::user();

        // Optional: You can add checks here, e.g. prevent deletion for certain roles

        $user->delete();

        return response()->json([
            'message' => 'User profile deleted successfully',
        ]);
    }


     public function RestrictAndUnresctrict(User $user, Request $request)
    {
        // Flip the flag
        $user->is_restricted = ! $user->is_restricted;
        $user->save();

        // Kill sessions if restricting
        if ($user->is_restricted) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        $status = $user->is_restricted ? 'restricted' : 'unrestricted';

        return response()->json([
            'message' => "{$user->name} has been {$status}.",
            'is_restricted' => $user->is_restricted,
        ]);
    }
}

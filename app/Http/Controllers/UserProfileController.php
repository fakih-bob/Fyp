<?php

namespace App\Http\Controllers;

use Auth;
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
}

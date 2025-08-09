<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class OrganizationController extends Controller
{
    public function store(Request $request)
{
    $request->validate([
        'name'        => 'required|string|max:255',
        'description' => 'nullable|string',
        'photo'       => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
    ]);

    $url = null;

    if ($request->hasFile('photo')) {
        $path = $request->file('photo')->store('public/organizations');
        $url = Storage::url($path);
    }

    $organization = Organization::create([
        'name'        => $request->name,
        'description' => $request->description,
        'url'         => $url,
        'owner_id'    => Auth::id(),
    ]);

    $user = User::find(Auth::id());
    if (!$user) {
        return response()->json(['error' => 'User not found'], 404);
    }
    $user->role='owner';
    $user->save();

    return response()->json([
        "status" => "organization created successfully",
        "data" => $organization
    ], 200);
}

public function getAllOrganizations()
    {
        $organizations = Organization::all();

        return response()->json([
            'status' => 'success',
            'organizations' => $organizations,
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $organization = Organization::findOrFail($id);

        if ($organization->owner_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'photo'       => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('public/organizations');
            $organization->url = Storage::url($path);
        }

        $organization->update($request->only('name', 'description', 'url'));

        return response()->json($organization);
    }

    public function destroy($id)
    {
        $organization = Organization::findOrFail($id);

        if ($organization->owner_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = User::find(Auth::id());
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        $user->role='user';
        $user->save();

        $organization->delete();

       return response()->json(['message' => 'Organization Deleted successfuly'], 200);
    }

public function getMyOrganization()
{
    $user = Auth::user();

    if (!$user || $user->role !== 'owner') {
        return response()->json(['error' => 'Unauthorized or not an owner'], 403);
    }

    $organization = Organization::where('owner_id', $user->id)->get();

    if (!$organization) {
        return response()->json(['message' => 'Organization not found'], 404);
    }

    return response()->json([
        'organization' => $organization
    ], 200);
}


    
}

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
        try {
            $organization = Organization::findOrFail($id);
            $currentUserId = Auth::id();
            
            // Debug logging
            \Log::info('Delete attempt', [
                'organization_id' => $id,
                'organization_owner_id' => $organization->owner_id,
                'current_user_id' => $currentUserId,
                'user_role' => Auth::user()->role ?? 'unknown'
            ]);

            if ($organization->owner_id !== $currentUserId) {
                \Log::warning('Unauthorized delete attempt', [
                    'organization_id' => $id,
                    'organization_owner_id' => $organization->owner_id,
                    'current_user_id' => $currentUserId
                ]);
                return response()->json(['error' => 'Unauthorized: You can only delete organizations you own'], 403);
            }

            $user = User::find($currentUserId);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // Delete the organization first
            $organization->delete();
            
            // Only change role to user if they have no other organizations
            $remainingOrgs = Organization::where('owner_id', $currentUserId)->count();
            if ($remainingOrgs === 0) {
                $user->role = 'user';
                $user->save();
            }

            \Log::info('Organization deleted successfully', ['organization_id' => $id]);
            return response()->json(['message' => 'Organization deleted successfully'], 200);
            
        } catch (\Exception $e) {
            \Log::error('Error deleting organization', [
                'organization_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to delete organization'], 500);
        }
    }

public function getMyOrganization()
{
    try {
        $user = Auth::user();
        
        \Log::info('Fetching user organizations', [
            'user_id' => $user->id ?? 'unknown',
            'user_role' => $user->role ?? 'unknown'
        ]);

        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        // Get organizations owned by this user
        $organizations = Organization::where('owner_id', $user->id)->get();
        
        // Manually add counts to avoid relationship issues
        foreach ($organizations as $org) {
            try {
                $org->departments_count = $org->departments()->count();
            } catch (\Exception $e) {
                \Log::warning('Failed to count departments', ['org_id' => $org->id, 'error' => $e->getMessage()]);
                $org->departments_count = 0;
            }
            // For users count, we'll use a simpler approach or set to 0 for now
            $org->users_count = 0; // TODO: Implement proper user counting via department relationships
        }

        \Log::info('Organizations found', [
            'user_id' => $user->id,
            'organization_count' => $organizations->count()
        ]);

        // If user has organizations but role is not 'owner', update their role
        if ($organizations->count() > 0 && $user->role !== 'owner') {
            $user->role = 'owner';
            $user->save();
            \Log::info('Updated user role to owner', ['user_id' => $user->id]);
        }

        return response()->json([
            'organization' => $organizations,
            'user_role' => $user->role
        ], 200);
        
    } catch (\Exception $e) {
        \Log::error('Error fetching user organizations', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json(['error' => 'Failed to fetch organizations'], 500);
    }
}


    
}

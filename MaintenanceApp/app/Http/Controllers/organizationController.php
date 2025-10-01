<?php

namespace App\Http\Controllers;

use App\Models\Department;
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

    public function getAllUsers()
    {
        $Users = User::all();

        return response()->json([
            'status' => 'success',
            'Users' => $Users,
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

  public function destroy(Request $request, $id)
{
    $organization = Organization::findOrFail($id);

    // 👇 This flag is set by your admin.token middleware
    $isAdmin = (bool) $request->attributes->get('is_admin');

    // Only enforce the owner check for NON-admins
    if (!$isAdmin) {
        if ($organization->owner_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // keep your original user->role reset behavior for regular users
        $user = \App\Models\User::find(auth()->id());
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        $user->role = 'user';
        $user->save();
    }

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

  public function assignOperator(Request $request, Organization $organization)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $user = User::findOrFail($data['user_id']); // Eloquent only

        // 1) Set operator_id on the organization
        $organization->operator_id = $user->id;
        $organization->save(); // Eloquent save

        // 2) Set user's role to "operator"
        if (method_exists($user, 'syncRoles')) {
            // Spatie laravel-permission
            $user->syncRoles(['operator']);
        } else {
            // Fallback: simple 'role' column
            $user->role = 'operator';
            $user->save();
        }

        return response()->json([
            'message' => 'Operator assigned.',
            'organization_id' => $organization->id,
            'operator_user_id' => $user->id,
        ], 200);
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        // Role check (Spatie or fallback "role" column)
        $isOperator = false;
        if (method_exists($user, 'hasRole')) {
            $isOperator = $user->hasRole('operator');
        } else {
            $isOperator = ($user->role ?? null) === 'operator';
        }

        if (!$isOperator) {
            // You can relax this if you want to allow *any* authenticated user
            // who is set as operator_id on an org, but role check is usually safer.
            // If you want to rely solely on operator_id matching, remove this block.
            return response()->json(['message' => 'Forbidden. Only operators can access this endpoint.'], 403);
        }

        $orgId = $request->query('organization_id');

        if ($orgId !== null) {
            // Validate organization_id
            if (!is_numeric($orgId)) {
                return response()->json(['message' => 'Invalid organization_id.'], 422);
            }

            // Ensure this org is assigned to the operator (by operator_id)
            $org = Organization::query()
                ->select(['id', 'name'])
                ->where('id', (int)$orgId)
                ->where('operator_id', $user->id)
                ->first();

            if (!$org) {
                return response()->json([
                    'message' => 'Organization not found or not assigned to this operator.'
                ], 404);
            }

            $departments = Department::query()
                ->select(['id', 'name', 'organization_id'])
                ->where('organization_id', $org->id)
                ->orderBy('name')
                ->get();

            return response()->json([
                'organization' => [
                    'id'   => $org->id,
                    'name' => $org->name,
                ],
                'departments' => $departments,
            ], 200);
        }

        // No orgId provided → return all orgs assigned to this operator, with departments eager-loaded.
        $orgs = Organization::query()
            ->select(['id', 'name'])
            ->where('operator_id', $user->id)
            ->with(['departments' => function ($q) {
                $q->select(['id', 'name', 'organization_id'])->orderBy('name');
            }])
            ->orderBy('name')
            ->get();

        if ($orgs->isEmpty()) {
            return response()->json([
                'message' => 'No organizations assigned to this operator.'
            ], 404);
        }

        $payload = $orgs->map(function (Organization $org) {
            return [
                'id'          => $org->id,
                'name'        => $org->name,
                'departments' => $org->departments,
            ];
        })->values();

        return response()->json([
            'organizations' => $payload
        ], 200);
    }

}

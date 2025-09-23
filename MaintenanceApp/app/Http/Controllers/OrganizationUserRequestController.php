<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Organization;
use App\Models\OrganizationUserRequest;
use App\Models\User;
use DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrganizationUserRequestController extends Controller
{
    
    public function MakeRequestToOrganization(Request $request)
{
    // Validate and ensure the organization exists
    $validated = $request->validate([
        'organization_id' => 'required|integer|exists:organizations,id',
    ]);

    $userId = Auth::id();
    $orgId  = (int) $validated['organization_id'];

    // === 1) Block if user is already in ANY organization ===
    // If your pivot has a 'status' column, we only consider approved/accepted as active membership.
    // If there's no 'status' column, any row means "already a member".
    $alreadyInAnyOrganization = DB::table('organization_user_requests')
        ->where('user_id', $userId)
        ->when(
            DB::getSchemaBuilder()->hasColumn('organization_user_requests', 'status'),
            function ($q) {
                $q->whereIn('status', ['approved', 'accepted', 1]); // adapt to your actual "approved" values
            }
        )
        ->exists();

    if ($alreadyInAnyOrganization) {
        return response()->json([
            'message' => "You're already in an organization. Please leave it before joining another."
        ], 409);
    }

    // === 2) Block duplicate request to the SAME organization (any status) ===
    $existing = OrganizationUserRequest::where('user_id', $userId)
        ->where('organization_id', $orgId)
        ->first();

    if ($existing) {
        return response()->json(['message' => 'Request already exists.'], 409);
    }

    // (Optional but safe) If you also treat an accepted request as membership anywhere, block that too:
    $hasAcceptedRequestAnywhere = OrganizationUserRequest::where('user_id', $userId)
        ->whereIn('status', ['approved', 'accepted', 1]) // align to your values
        ->exists();

    if ($hasAcceptedRequestAnywhere) {
        return response()->json([
            'message' => "You're already in an organization."
        ], 409);
    }

    // === 3) Create the new request ===
    $orgRequest = OrganizationUserRequest::create([
        'user_id'         => $userId,
        'organization_id' => $orgId,
        'status'          => 'pending',
    ]);

    return response()->json([
        'message' => 'Request sent successfully.',
        'request' => $orgRequest
    ], 201);
}

    
    public function ShowAllMyRequests()
    {
        $requests = OrganizationUserRequest::where('user_id', Auth::id())
            ->with('organization')
            ->get();

        return response()->json($requests);
    }

    
    public function CancelMyRequest($id)
    {
        $request = OrganizationUserRequest::where('id', $id)
            ->where('user_id', Auth::id())
            ->where('status', 'pending')
            ->first();

        if (!$request) {
            return response()->json(['message' => 'Request not found or cannot be cancelled.'], 404);
        }

        $request->delete();

        return response()->json(['message' => 'Request cancelled.']);
    }

    
   public function getRequestsForOrganization($organizationId)
{
    $organization = Organization::find($organizationId);

    if (!$organization) {
        return response()->json(['message' => 'Organization not found.'], 404);
    }

    if ($organization->owner_id !== Auth::id()) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $requests = OrganizationUserRequest::where('organization_id', $organizationId)
        ->where('status', 'pending')
        ->with('user')
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json($requests);
}

    
    public function acceptRequest($requestId)
    {
        $request = OrganizationUserRequest::with('organization')->findOrFail($requestId);

        if ($request->organization->owner_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->status = 'approved';
        $request->save();

        return response()->json(['message' => 'Request approved.']);
    }

    
    public function declineRequest($requestId)
    {
        $request = OrganizationUserRequest::with('organization')->findOrFail($requestId);

        if ($request->organization->owner_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->status = 'declined';
        $request->save();

        return response()->json(['message' => 'Request declined.']);
    }

    public function getUsersOfOrganization($organizationId)
{
    $users = OrganizationUserRequest::where('organization_id', $organizationId)
        ->where('status', 'approved')
        ->whereHas('user', function ($query) {
            $query->where('role', 'user');
        })
        ->with('user')
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json($users);
}


   public function AssignAdmins(Request $request, $departmentId = null, $userId = null)
{
    $departmentId = $departmentId ?? $request->input('department_id');
    $userId = $userId ?? $request->input('user_id');

    if (!$departmentId || !$userId) {
        return response()->json(['error' => 'Both department_id and user_id are required'], 422);
    }

    $department = Department::find($departmentId);
    if (!$department) {
        return response()->json(['error' => 'Department not found'], 404);
    }

    
    if ($department->admin_id !== null) {
        return response()->json(['error' => 'This department already has an admin assigned'], 409);
    }

    $organization = $department->organization;
    if (!$organization || $organization->owner_id !== Auth::id()) {
        return response()->json(['error' => 'Unauthorized – only the organization owner can assign admins'], 403);
    }

    $user = User::find($userId);
    if (!$user) {
        return response()->json(['error' => 'User not found'], 404);
    }

    $department->admin_id = $user->id;
    $department->save();

    $user->role = 'dept_admin';
    $user->save();

    return response()->json([
        'message' => 'Admin assigned successfully',
        'department' => $department,
        'admin_user' => $user
    ], 200);
}


public function RemoveAdmins(Request $request, $departmentId = null, $userId = null)
{
    $departmentId = $departmentId ?? $request->input('department_id');
    $userId = $userId ?? $request->input('user_id');

    if (!$departmentId || !$userId) {
        return response()->json(['error' => 'Both department_id and user_id are required'], 422);
    }

    $department = Department::find($departmentId);
    if (!$department) {
        return response()->json(['error' => 'Department not found'], 404);
    }

    
    

    $organization = $department->organization;
    if (!$organization || $organization->owner_id !== Auth::id()) {
        return response()->json(['error' => 'Unauthorized – only the organization owner can assign admins'], 403);
    }

    $user = User::find($userId);
    if (!$user) {
        return response()->json(['error' => 'User not found'], 404);
    }

    $department->admin_id = null;
    $department->save();

    $user->role = 'user';
    $user->save();

    return response()->json([
        'message' => 'Admin removed successfully',
        'department' => $department,
        'admin_user' => $user
    ], 200);
}

}

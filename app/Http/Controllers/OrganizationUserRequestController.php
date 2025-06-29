<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Organization;
use App\Models\OrganizationUserRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrganizationUserRequestController extends Controller
{
    
    public function MakeRequestToOrganization(Request $request)
{
    $request->validate([
        'organization_id' => 'required|integer',
    ]);

   
    $organization = Organization::find($request->organization_id);
    if (!$organization) {
        return response()->json(['message' => 'Organization not found.'], 404);
    }

    $existing = OrganizationUserRequest::where('user_id', Auth::id())
        ->where('organization_id', $request->organization_id)
        ->first();

    if ($existing) {
        return response()->json(['message' => 'Request already exists.'], 409);
    }

    $orgRequest = OrganizationUserRequest::create([
        'user_id' => Auth::id(),
        'organization_id' => $request->organization_id,
        'status' => 'pending',
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

    public function getUsersOfOrganization($organizationId){
       $users = OrganizationUserRequest::where('organization_id', $organizationId)
        ->where('status', 'approved')
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

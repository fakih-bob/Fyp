<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\DepartmentUser;
use App\Models\MaintenanceRequest;
use App\Models\Photo;
use App\Models\User;
use Auth;
use Illuminate\Http\Request;

class MaintenanceRequestController extends Controller
{
public function store(Request $request)
{
    $validated = $request->validate([
        'department_id' => 'required|exists:departments,id',
        'title' => 'required|string|max:255',
        'description' => 'nullable|string',
        'status' => 'required|in:new,declined,pending,in-progress,done,trashed',
        'photos.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
    ]);

    $userId = Auth::id();

    $isMember = DepartmentUser::where('user_id', $userId)
        ->where('department_id', $validated['department_id'])
        ->exists();

    if (!$isMember) {
        return response()->json([
            'message' => 'You are not a member of this department.',
        ], 403);
    }

    $validated['user_id'] = $userId;
    $validated['assigned_to'] = null;

    $maintenanceRequest = MaintenanceRequest::create($validated);

    if ($request->hasFile('photos')) {
        foreach ($request->file('photos') as $photo) {
            $path = $photo->store('maintenance_photos', 'public');

            Photo::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'url' => '/storage/' . $path,
            ]);
        }
    }

    return response()->json([
        'message' => 'Maintenance request with photos created successfully.',
        'data' => $maintenanceRequest->load('photos'),
    ], 201);
}    
public function FetchAllRequests()
{
    // Get the currently authenticated user (admin)
    $admin = Auth::user();

    if (!$admin) {
        return response()->json([
            'message' => 'Unauthorized.'
        ], 401);
    }

    // Find the department where this admin is assigned
    $department = Department::where('admin_id', $admin->id)->first();

    // If no department is assigned, return a clear error
    if (!$department) {
        return response()->json([
            'message' => 'No department assigned to this admin.'
        ], 404);
    }

    // Safely fetch maintenance requests for this department
    $requests = MaintenanceRequest::with(['user', 'department', 'assignee', 'photos'])
                ->where('status', 'new')
                ->where('department_id', $department->id)
                ->get();

    return response()->json([
        'data' => $requests
    ], 200);
}

public function FetchAllMaintenanceTeam($departmentId)
{
    $requests = User::where('role', 'maintenance')
        ->whereHas('departments', function ($query) use ($departmentId) {
            $query->where('departments.id', $departmentId);
        })
        ->get();

    return response()->json([
        'data' => $requests
    ]);
}



 public function assignToMaintenance(Request $request, $userId)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
        ]);

        $user = User::findOrFail($userId);
        $user->role = 'maintenance';
        $user->departments()->syncWithoutDetaching([$request->department_id]);
        $user->save();

        return response()->json([
            'message' => 'User assigned to maintenance successfully.',
            'user' => $user
        ], 200);
    }


public function assignTo(Request $request, $request_id)
{
    $request->validate([
        'user_id' => 'required|exists:users,id'
    ]);

    $maintenanceRequest = MaintenanceRequest::findOrFail($request_id);
 
    $maintenanceRequest->assigned_to = $request->user_id;
    $maintenanceRequest->save();

    return response()->json([
        'message' => 'Request assigned successfully.',
        'data' => $maintenanceRequest->load(['assignee'])
    ]);
}




public function myAssignedRequests(Request $request)
{
    $userId = $request->user()->id;

    $requests = MaintenanceRequest::with(['user', 'department'])
        ->where('assigned_to', $userId)
        ->orderByDesc('created_at')
        ->get();

    return response()->json([
        'message' => 'Assigned maintenance requests fetched successfully.',
        'data'    => $requests,
    ]);
}

public function updateStatus(Request $request, $id)
{
    $request->validate([
        'status' => 'required|in:new,declined,pending,in-progress,done,trashed',
    ]);

    $maintenanceRequest = MaintenanceRequest::findOrFail($id);
    $maintenanceRequest->status = $request->status;
    $maintenanceRequest->save();

    return response()->json([
        'message' => 'Status updated successfully.',
        'maintenance_request' => $maintenanceRequest,
    ]);
}
}

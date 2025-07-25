<?php

namespace App\Http\Controllers;

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
    $user = Auth::user();

    $query = MaintenanceRequest::with(['user', 'department', 'assignee', 'photos']);

    // USER: see only own requests
    if ($user->role === 'User') {
        $query->where('user_id', $user->id);
    }

    // DEPARTMENT ADMIN: see only requests for their department
    elseif ($user->role === 'Department Admin') {
        $query->whereHas('department', function ($q) use ($user) {
            $q->where('admin_id', $user->id);
        });
    }

    // MAINTENANCE: see only assigned tasks
    elseif ($user->role === 'Maintenance') {
        $query->where('assigned_to', $user->id);
    }

    // Else: superusers/organization admins can be expanded later

    $requests = $query->get();

    return response()->json([
        'data' => $requests
    ]);
}

    public function FetchAllMaintenanceTeam()
    {
        $requests = User::where('role', 'Maintenance')->get();

        return response()->json([
            'data' => $requests
        ]);
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

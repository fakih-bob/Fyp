<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Organization;
use App\Models\User;
use Auth;
use Illuminate\Http\Request;

class departmentController extends Controller
{
    public function CreateDepartment(Request $request)
{
    $request->validate([
        'name'            => 'required|string|max:255',
        'description'     => 'nullable|string',
        'organization_id' => 'required|exists:organizations,id',
    ]);

    $organization = Organization::findOrFail($request->organization_id);

    if ($organization->owner_id !== Auth::id()) {
        return response()->json(['error' => 'Unauthorized you should be the owner'], 403);
    }

    $department = Department::create([
        'name'            => $request->name,
        'organization_id' => $organization->id,
        'description'     =>$request->description,
        'admin_id'        => null,
    ]);

    return response()->json([
        'status' => 'Department created successfully',
        'data'   => $department,
    ], 200);
}

public function UpdateDepartmentName(Request $request, $id)
{
    $department = Department::findOrFail($id);
    $organization = $department->organization;

    
    if ($organization->owner_id !== Auth::id()) {
        return response()->json(['error' => 'Unauthorized you should be the owner'], 403);
    }

    $request->validate([
        'name'     => 'sometimes|required|string|max:255',
        'description'     => 'sometimes|nullable|string|max:255'
    ]);

    $department->update($request->only('name','description'));

    return response()->json([
        'status' => 'Department Name updated successfully',
        'data'   => $department,
    ]);
}

public function DeleteDepartment($id)
{
    $department = Department::findOrFail($id);
    $organization = $department->organization;

    if ($organization->owner_id !== Auth::id()) {
        return response()->json(['error' => 'Unauthorized you should be the owner'], 403);
    }

    $department->delete();

    return response()->json(['message' => 'Department deleted successfully'], 200);
}

public function assignUserToDepartment(Request $request)
{
    $request->validate([
        'user_id' => 'required|exists:users,id',
        'department_id' => 'required|exists:departments,id',
    ]);

    $user = User::findOrFail($request->user_id);
    
    $user->departments()->syncWithoutDetaching([$request->department_id]);

    return response()->json([
        'message' => 'User assigned to department successfully.',
    ]);
}




}

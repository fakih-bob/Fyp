<?php

namespace App\Policies;

use App\Models\MaintenanceRequest;
use App\Models\User;

class MaintenanceRequestPolicy
{
    public function view(User $user, MaintenanceRequest $request)
    {
        if ($user->role === 'User') {
            return $request->user_id === $user->id;
        }

        if ($user->role === 'Department Admin') {
            return $request->department && $request->department->admin_id === $user->id;
        }

        if ($user->role === 'Maintenance') {
            return $request->assigned_to === $user->id;
        }

        return false;
    }

    public function update(User $user, MaintenanceRequest $request)
    {
        // Only department admin can assign/update
        if ($user->role === 'Department Admin') {
            return $request->department && $request->department->admin_id === $user->id;
        }

        // Maintenance team can only change status of tasks assigned to them
        if ($user->role === 'Maintenance') {
            return $request->assigned_to === $user->id;
        }

        return false;
    }
}

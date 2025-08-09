<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\departmentController;
use App\Http\Controllers\OrganizationUserRequestController;
use App\Http\Controllers\MaintenanceRequestController;
use App\Http\Controllers\UserProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrganizationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// 🔐 Authentication
// Logs in a user and returns an auth token
Route::post('/login', [AuthController::class, 'login']);

// Registers a new user and returns an auth token
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [UserProfileController::class, 'show']);
    Route::put('/profile', [UserProfileController::class, 'update']);
    Route::delete('/profile', [UserProfileController::class, 'destroy']);
});


// 🏢 Organization Management (Requires Auth)
Route::middleware('auth:sanctum')->group(function () {
    // Creates a new organization
    Route::post('/organizations', [OrganizationController::class, 'store']);

    Route::get('/myorganizations', [OrganizationController::class, 'getMyOrganization']);

    // Updates an existing organization by ID
    Route::put('/organizations/{id}', [OrganizationController::class, 'update']);

    // Deletes an organization by ID
    Route::delete('/organizations/{id}', [OrganizationController::class, 'destroy']);
});


// 👥 Organization Owner APIs (Requires Auth)
Route::middleware('auth:sanctum')->group(function () {
    // Retrieves join requests for a specific organization
    Route::get('/getRequestsForOrganization/{id}', [OrganizationUserRequestController::class, 'getRequestsForOrganization']);

    // Retrieves users of a specific organization
    Route::get('/getUsersOfOrganization/{id}', [OrganizationUserRequestController::class, 'getUsersOfOrganization']);

    // Accepts a user's join request
    Route::put('/acceptRequest/{id}', [OrganizationUserRequestController::class, 'acceptRequest']);

    // Declines a user's join request
    Route::put('/declineRequest/{id}', [OrganizationUserRequestController::class, 'declineRequest']);

    // 🗂️ Department Management
    // Creates a new department
    Route::post('/departments', [departmentController::class, 'CreateDepartment']);

    Route::get('/departments/{id}', [departmentController::class, 'getDepartmentsByOrganization']);
    // Updates a department's name
    Route::put('/departments/{id}', [departmentController::class, 'UpdateDepartmentName']);

    // Deletes a department
    Route::delete('/departments/{id}', [departmentController::class, 'DeleteDepartment']);

    // Assigns admin roles to users in departments
    Route::put('/AssignAdmins', [OrganizationUserRequestController::class, 'AssignAdmins']);

    // Removes admin roles from users in departments
    Route::put('/RemoveAdmins', [OrganizationUserRequestController::class, 'RemoveAdmins']);
});


// 🙋‍♂️ User APIs (Requires Auth)
Route::middleware('auth:sanctum')->group(function () {
    // Sends a request to join an organization
    Route::post('/MakeRequestToOrganization', [OrganizationUserRequestController::class, 'MakeRequestToOrganization']);
Route::get('/getAllOrganizations', [OrganizationController::class, 'getAllOrganizations']);

    // Shows all requests sent by the logged-in user
    Route::get('/ShowAllMyRequests', [OrganizationUserRequestController::class, 'ShowAllMyRequests']);

    // Cancels a specific request sent by the user
    Route::delete('/CancelMyRequest/{id}', [OrganizationUserRequestController::class, 'CancelMyRequest']);
});


// 🔧 Maintenance Request APIs

// Stores a new maintenance request (with optional photo uploads) - Requires Auth
Route::middleware('auth:sanctum')->post('/maintenance-requests', [MaintenanceRequestController::class, 'store']);

// Fetches all maintenance requests where status is 'new'
Route::get('/maintenance-requests', [MaintenanceRequestController::class, 'FetchAllRequests']);

// Fetches all users who are part of the maintenance team
Route::get('/maintenance-team', [MaintenanceRequestController::class, 'FetchAllMaintenanceTeam']);

// Assigns a maintenance request to a team member
Route::post('/maintenance-requests/{id}/assign', [MaintenanceRequestController::class, 'assignTo']);

// 🧑‍💼 Department Assignment
// Assigns a user to a department
Route::post('/assign-user-department', [departmentController::class, 'assignUserToDepartment']);

// Changes the status of a maintenance request (e.g., from 'new' to 'in_progress' or 'dones')
Route::patch('/maintenance-requests/{id}/status', [MaintenanceRequestController::class, 'updateStatus']);

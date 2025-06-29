<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\departmentController;
use App\Http\Controllers\OrganizationUserRequestController;
use App\Http\Controllers\MaintenanceRequestController;
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


 Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/organizations', [OrganizationController::class, 'store']);
    Route::put('/organizations/{id}', [OrganizationController::class, 'update']);
    Route::delete('/organizations/{id}', [OrganizationController::class, 'destroy']);
});


//owner apis

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/getRequestsForOrganization/{id}', [OrganizationUserRequestController::class, 'getRequestsForOrganization']);
    Route::get('/getUsersOfOrganization/{id}', [OrganizationUserRequestController::class, 'getUsersOfOrganization']);
    Route::put('/acceptRequest/{id}', [OrganizationUserRequestController::class, 'acceptRequest']);
    Route::put('/declineRequest/{id}', [OrganizationUserRequestController::class, 'declineRequest']);
    //department Management
    Route::post('/departments', [departmentController::class, 'CreateDepartment']);
    Route::put('/UpdateDepartmentName/{id}', [departmentController::class, 'UpdateDepartmentName']);
    Route::delete('/DeleteDepartment/{id}', [departmentController::class, 'DeleteDepartment']);
    //Assign Admins to departments
    Route::put('/AssignAdmins', [OrganizationUserRequestController::class, 'AssignAdmins']);
    Route::put('/RemoveAdmins', [OrganizationUserRequestController::class, 'RemoveAdmins']);

});


//user apis

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/MakeRequestToOrganization', [OrganizationUserRequestController::class, 'MakeRequestToOrganization']);
    Route::get('/ShowAllMyRequests', [OrganizationUserRequestController::class, 'ShowAllMyRequests']);
    Route::delete('/CancelMyRequest/{id}', [OrganizationUserRequestController::class, 'CancelMyRequest']);
});


// Store a new maintenance request with optional photo uploads
Route::middleware('auth:sanctum')->post('/maintenance-requests', [MaintenanceRequestController::class, 'store']);

// Fetch all maintenance requests where status == 'new'
Route::get('/maintenance-requests', [MaintenanceRequestController::class, 'FetchAllRequests']);

// Fetch all users who are part of the maintenance team
Route::get('/maintenance-team', [MaintenanceRequestController::class, 'FetchAllMaintenanceTeam']);

// Assign a maintenance request to a maintenance team member
Route::post('/maintenance-requests/{id}/assign', [MaintenanceRequestController::class, 'assignTo']);

// Assign a user to a department 
Route::post('/assign-user-department', [departmentController::class, 'assignUserToDepartment']);

// change the status of the maintenance request 
Route::patch('/maintenance-requests/{id}/status', [MaintenanceRequestController::class, 'updateStatus']);


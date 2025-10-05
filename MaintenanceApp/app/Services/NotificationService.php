<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use DB;
use Http;
use Log;

class NotificationService
{
    /**
     * Send notification to user(s) - saves to DB and sends push notification
     * 
     * @param int|array $userIds - Single user ID or array of user IDs
     * @param string $title
     * @param string $message
     * @param array $data - Additional data for push notification
     * @return array Created notification IDs
     */
    public static function send($userIds, string $title, string $message, array $data = []): array
    {
        // Ensure $userIds is an array
        if (!is_array($userIds)) {
            $userIds = [$userIds];
        }

        $createdNotifications = [];

        foreach ($userIds as $userId) {
            try {
                // 1) Save to database
                $notification = Notification::create([
                    'user_id' => $userId,
                    'title' => $title,
                    'message' => $message,
                    'read' => false,
                ]);

                $createdNotifications[] = $notification->id;

                // 2) Send push notification
                self::sendPushNotification($userId, $title, $message, $data);

            } catch (\Exception $e) {
                Log::error('Failed to send notification', [
                    'user_id' => $userId,
                    'title' => $title,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return $createdNotifications;
    }

    /**
     * Send push notification via Expo
     */
    private static function sendPushNotification(int $userId, string $title, string $message, array $data = []): void
    {
        try {
            // Get user's device tokens
            $tokens = DB::table('device_tokens')
                ->where('user_id', $userId)
                ->pluck('token')
                ->filter(fn($t) => str_starts_with($t, 'ExponentPushToken['))
                ->values()
                ->all();

            if (empty($tokens)) {
                return; // No tokens to send to
            }

            // Build message objects
            $messages = array_map(fn($token) => [
                'to' => $token,
                'title' => $title,
                'body' => $message,
                'data' => $data,
                'sound' => 'default',
                'priority' => 'high',
                'channelId' => 'default',
            ], $tokens);

            // Send in batches of 100 (Expo limit)
            foreach (array_chunk($messages, 100) as $chunk) {
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post('https://exp.host/--/api/v2/push/send', $chunk)
                ->json();

                // Clean up invalid tokens
                if (isset($response['data'])) {
                    foreach ($response['data'] as $index => $ticket) {
                        if (isset($ticket['status']) && $ticket['status'] === 'error') {
                            if (isset($ticket['details']['error']) && $ticket['details']['error'] === 'DeviceNotRegistered') {
                                DB::table('device_tokens')
                                    ->where('token', $chunk[$index]['to'])
                                    ->delete();
                            }
                        }
                    }
                }
            }

        } catch (\Exception $e) {
            Log::error('Failed to send push notification', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Send notification when maintenance request is created
     */
    public static function notifyRequestCreated($request, $organizationId): void
    {
        // Notify organization operator
        $operator = DB::table('organizations')
            ->where('id', $organizationId)
            ->value('operator_id');

        if ($operator) {
            self::send(
                $operator,
                'New Maintenance Request',
                "New request: \"{$request->title}\" needs to be assigned to a department.",
                [
                    'type' => 'request_created',
                    'request_id' => $request->id,
                    'screen' => 'OperatorDashboard'
                ]
            );
        }
    }

    /**
     * Send notification when maintenance request is assigned to department
     */
    public static function notifyRequestAssignedToDepartment($request): void
    {
        if (!$request->department_id) return;

        // Notify department admin
        $adminId = DB::table('departments')
            ->where('id', $request->department_id)
            ->value('admin_id');

        if ($adminId) {
            self::send(
                $adminId,
                'New Request for Your Department',
                "Request \"{$request->title}\" has been assigned to your department.",
                [
                    'type' => 'request_assigned_to_dept',
                    'request_id' => $request->id,
                    'department_id' => $request->department_id,
                    'screen' => 'DeptAdminDashboard'
                ]
            );
        }
    }

    /**
     * Send notification when maintenance request is assigned to worker
     */
    public static function notifyRequestAssignedToWorker($request): void
    {
        if (!$request->assigned_to) return;

        self::send(
            $request->assigned_to,
            'New Assignment',
            "You have been assigned to: \"{$request->title}\"",
            [
                'type' => 'request_assigned_to_worker',
                'request_id' => $request->id,
                'screen' => 'MaintenanceDashboard'
            ]
        );
    }

    /**
     * Send notification when maintenance request status changes
     */
    public static function notifyRequestStatusChanged($request, string $oldStatus, string $newStatus): void
    {
        // Notify the user who created the request
        if ($request->user_id) {
            $statusMessages = [
                'pending' => 'Your request is pending review',
                'in-progress' => 'Work has started on your request',
                'done' => 'Your request has been completed',
                'declined' => 'Your request has been declined',
            ];

            $message = $statusMessages[$newStatus] ?? "Status changed to {$newStatus}";

            self::send(
                $request->user_id,
                'Request Status Update',
                "\"{$request->title}\": {$message}",
                [
                    'type' => 'status_changed',
                    'request_id' => $request->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'screen' => 'MyRequests'
                ]
            );
        }
    }

    /**
     * Send notification when user join request is approved
     */
    public static function notifyJoinRequestApproved($userId, $organizationName): void
    {
        self::send(
            $userId,
            'Join Request Approved',
            "Your request to join \"{$organizationName}\" has been approved!",
            [
                'type' => 'join_approved',
                'screen' => 'Home'
            ]
        );
    }

    /**
     * Send notification when user join request is declined
     */
    public static function notifyJoinRequestDeclined($userId, $organizationName): void
    {
        self::send(
            $userId,
            'Join Request Declined',
            "Your request to join \"{$organizationName}\" has been declined.",
            [
                'type' => 'join_declined',
                'screen' => 'Home'
            ]
        );
    }

    /**
     * Send notification when new join request received
     */
    public static function notifyNewJoinRequest($ownerId, $userName, $organizationName): void
    {
        self::send(
            $ownerId,
            'New Join Request',
            "{$userName} has requested to join \"{$organizationName}\"",
            [
                'type' => 'new_join_request',
                'screen' => 'OrganizationRequestsScreen'
            ]
        );
    }

    /**
     * Send notification when assigned as department admin
     */
    public static function notifyAssignedAsDepartmentAdmin($userId, $departmentName): void
    {
        self::send(
            $userId,
            'New Role Assigned',
            "You have been assigned as admin of \"{$departmentName}\"",
            [
                'type' => 'admin_assigned',
                'screen' => 'DeptAdminDashboard'
            ]
        );
    }

    /**
     * Send notification when assigned as operator
     */
    public static function notifyAssignedAsOperator($userId, $organizationName): void
    {
        self::send(
            $userId,
            'New Role Assigned',
            "You have been assigned as operator for \"{$organizationName}\"",
            [
                'type' => 'operator_assigned',
                'screen' => 'OperatorDashboard'
            ]
        );
    }
}
<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use DB;
use Http;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Save device token for push notifications
     */
    public function saveDevice(Request $r)
    {
        $r->validate([
            'token'       => 'required|string',
            'platform'    => 'nullable|string',
            'app_version' => 'nullable|string',
        ]);

        DB::table('device_tokens')->updateOrInsert(
            ['token' => $r->token],
            [
                'user_id' => $r->user()->id, 
                'platform' => $r->platform, 
                'app_version' => $r->app_version,
                'updated_at' => now(), 
                'created_at' => now()
            ]
        );

        return response()->json(['ok' => true, 'message' => 'Device token saved successfully']);
    }

    /**
     * List all notifications for authenticated user
     */
    public function index(Request $r)
    {
        $notifications = Notification::where('user_id', $r->user()->id)
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json([
            'status' => 'success',
            'data' => $notifications->items(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'last_page' => $notifications->lastPage(),
            ]
        ]);
    }

    /**
     * Mark a notification as read
     */
    public function markRead(Request $r, int $id)
    {
        $notification = Notification::where('user_id', $r->user()->id)
            ->where('id', $id)
            ->first();

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->read = true;
        $notification->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Notification marked as read',
            'data' => $notification
        ]);
    }

    /**
     * Mark all notifications as read for authenticated user
     */
    public function markAllRead(Request $r)
    {
        $updated = Notification::where('user_id', $r->user()->id)
            ->where('read', false)
            ->update(['read' => true]);

        return response()->json([
            'status' => 'success',
            'message' => "Marked {$updated} notifications as read"
        ]);
    }

    /**
     * Delete a notification
     */
    public function destroy(Request $r, int $id)
    {
        $notification = Notification::where('user_id', $r->user()->id)
            ->where('id', $id)
            ->first();

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Notification deleted'
        ]);
    }

    /**
     * Get unread count for authenticated user
     */
    public function unreadCount(Request $r)
    {
        $count = Notification::where('user_id', $r->user()->id)
            ->where('read', false)
            ->count();

        return response()->json([
            'status' => 'success',
            'unread_count' => $count
        ]);
    }
}
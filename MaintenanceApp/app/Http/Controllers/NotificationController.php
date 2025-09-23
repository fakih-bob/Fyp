<?php

namespace App\Http\Controllers;

use DB;
use Http;
use Illuminate\Http\Request;
use Str;

class NotificationController extends Controller
{
    public function saveDevice(Request $r)
    {
        $r->validate([
            'token'       => 'required|string',         // "ExponentPushToken[...]"
            'platform'    => 'nullable|string',
            'app_version' => 'nullable|string',
        ]);

        DB::table('device_tokens')->updateOrInsert(
            ['token' => $r->token],
            ['user_id' => $r->user()->id, 'platform' => $r->platform, 'app_version' => $r->app_version,
             'updated_at' => now(), 'created_at' => now()]
        );

        return response()->json(['ok' => true]);
    }

    /** 2) List notifications saved to DB (Laravel notifications table) */
    public function index(Request $r)
    {
        $items = DB::table('notifications')
            ->where('notifiable_type', get_class($r->user()))
            ->where('notifiable_id', $r->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($items);
    }

    /** 3) Mark one as read */
    public function markRead(Request $r, string $id)
    {
        $updated = DB::table('notifications')
            ->where('id', $id)
            ->where('notifiable_type', get_class($r->user()))
            ->where('notifiable_id', $r->user()->id)
            ->update(['read_at' => now()]);

        abort_if(!$updated, 404, 'Not found');
        return response()->json(['ok' => true]);
    }

    /**
     * 4) Example: Save + push a notification to the current user (adapt this to your real action)
     *    - Saves to DB for listing
     *    - Pushes via Expo (batching up to 100 per request)
     */
    public function demoAction(Request $r)
    {
        $targetUser = $r->user(); // replace with your actual recipient(s)

        $title = 'Order Updated';
        $body  = 'Your order #123 changed to SHIPPED';
        $data  = ['screen' => 'OrderDetails', 'orderId' => 123, 'status' => 'shipped'];

        // (A) Save to DB for listing
        $id = (string) Str::uuid();
        DB::table('notifications')->insert([
            'id'              => $id,
            'type'            => 'inline',
            'notifiable_type' => get_class($targetUser),
            'notifiable_id'   => $targetUser->id,
            'data'            => json_encode(['title' => $title, 'body' => $body, 'data' => $data]),
            'read_at'         => null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // (B) Collect Expo tokens
        $tokens = DB::table('device_tokens')
            ->where('user_id', $targetUser->id)
            ->pluck('token')
            ->filter(fn($t) => str_starts_with($t, 'ExponentPushToken['))
            ->values()
            ->all();

        if (empty($tokens)) {
            return response()->json(['ok' => true, 'info' => 'No Expo tokens for user (saved to DB only).']);
        }

        // (C) Build message objects and send in batches of <=100 (Expo limit)
        $messages = array_map(fn($t) => [
            'to'        => $t,
            'title'     => $title,
            'body'      => $body,
            'data'      => $data,      // used for in-app navigation
            'sound'     => 'default',
            'priority'  => 'high',
        ], $tokens);

        foreach (array_chunk($messages, 100) as $chunk) { // <= 100 per request
            $res = Http::withHeaders(['Accept' => 'application/json'])
                ->post('https://exp.host/--/api/v2/push/send', $chunk)
                ->json();

            // Optional cleanup: if any ticket returns DeviceNotRegistered, delete that token immediately
            foreach (($res['data'] ?? []) as $i => $ticket) {
                if (($ticket['status'] ?? '') === 'error'
                    && ($ticket['details']['error'] ?? null) === 'DeviceNotRegistered') {
                    DB::table('device_tokens')->where('token', $chunk[$i]['to'])->delete();
                }
            }
        }

        return response()->json(['ok' => true, 'id' => $id]);
    }
}



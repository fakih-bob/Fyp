<?php

namespace App\Http\Controllers;

use App\Models\User;
use Auth;
use Illuminate\Http\Request;

class AuthController extends Controller
{
     public function login(Request $request){

        $credentials=$request->only(["email","password"]);
        if(Auth::attempt($credentials)){
             
            $user=Auth::user();
            $token=$user->createToken("Authtoken")->plainTextToken;
        
                    return response()->json([
                        "status"=>true,
                        "token"=>$token,
                        "message"=>"User Logged in succefully",
                        "data"=>$user
                    ]);
        }
        else{
            return response()->json([
                "status"=>false,
                "message"=>"Wrong Email or Password"
            ]);
        }
        
        }
        
        
         public function register(Request $request){
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users,email',
        'password' => 'required|min:6',
        'role' => 'required|in:user,owner,dept_admin,maintenance',
        'phone_number' => 'nullable|string|max:20'
    ]);

    $user = new User();
    $user->name = $validated['name'];
    $user->email = $validated['email'];
    $user->phone_number = $validated['phone_number'] ?? null;
    $user->password = bcrypt($validated['password']);
    $user->role = $validated['role'];
    $user->save();

    $token = $user->createToken("Authtoken")->plainTextToken;

    return response()->json([
        "status" => true,
        "token" => $token,
        "data" => $user
    ]);
}

}

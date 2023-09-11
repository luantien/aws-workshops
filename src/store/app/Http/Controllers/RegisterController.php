<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class RegisterController extends ApiBaseController
{
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'email' => 'email|required|unique:users',
            'password' => 'required',
            'confirm_password' => 'required|same:password',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors());
        }

        $input = $request->all();
        $input['password'] = bcrypt($input['password']);
        $user = User::create($input);
        $response['token'] = $user->createToken('BookStore')->accessToken;
        $response['name'] = $user->name;

        return $this->sendResponse($response, 'User register successfully.');
    }

    public function login(Request $request): JsonResponse
    {
        if (Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
            $user = Auth::user();
            $response['token'] = $user->createToken('BookStore')->accessToken;
            $response['name'] = $user->name;
            $response['status'] = 200;

            return $this->sendResponse($response, 'User login successfully.');
        }
        else {
            return $this->sendError('Unauthorised.', ['error' => 'Unauthorised']);
        }
    }
}

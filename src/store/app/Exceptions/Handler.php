<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Exception\ResourceNotFoundException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }


    public function render($request, Throwable $exception)
    {
        if ($request->is('api/*')) {
            return response()->json([
                    'message' => $exception->getMessage()
                ], 
                $this->getHttpResponseCode($exception));
        }

        return parent::render($request, $exception);
    }

    /**
     * Convert an authentication exception into an unauthenticated response code.
     */
    protected function getHttpResponseCode(Throwable $exception): int
    {
        if ($exception instanceof AuthenticationException) {
            return JsonResponse::HTTP_UNAUTHORIZED;
        }

        if ($exception instanceof NotFoundHttpException
            || $exception instanceof ModelNotFoundException
            || $exception instanceof ResourceNotFoundException) {
            return JsonResponse::HTTP_NOT_FOUND;
        }

        return JsonResponse::HTTP_INTERNAL_SERVER_ERROR;
    }
}

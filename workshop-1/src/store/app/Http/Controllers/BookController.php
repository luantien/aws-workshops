<?php

namespace App\Http\Controllers;

use App\Http\Resources\BookResource;
use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookController extends ApiBaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $books = Book::all();
        return $this->sendResponse(BookResource::collection($books), 'Books retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $input = $request->all();

        $validator = Validator::make($input, [
            'title' => 'required',
            'summary' => 'required',
            'price' => 'required',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors());
        }

        $book = Book::create($input);

        return $this->sendResponse(new BookResource($book), 'Book created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $book = Book::find($id);
        
        if (is_null($book)) {
            return $this->sendError('Book not found.');
        }

        return $this->sendResponse(new BookResource($book), 'Book retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $input = $request->all();
        
        $validator = Validator::make($input, [
            'title' => 'required',
            'summary' => 'required',
            'price' => 'required',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors());
        }

        $book = Book::find($id);

        if (is_null($book)) {
            return $this->sendError('Book not found.');
        }

        $book->title = $input['title'];
        $book->summary = $input['summary'];
        $book->price = $input['price'];
        $book->save();

        return $this->sendResponse(new BookResource($book), 'Book updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $book = Book::find($id);

        if (is_null($book)) {
            return $this->sendError('Book not found.');
        }
        $book->delete();

        return $this->sendResponse([], 'Book deleted successfully.');
    }
}

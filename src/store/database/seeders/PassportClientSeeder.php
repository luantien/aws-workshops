<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Laravel\Passport\Passport;

class PassportClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clients = Passport::client()->count();

        if($clients === 0)
        {
            Artisan::call('passport:install',[
                '--no-interaction' => true,
            ]);
            Log::channel('stderr')->info('Passport client seeded successfully.');
        }
        else{
            Log::channel('stderr')->info('Passport client already seeded.');
        }
    }
}

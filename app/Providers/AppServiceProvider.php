<?php

namespace App\Providers;
use App\Models\MaintenanceRequest;
use App\Policies\MaintenanceRequestPolicy;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */

    protected $policies = [
        MaintenanceRequest::class => MaintenanceRequestPolicy::class,
    ];
    
    public function register(): void
    {
        
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

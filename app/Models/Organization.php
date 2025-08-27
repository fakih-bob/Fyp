<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'owner_id',
        'url'
    ];

    /**
     * Owner of the organization (a User with role = 'owner').
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Users belonging to this organization through departments.
     */
    public function users()
    {
        return $this->hasManyThrough(User::class, Department::class);
    }

    /**
     * Departments in this organization.
     */
    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    /**
     * Join requests submitted by users.
     */
    public function joinRequests()
    {
        return $this->hasMany(OrganizationUserRequest::class);
    }
}

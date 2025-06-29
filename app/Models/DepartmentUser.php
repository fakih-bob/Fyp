<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepartmentUser extends Model
{
     protected $table = 'department_user';

    protected $fillable = [
        'user_id',
        'department_id',
    ];

    public $timestamps = true;

    
    public function users()
    {
        return $this->belongsToMany(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}

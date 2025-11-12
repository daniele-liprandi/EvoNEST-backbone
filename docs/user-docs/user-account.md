# User Account Management

## Overview

EvoNEST uses a simple admin-controlled user management system. Only administrators can create new user accounts and manage database access.

## Getting started

### Default admin account

When you first start EvoNEST, a default admin account is automatically created:

- **Username**: `admin`
- **Password**: `pass`
- **Role**: Administrator
- **Database Access**: `admin`

### Creating new users

Only administrators can create new users:

1. Sign in as an administrator
2. Go to the **Users** page
3. Click the **Create User** button
4. Fill out the user form:
   - **Name**: User's full name
   - **Email**: User's email address
   - **Role**: Select from admin, researcher, student, or viewer
   - **Institution**: Optional organization name
   - **Databases**: Select which databases the user can access
5. Click **Submit**

### Managing database access

Administrators can change a user's database access:

1. Go to the **Users** page
2. Find the user in the table
3. Click the database icon (📊) in the Actions column
4. Select/deselect databases as needed
5. Click **Update Databases**

### Managing databases

Administrators can add new databases to the system:

1. Go to the **Users** page
2. In the **Database Management** section (admin only)
3. Enter a new database name
4. Click **Add**

## Current limitations

- Users cannot self-register
- Users cannot change their own database access
- Role permissions are basic placeholders
- Password changes must be done by administrators

## For non-admin users

If you need a user account or database access changes, contact your system administrator.

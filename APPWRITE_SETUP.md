# Appwrite Database Setup for Classes

This guide will help you set up the required database collections in Appwrite for the Sports Club app's classes functionality.

## Prerequisites

1. You should have already created an Appwrite project
2. You should have your `.env` file configured with:
   - `EXPO_PUBLIC_APPWRITE_ENDPOINT`
   - `EXPO_PUBLIC_APPWRITE_PROJECT_ID`
   - `EXPO_PUBLIC_APPWRITE_DATABASE_ID`

## Step 1: Create Database (if not already done)

1. Go to your Appwrite Console
2. Navigate to **Databases**
3. Click **Create Database**
4. Name it `sports_club_db` (or use the name you have in your `.env` file)
5. Copy the Database ID and update your `.env` file

## Step 2: Create Classes Collection

1. In your database, click **Create Collection**
2. Set the **Collection ID** to: `classes`
3. Set the **Collection Name** to: `Classes`
4. **Enable all permissions** for now (you can refine them later)

## Step 3: Add Collection Attributes

Add the following attributes to your `classes` collection:

### String Attributes

| Attribute Key | Size | Required | Default | Array | Note |
|---------------|------|----------|---------|-------|------|
| `title` | 100 | ✅ Yes | - | ❌ No | |
| `sport` | 50 | ✅ Yes | - | ❌ No | Auto-set to "Football" (single-sport app) |
| `date` | 10 | ✅ Yes | - | ❌ No | |
| `time` | 5 | ✅ Yes | - | ❌ No | |
| `instructor` | 100 | ✅ Yes | - | ❌ No | |
| `instructor_id` | 50 | ✅ Yes | - | ❌ No | |
| `description` | 500 | ❌ No | - | ❌ No | |
| `created_at` | 30 | ✅ Yes | - | ❌ No | |
| `updated_at` | 30 | ✅ Yes | - | ❌ No | |

### Integer Attributes

| Attribute Key | Min | Max | Required | Default | Array |
|---------------|-----|-----|----------|---------|-------|
| `max_participants` | 1 | 1000 | ✅ Yes | 20 | ❌ No |
| `current_participants` | 0 | 1000 | ✅ Yes | 0 | ❌ No |

## Step 4: Create Indexes (for better performance)

Add the following indexes to optimize queries:

1. **Date Index**
   - Key: `date_index`
   - Type: `key`
   - Attributes: `date`
   - Orders: `ASC`

2. **Date-Time Index** (compound)
   - Key: `date_time_index`
   - Type: `key`
   - Attributes: `date`, `time`
   - Orders: `ASC`, `ASC`

3. **Sport Index**
   - Key: `sport_index`
   - Type: `key`
   - Attributes: `sport`
   - Orders: `ASC`

4. **Instructor Index**
   - Key: `instructor_index`
   - Type: `key`
   - Attributes: `instructor_id`
   - Orders: `ASC`

## Step 5: Set Permissions (Security)

For production, you should set proper permissions:

### Document Security

1. **Read access**: 
   - `users` (all authenticated users can read)
   
2. **Create access**: 
   - `users` (all authenticated users can create)
   
3. **Update access**: 
   - `users` (authenticated users can update)
   
4. **Delete access**: 
   - `users` (authenticated users can delete)

### Collection Security

Set the same permissions at the collection level.

## Step 6: Test Your Setup

1. Start your React Native app
2. Login with your test credentials
3. Try to create a new class using the "+" button
4. Check if the class appears in your Appwrite console
5. Verify real-time updates work by creating a class from the console

## Sample Test Data

You can add some test classes directly in the Appwrite console:

```json
{
  "title": "Morning Yoga",
  "sport": "Other",
  "date": "2024-01-15",
  "time": "09:00",
  "instructor": "John Doe",
  "instructor_id": "test-instructor-id",
  "description": "Relaxing morning yoga session for all levels",
  "max_participants": 15,
  "current_participants": 0,
  "created_at": "2024-01-01T12:00:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z"
}
```

```json
{
  "title": "Soccer Training",
  "sport": "Soccer",
  "date": "2024-01-15",
  "time": "16:00",
  "instructor": "Jane Smith",
  "instructor_id": "test-instructor-id-2",
  "description": "Advanced soccer training with drills and scrimmage",
  "max_participants": 22,
  "current_participants": 0,
  "created_at": "2024-01-01T12:00:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **"Collection not found" error**
   - Verify the collection ID is exactly `classes`
   - Check that your database ID in `.env` is correct

2. **"Permission denied" error**
   - Ensure you've set read/write permissions for authenticated users
   - Check that you're logged in to the app

3. **"Attribute validation failed" error**
   - Verify all required attributes are set
   - Check attribute types and sizes match the schema

4. **Real-time updates not working**
   - Ensure your Appwrite project supports real-time
   - Check browser/network connectivity
   - Verify the subscription channel format

### Verification Checklist

- ✅ Database created and ID matches `.env`
- ✅ Collection `classes` created with ID `classes`
- ✅ All required attributes added with correct types
- ✅ Indexes created for performance
- ✅ Permissions set for authenticated users
- ✅ Test class creation works from app
- ✅ Classes appear in calendar
- ✅ Real-time updates work

## Next Steps

Once your database is set up:

1. Test all CRUD operations from the app
2. Verify calendar displays classes correctly
3. Test real-time updates by having multiple devices/browsers open
4. Consider adding more indexes based on your query patterns
5. Refine permissions based on your user roles

For production deployment, consider:
- Setting up proper user roles and permissions
- Adding validation rules
- Setting up backups
- Monitoring database performance 
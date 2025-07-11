# Students Database Setup Guide

This guide will help you set up the Students collection in your Appwrite database to work with the Student Management features.

## Prerequisites

1. **Appwrite Instance**: You need a running Appwrite instance (cloud or self-hosted)
2. **Project Setup**: Your project should already be configured in Appwrite
3. **Database**: You should have a database created in your Appwrite project

## Environment Variables

Ensure your `.env` file contains:

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
```

## Collection Setup

### Step 1: Create Students Collection

1. **Open Appwrite Console**
   - Go to your Appwrite dashboard
   - Navigate to your project
   - Click on "Databases" in the left sidebar
   - Select your database

2. **Create Collection**
   - Click "Create Collection"
   - Set Collection ID: `students`
   - Set Collection Name: `Students`
   - Click "Create"

### Step 2: Configure Collection Settings

1. **Permissions**
   - Go to the "Settings" tab of your students collection
   - Add read/write permissions for authenticated users:
     - **Read Access**: `users` (or specific user roles)
     - **Write Access**: `users` (or specific user roles)

2. **Security Rules** (Optional)
   - You can add additional security rules based on your needs
   - Example: Only allow users to read/write their own student records

### Step 3: Create Attributes

Create the following attributes in the exact order shown. **Attribute names must match exactly** (including snake_case format):

#### Required Attributes

1. **name** (String)
   - **Attribute ID**: `name`
   - **Type**: String
   - **Size**: 100
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None

2. **phone** (String)
   - **Attribute ID**: `phone`
   - **Type**: String
   - **Size**: 20
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None

3. **email** (String)
   - **Attribute ID**: `email`
   - **Type**: String
   - **Size**: 150
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None

4. **date_of_birth** (String)
   - **Attribute ID**: `date_of_birth`
   - **Type**: String
   - **Size**: 10
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Format**: YYYY-MM-DD (e.g., "1990-05-15")

5. **sport** (String) - *Auto-populated for single-sport app*
   - **Attribute ID**: `sport`
   - **Type**: String
   - **Size**: 50
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Note**: This field is automatically set to "Football" in the app code since this is a single-sport application. Users don't select sport during registration.

6. **batch_time** (String)
   - **Attribute ID**: `batch_time`
   - **Type**: String
   - **Size**: 20
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None

7. **enrollment_date** (String)
   - **Attribute ID**: `enrollment_date`
   - **Type**: String
   - **Size**: 10
   - **Required**: ❌ No
   - **Array**: ❌ No
   - **Default**: None
   - **Format**: YYYY-MM-DD

8. **status** (String)
   - **Attribute ID**: `status`
   - **Type**: String
   - **Size**: 20
   - **Required**: ❌ No
   - **Array**: ❌ No
   - **Default**: `active`
   - **Allowed Values**: active, inactive, suspended

9. **notes** (String)
   - **Attribute ID**: `notes`
   - **Type**: String
   - **Size**: 500
   - **Required**: ❌ No
   - **Array**: ❌ No
   - **Default**: None

10. **created_at** (String)
    - **Attribute ID**: `created_at`
    - **Type**: String
    - **Size**: 30
    - **Required**: ✅ Yes
    - **Array**: ❌ No
    - **Default**: None
    - **Format**: ISO 8601 timestamp

11. **updated_at** (String)
    - **Attribute ID**: `updated_at`
    - **Type**: String
    - **Size**: 30
    - **Required**: ✅ Yes
    - **Array**: ❌ No
    - **Default**: None
    - **Format**: ISO 8601 timestamp

### Step 4: Create Indexes (Optional but Recommended)

For better query performance, create these indexes:

1. **Email Index** (for duplicate checking)
   - **Index Key**: `email_index`
   - **Attribute**: `email`
   - **Order**: ASC
   - **Type**: Unique

2. **Name Index** (for sorting)
   - **Index Key**: `name_index`
   - **Attribute**: `name`
   - **Order**: ASC
   - **Type**: Key

3. **Sport Index** (for filtering)
   - **Index Key**: `sport_index`
   - **Attribute**: `sport`
   - **Order**: ASC
   - **Type**: Key

4. **Status Index** (for filtering)
   - **Index Key**: `status_index`
   - **Attribute**: `status`
   - **Order**: ASC
   - **Type**: Key

5. **Batch Time Index** (for filtering)
   - **Index Key**: `batch_time_index`
   - **Attribute**: `batch_time`
   - **Order**: ASC
   - **Type**: Key

## Verification

### Test the Setup

1. **Create Test Student**
   ```javascript
   const testStudent = {
       name: "John Doe",
       phone: "(555) 123-4567",
       email: "john.doe@example.com",
       date_of_birth: "1999-05-15", // YYYY-MM-DD format
       sport: "Football",
       batch_time: "06:00 - 07:00",
       enrollment_date: "2024-01-15",
       status: "active",
       notes: "Test student record",
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
   };
   ```

2. **Verify Collection Access**
   - Try creating a student through the app
   - Check if the student appears in the Appwrite console
   - Test search functionality
   - Verify real-time updates work

### Common Issues and Solutions

#### Issue 1: "Collection not found"
- **Cause**: Collection ID mismatch
- **Solution**: Ensure the collection ID is exactly `students` (lowercase)

#### Issue 2: "Attribute not found"
- **Cause**: Attribute names don't match the code
- **Solution**: Verify all attribute names match exactly (use snake_case)

#### Issue 3: "Permission denied"
- **Cause**: Incorrect permissions setup
- **Solution**: Add proper read/write permissions for your user role

#### Issue 4: "Email already exists" not working
- **Cause**: Missing unique index on email
- **Solution**: Create a unique index for the email attribute

#### Issue 5: "Real-time updates not working"
- **Cause**: Real-time subscriptions not enabled
- **Solution**: Ensure your Appwrite instance supports real-time and subscriptions are properly configured

## Collection Configuration Summary

```json
{
  "collectionId": "students",
  "name": "Students",
  "attributes": [
    {
      "key": "name",
      "type": "string",
      "size": 100,
      "required": true
    },
    {
      "key": "phone",
      "type": "string", 
      "size": 20,
      "required": true
    },
         {
       "key": "email",
       "type": "string",
       "size": 150,
       "required": true
     },
     {
       "key": "date_of_birth",
       "type": "string",
       "size": 10,
       "required": true
     },
     {
       "key": "sport",
       "type": "string",
       "size": 50,
       "required": true
     },
    {
      "key": "batch_time",
      "type": "string",
      "size": 20,
      "required": true
    },
    {
      "key": "enrollment_date",
      "type": "string",
      "size": 10,
      "required": false,
      "default": null
    },
    {
      "key": "status",
      "type": "string",
      "size": 20,
      "required": false,
      "default": "active"
    },
    {
      "key": "notes",
      "type": "string",
      "size": 500,
      "required": false
    },
    {
      "key": "created_at",
      "type": "string",
      "size": 30,
      "required": true
    },
    {
      "key": "updated_at",
      "type": "string",
      "size": 30,
      "required": true
    }
  ],
  "indexes": [
    {
      "key": "email_index",
      "type": "unique",
      "attributes": ["email"]
    },
    {
      "key": "name_index", 
      "type": "key",
      "attributes": ["name"]
    },
    {
      "key": "sport_index",
      "type": "key", 
      "attributes": ["sport"]
    },
    {
      "key": "status_index",
      "type": "key",
      "attributes": ["status"]
    },
    {
      "key": "batch_time_index",
      "type": "key",
      "attributes": ["batch_time"]
    }
  ]
}
```

## Next Steps

After setting up the database:

1. **Update Environment Variables**: Ensure all Appwrite configuration is correct
2. **Test the App**: Try adding, viewing, and searching students
3. **Monitor Performance**: Check query performance and add more indexes if needed
4. **Set Up Backup**: Configure regular database backups
5. **Security Review**: Review and tighten permissions as needed

## Support

If you encounter issues:

1. Check the Appwrite console for error messages
2. Verify all attribute names and types match exactly
3. Test basic database operations in the Appwrite console
4. Check your app's network connectivity to Appwrite
5. Review the browser/app console for error messages

---

**Note**: This setup guide assumes you're using the same Appwrite database as your classes collection. If you're using a separate database, update the `DATABASE_ID` in your environment variables accordingly. 
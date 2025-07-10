# Attendance Database Setup Guide

This guide will help you set up the Attendance collection in your Appwrite database to work with the Attendance tracking features.

## Prerequisites

1. **Appwrite Instance**: You need a running Appwrite instance (cloud or self-hosted)
2. **Project Setup**: Your project should already be configured in Appwrite
3. **Database**: You should have a database created in your Appwrite project
4. **Classes Collection**: You should have the classes collection set up (from Classes feature)
5. **Students Collection**: You should have the students collection set up (from Students feature)

## Environment Variables

Ensure your `.env` file contains:

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
```

## Collection Setup

### Step 1: Create Attendance Collection

1. **Open Appwrite Console**
   - Go to your Appwrite dashboard
   - Navigate to your project
   - Click on "Databases" in the left sidebar
   - Select your database

2. **Create Collection**
   - Click "Create Collection"
   - Set Collection ID: `attendance`
   - Set Collection Name: `Attendance`
   - Click "Create"

### Step 2: Configure Collection Settings

1. **Permissions**
   - Go to the "Settings" tab of your attendance collection
   - Add read/write permissions for authenticated users:
     - **Read Access**: `users` (or specific user roles)
     - **Write Access**: `users` (or specific user roles)

2. **Security Rules** (Optional)
   - You can add additional security rules based on your needs
   - Example: Only allow instructors to mark attendance

### Step 3: Create Attributes

Create the following attributes in the exact order shown. **Attribute names must match exactly** (including snake_case format):

#### Required Attributes

1. **class_id** (String)
   - **Attribute ID**: `class_id`
   - **Type**: String
   - **Size**: 100
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Description**: Reference to the class document

2. **student_id** (String)
   - **Attribute ID**: `student_id`
   - **Type**: String
   - **Size**: 100
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Description**: Reference to the student document

3. **class_date** (String)
   - **Attribute ID**: `class_date`
   - **Type**: String
   - **Size**: 10
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Format**: YYYY-MM-DD

4. **is_present** (String)
   - **Attribute ID**: `is_present`
   - **Type**: String
   - **Size**: 5
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: `false`
   - **Allowed Values**: `true`, `false`

5. **payment_complete** (String)
   - **Attribute ID**: `payment_complete`
   - **Type**: String
   - **Size**: 5
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: `false`
   - **Allowed Values**: `true`, `false`

6. **marked_by** (String)
   - **Attribute ID**: `marked_by`
   - **Type**: String
   - **Size**: 100
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Description**: Instructor who marked the attendance

7. **marked_at** (String)
   - **Attribute ID**: `marked_at`
   - **Type**: String
   - **Size**: 30
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Format**: ISO 8601 timestamp

8. **notes** (String)
   - **Attribute ID**: `notes`
   - **Type**: String
   - **Size**: 500
   - **Required**: ❌ No
   - **Array**: ❌ No
   - **Default**: None
   - **Description**: Optional notes about attendance

9. **created_at** (String)
   - **Attribute ID**: `created_at`
   - **Type**: String
   - **Size**: 30
   - **Required**: ✅ Yes
   - **Array**: ❌ No
   - **Default**: None
   - **Format**: ISO 8601 timestamp

### Step 4: Create Indexes (Recommended for Performance)

For better query performance and to support the attendance features, create these indexes:

1. **Class Date Index** (for filtering by date)
   - **Index Key**: `class_date_index`
   - **Attribute**: `class_date`
   - **Order**: DESC
   - **Type**: Key

2. **Class ID Index** (for filtering by class)
   - **Index Key**: `class_id_index`
   - **Attribute**: `class_id`
   - **Order**: ASC
   - **Type**: Key

3. **Student ID Index** (for filtering by student)
   - **Index Key**: `student_id_index`
   - **Attribute**: `student_id`
   - **Order**: ASC
   - **Type**: Key

4. **Unique Attendance Index** (prevents duplicate attendance records)
   - **Index Key**: `unique_attendance_index`
   - **Attributes**: `class_id`, `student_id`, `class_date`
   - **Type**: Unique
   - **Description**: Ensures one attendance record per student per class per date

5. **Present Status Index** (for filtering by attendance status)
   - **Index Key**: `is_present_index`
   - **Attribute**: `is_present`
   - **Order**: ASC
   - **Type**: Key

6. **Payment Status Index** (for filtering by payment status)
   - **Index Key**: `payment_complete_index`
   - **Attribute**: `payment_complete`
   - **Order**: ASC
   - **Type**: Key

7. **Marked By Index** (for filtering by instructor)
   - **Index Key**: `marked_by_index`
   - **Attribute**: `marked_by`
   - **Order**: ASC
   - **Type**: Key

## Verification

### Test the Setup

1. **Create Test Attendance Record**
   ```javascript
   const testAttendance = {
       class_id: "your-class-document-id",
       student_id: "your-student-document-id", 
       class_date: "2024-01-15",
       is_present: "true",
       payment_complete: "false",
       marked_by: "John Instructor",
       marked_at: new Date().toISOString(),
       notes: "Student arrived late",
       created_at: new Date().toISOString()
   };
   ```

2. **Verify Collection Access**
   - Try marking attendance through the app
   - Check if the attendance appears in the Appwrite console
   - Test bulk attendance marking
   - Verify real-time updates work

### Common Issues and Solutions

#### Issue 1: "Collection not found"
- **Cause**: Collection ID mismatch
- **Solution**: Ensure the collection ID is exactly `attendance` (lowercase)

#### Issue 2: "Attribute not found"
- **Cause**: Attribute names don't match the code
- **Solution**: Verify all attribute names match exactly (use snake_case)

#### Issue 3: "Permission denied"
- **Cause**: Incorrect permissions setup
- **Solution**: Add proper read/write permissions for your user role

#### Issue 4: "Duplicate attendance record"
- **Cause**: Missing unique index
- **Solution**: Create the unique index for class_id, student_id, and class_date

#### Issue 5: "Invalid boolean value"
- **Cause**: Boolean fields stored as string but sent as boolean
- **Solution**: The app handles conversion automatically, ensure attributes are string type

#### Issue 6: "Real-time updates not working"
- **Cause**: Real-time subscriptions not enabled
- **Solution**: Ensure your Appwrite instance supports real-time and subscriptions are properly configured

## Collection Configuration Summary

```json
{
  "collectionId": "attendance",
  "name": "Attendance",
  "attributes": [
    {
      "key": "class_id",
      "type": "string",
      "size": 100,
      "required": true
    },
    {
      "key": "student_id",
      "type": "string",
      "size": 100,
      "required": true
    },
    {
      "key": "class_date",
      "type": "string",
      "size": 10,
      "required": true
    },
    {
      "key": "is_present",
      "type": "string",
      "size": 5,
      "required": true,
      "default": "false"
    },
    {
      "key": "payment_complete",
      "type": "string",
      "size": 5,
      "required": true,
      "default": "false"
    },
    {
      "key": "marked_by",
      "type": "string",
      "size": 100,
      "required": true
    },
    {
      "key": "marked_at",
      "type": "string",
      "size": 30,
      "required": true
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
    }
  ],
  "indexes": [
    {
      "key": "class_date_index",
      "type": "key",
      "attributes": ["class_date"],
      "order": "DESC"
    },
    {
      "key": "class_id_index",
      "type": "key",
      "attributes": ["class_id"]
    },
    {
      "key": "student_id_index",
      "type": "key",
      "attributes": ["student_id"]
    },
    {
      "key": "unique_attendance_index",
      "type": "unique",
      "attributes": ["class_id", "student_id", "class_date"]
    },
    {
      "key": "is_present_index",
      "type": "key",
      "attributes": ["is_present"]
    },
    {
      "key": "payment_complete_index",
      "type": "key",
      "attributes": ["payment_complete"]
    },
    {
      "key": "marked_by_index",
      "type": "key",
      "attributes": ["marked_by"]
    }
  ]
}
```

## Features Enabled by This Setup

### ✅ **Core Attendance Features**
- Mark individual student attendance (Present/Absent)
- Track payment completion status
- Bulk attendance marking for entire classes
- Prevent duplicate attendance records
- Real-time sync across instructor devices

### ✅ **Attendance Analytics**
- Calculate attendance percentages
- Track payment completion rates
- Generate attendance statistics
- View attendance history per student
- Monitor instructor activity

### ✅ **Advanced Features**
- Search attendance by date, class, or student
- Filter by attendance status or payment status
- Generate attendance reports
- Real-time updates when attendance is marked
- Notes for special attendance cases

## Usage Examples

### Basic Attendance Marking
```javascript
// Mark a student as present with payment complete
await attendanceService.markAttendance({
    class_id: "class123",
    student_id: "student456", 
    class_date: "2024-01-15",
    is_present: true,
    payment_complete: true,
    marked_by: "Jane Instructor",
    notes: "On time"
});
```

### Bulk Attendance
```javascript
// Mark attendance for multiple students
const attendanceUpdates = [
    { student_id: "student1", is_present: true, payment_complete: true },
    { student_id: "student2", is_present: false, payment_complete: false },
    { student_id: "student3", is_present: true, payment_complete: true }
];

await attendanceService.bulkUpdateAttendance(
    attendanceUpdates, 
    "class123", 
    "2024-01-15", 
    "Jane Instructor"
);
```

### Get Attendance Statistics
```javascript
// Get stats for a specific class and date
const stats = await attendanceService.getAttendanceStats("class123", "2024-01-15");
console.log(stats.data); 
// { totalStudents: 25, presentCount: 22, attendancePercentage: 88, ... }
```

## Next Steps

After setting up the database:

1. **Update Environment Variables**: Ensure all Appwrite configuration is correct
2. **Test Attendance Marking**: Try marking attendance for students in different classes
3. **Verify Real-time Updates**: Test that attendance updates appear immediately on other devices
4. **Monitor Performance**: Check query performance and optimize indexes if needed
5. **Set Up Backup**: Configure regular database backups
6. **Security Review**: Review and tighten permissions as needed

## Support

If you encounter issues:

1. Check the Appwrite console for error messages
2. Verify all attribute names and types match exactly
3. Test basic database operations in the Appwrite console
4. Check your app's network connectivity to Appwrite
5. Review the browser/app console for error messages

---

**Note**: This setup guide assumes you're using the same Appwrite database as your classes and students collections. The attendance system requires both classes and students to be properly set up first. 
# Sports Club App Setup Instructions

## Environment Configuration

To run this app, you need to configure Appwrite. Create a `.env` file in the root directory with the following variables:

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-endpoint.com/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
```

## Appwrite Setup Steps

1. **Sign up at [Appwrite.io](https://appwrite.io/)**
2. **Create a new project**
3. **Get your configuration:**
   - Endpoint URL: Found in project settings
   - Project ID: Found in project settings
   - Database ID: Create a database and copy its ID

## Running the App

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Use Expo Go app to scan the QR code or run on simulator

## App Structure

- `src/config/appwrite.js` - Appwrite configuration
- `src/context/AuthContext.js` - Authentication context
- `src/screens/` - All screen components
- `src/navigation/AppNavigator.js` - Navigation setup

## Features

- **Authentication**: Login/logout with Appwrite
- **Bottom Tab Navigation**: Three main sections
- **Responsive Design**: Mobile-first with clean styling
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages

## Test Credentials

You'll need to create a user account in your Appwrite console or implement a registration flow to test the login functionality. 
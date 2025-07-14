import { Client, Account, Databases, ID, Query } from 'react-native-appwrite';

// Appwrite configuration
const APPWRITE_CONFIG = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
};

// Validate configuration
const validateConfig = () => {
    const { endpoint, projectId, databaseId } = APPWRITE_CONFIG;
    
    if (!endpoint || !projectId || !databaseId) {
        throw new Error(
            'Missing Appwrite configuration. Please check your .env file and ensure all required variables are set:\n' +
            '- EXPO_PUBLIC_APPWRITE_ENDPOINT\n' +
            '- EXPO_PUBLIC_APPWRITE_PROJECT_ID\n' +
            '- EXPO_PUBLIC_APPWRITE_DATABASE_ID'
        );
    }
};

// Validate configuration on import
validateConfig();

// Initialize Appwrite client
const client = new Client();

client
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId)
    .setPlatform('com.kickbutowski63.SportsClubApp'); // Set platform for React Native

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);

// Export utilities
export { ID, Query };

// Export configuration
export const DATABASE_ID = APPWRITE_CONFIG.databaseId;
export const PROJECT_ID = APPWRITE_CONFIG.projectId;

// Export client for advanced usage
export default client;

// Helper function to check if Appwrite is properly configured
export const isAppwriteConfigured = () => {
    try {
        validateConfig();
        return true;
    } catch (error) {
        console.error('Appwrite configuration error:', error.message);
        return false;
    }
}; 
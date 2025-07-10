import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import context and screens
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ClassesScreen from '../screens/ClassesScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import StudentsScreen from '../screens/StudentsScreen';

const Tab = createBottomTabNavigator();

// Loading component with better styling
const LoadingScreen = ({ message = 'Loading...' }) => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{message}</Text>
    </View>
);

// Error component for initialization errors
const ErrorScreen = ({ error, onRetry }) => (
    <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
            <Ionicons name="alert-circle-outline" size={64} color="#dc2626" />
            <Text style={styles.errorTitle}>Initialization Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            {onRetry && (
                <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);

// Main tab navigator for authenticated users
const MainTabNavigator = () => {
    return (
        <Tab.Navigator
            initialRouteName="Classes"
            screenOptions={({ route }) => ({
                // Configure tab bar icons
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Classes') {
                        iconName = focused ? 'library' : 'library-outline';
                    } else if (route.name === 'Attendance') {
                        iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
                    } else if (route.name === 'Students') {
                        iconName = focused ? 'people' : 'people-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                // Tab bar styling
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#6b7280',
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 60,
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 0,
                        height: -2,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 3.84,
                    elevation: 5,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                // Hide header since we have custom headers in each screen
                headerShown: false,
                // Add haptic feedback on tab press (iOS)
                tabBarPressColor: 'rgba(59, 130, 246, 0.1)',
            })}
        >
            <Tab.Screen 
                name="Classes" 
                component={ClassesScreen}
                options={{
                    tabBarLabel: 'Classes',
                    tabBarAccessibilityLabel: 'Classes tab',
                }}
            />
            <Tab.Screen 
                name="Attendance" 
                component={AttendanceScreen}
                options={{
                    tabBarLabel: 'Attendance',
                    tabBarAccessibilityLabel: 'Attendance tab',
                }}
            />
            <Tab.Screen 
                name="Students" 
                component={StudentsScreen}
                options={{
                    tabBarLabel: 'Students',
                    tabBarAccessibilityLabel: 'Students tab',
                }}
            />
        </Tab.Navigator>
    );
};

// Main app navigator with conditional rendering
const AppNavigator = () => {
    const { 
        isAuthenticated, 
        isLoading, 
        isInitialized, 
        error, 
        checkAuthStatus 
    } = useAuth();

    // Show loading screen during initialization
    if (!isInitialized) {
        return <LoadingScreen message="Initializing app..." />;
    }

    // Show error screen if there's an initialization error
    if (error && !isAuthenticated) {
        return (
            <ErrorScreen 
                error={error} 
                onRetry={checkAuthStatus}
            />
        );
    }

    // Show loading screen during authentication operations
    if (isLoading && !isAuthenticated) {
        return <LoadingScreen message="Checking authentication..." />;
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? (
                <MainTabNavigator />
            ) : (
                <LoginScreen />
            )}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
    },
    errorContent: {
        alignItems: 'center',
        maxWidth: 300,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default AppNavigator; 
import React, { createContext, useContext, useState, useEffect } from 'react';
import { account, isAppwriteConfigured } from '../config/appwrite';
import { ID } from 'react-native-appwrite';

// Create auth context
const AuthContext = createContext({});

// Hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize auth state on app start
    useEffect(() => {
        initializeAuth();
    }, []);

    // Initialize authentication state
    const initializeAuth = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Check if Appwrite is properly configured
            if (!isAppwriteConfigured()) {
                throw new Error('Appwrite is not properly configured. Please check your environment variables.');
            }

            // Try to get current session
            await checkAuthStatus();
        } catch (error) {
            console.error('Auth initialization error:', error);
            setError(error.message);
            setUser(null);
        } finally {
            setIsLoading(false);
            setIsInitialized(true);
        }
    };

    // Check current authentication status
    const checkAuthStatus = async () => {
        try {
            const currentUser = await account.get();
            setUser(currentUser);
            setError(null);
            return currentUser;
        } catch (error) {
            // User is not logged in or session expired
            setUser(null);
            console.log('No active session found');
            return null;
        }
    };

    // Login function with comprehensive error handling
    const login = async (email, password) => {
        try {
            setIsLoading(true);
            setError(null);

            // Validate input
            if (!email?.trim() || !password?.trim()) {
                throw new Error('Email and password are required');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                throw new Error('Please enter a valid email address');
            }

            // Create session
            await account.createEmailPasswordSession(email.trim(), password);
            
            // Get user data
            const currentUser = await account.get();
            setUser(currentUser);
            
            console.log('Login successful:', currentUser.email);
            return { success: true, user: currentUser };
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle specific Appwrite errors
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.code === 401) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            } else if (error.code === 429) {
                errorMessage = 'Too many attempts. Please wait a moment before trying again.';
            } else if (error.code === 400) {
                errorMessage = 'Invalid request. Please check your email and password format.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
            setUser(null);
            
            return { 
                success: false, 
                error: errorMessage 
            };
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function with proper cleanup
    const logout = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Delete current session
            await account.deleteSession('current');
            
            // Clear user state
            setUser(null);
            
            console.log('Logout successful');
            return { success: true };
            
        } catch (error) {
            console.error('Logout error:', error);
            
            // Even if logout fails on server, clear local state
            setUser(null);
            
            const errorMessage = error.message || 'Logout failed, but you have been signed out locally.';
            setError(errorMessage);
            
            return { 
                success: false, 
                error: errorMessage 
            };
        } finally {
            setIsLoading(false);
        }
    };

    // Register function for future use
    const register = async (email, password, name) => {
        try {
            setIsLoading(true);
            setError(null);

            // Validate input
            if (!email?.trim() || !password?.trim() || !name?.trim()) {
                throw new Error('All fields are required');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                throw new Error('Please enter a valid email address');
            }

            // Validate password strength
            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }

            // Create account
            await account.create(ID.unique(), email.trim(), password, name.trim());
            
            // Login after registration
            const loginResult = await login(email, password);
            
            if (loginResult.success) {
                console.log('Registration and login successful');
            }
            
            return loginResult;
            
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.code === 409) {
                errorMessage = 'An account with this email already exists.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
            
            return { 
                success: false, 
                error: errorMessage 
            };
        } finally {
            setIsLoading(false);
        }
    };

    // Clear error function
    const clearError = () => {
        setError(null);
    };

    // Refresh user data
    const refreshUser = async () => {
        if (!user) return null;
        
        try {
            const updatedUser = await account.get();
            setUser(updatedUser);
            return updatedUser;
        } catch (error) {
            console.error('Failed to refresh user data:', error);
            // If refresh fails, user might be logged out
            setUser(null);
            return null;
        }
    };

    const value = {
        // State
        user,
        isLoading,
        error,
        isInitialized,
        isAuthenticated: !!user,
        
        // Actions
        login,
        logout,
        register,
        checkAuthStatus,
        clearError,
        refreshUser,
        
        // Computed values
        userEmail: user?.email || null,
        userName: user?.name || user?.email || null,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 
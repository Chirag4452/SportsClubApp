import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const { login, isLoading, error, clearError, isInitialized } = useAuth();

    // Clear errors when component mounts or when user starts typing
    useEffect(() => {
        if (error) {
            clearError();
        }
    }, []);

    // Clear field-specific errors when user types
    const handleEmailChange = (text) => {
        setEmail(text);
        if (emailError) setEmailError('');
        if (error) clearError();
    };

    const handlePasswordChange = (text) => {
        setPassword(text);
        if (passwordError) setPasswordError('');
        if (error) clearError();
    };

    // Form validation
    const validateForm = () => {
        let isValid = true;
        
        // Reset errors
        setEmailError('');
        setPasswordError('');

        // Email validation
        if (!email.trim()) {
            setEmailError('Email is required');
            isValid = false;
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                setEmailError('Please enter a valid email address');
                isValid = false;
            }
        }

        // Password validation
        if (!password.trim()) {
            setPasswordError('Password is required');
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            isValid = false;
        }

        return isValid;
    };

    // Handle login form submission
    const handleLogin = async () => {
        // Clear any previous errors
        clearError();
        
        // Validate form
        if (!validateForm()) {
            return;
        }

        try {
            const result = await login(email.trim(), password);
            
            if (!result.success && result.error) {
                // Error is already handled in the context and displayed via error state
                console.log('Login failed:', result.error);
            }
            // Success handling is done automatically by AuthContext
        } catch (error) {
            console.error('Unexpected login error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        }
    };

    // Handle quick demo login (for testing)
    const handleDemoLogin = () => {
        setEmail('test@example.com');
        setPassword('password123');
        // Auto-clear any existing errors
        setEmailError('');
        setPasswordError('');
        clearError();
    };

    // Show loading spinner while initializing
    if (!isInitialized) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Initializing...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Sports Club Manager</Text>
                            <Text style={styles.subtitle}>Sign in to continue</Text>
                        </View>

                        {/* Global Error Message */}
                        {error && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Email Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        emailError && styles.inputError
                                    ]}
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    editable={!isLoading}
                                    returnKeyType="next"
                                />
                                {emailError ? (
                                    <Text style={styles.fieldErrorText}>{emailError}</Text>
                                ) : null}
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.passwordInput,
                                            passwordError && styles.inputError
                                        ]}
                                        value={password}
                                        onChangeText={handlePasswordChange}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#9ca3af"
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="password"
                                        editable={!isLoading}
                                        returnKeyType="done"
                                        onSubmitEditing={handleLogin}
                                    />
                                    <TouchableOpacity
                                        style={styles.passwordToggle}
                                        onPress={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.passwordToggleText}>
                                            {showPassword ? 'Hide' : 'Show'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {passwordError ? (
                                    <Text style={styles.fieldErrorText}>{passwordError}</Text>
                                ) : null}
                            </View>

                            {/* Login Button */}
                            <TouchableOpacity
                                style={[
                                    styles.loginButton,
                                    isLoading && styles.disabledButton
                                ]}
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                {isLoading ? (
                                    <View style={styles.buttonContent}>
                                        <ActivityIndicator 
                                            color="#ffffff" 
                                            size="small" 
                                            style={styles.buttonSpinner}
                                        />
                                        <Text style={styles.loginButtonText}>Signing In...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                )}
                            </TouchableOpacity>

                            {/* Demo Login Button (for testing) */}
                            <TouchableOpacity
                                style={styles.demoButton}
                                onPress={handleDemoLogin}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.demoButtonText}>Fill Demo Credentials</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                Demo credentials: test@example.com / password123
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    content: {
        width: '100%',
        maxWidth: width > 400 ? 400 : width - 48,
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1f2937',
        minHeight: 48,
    },
    inputError: {
        borderColor: '#dc2626',
        backgroundColor: '#fef2f2',
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 60,
    },
    passwordToggle: {
        position: 'absolute',
        right: 16,
        top: 12,
        bottom: 12,
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    passwordToggleText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
    fieldErrorText: {
        color: '#dc2626',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    loginButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
        minHeight: 48,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSpinner: {
        marginRight: 8,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    demoButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 12,
        minHeight: 44,
    },
    demoButtonText: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 16,
    },
});

export default LoginScreen; 
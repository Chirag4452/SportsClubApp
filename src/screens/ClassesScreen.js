import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { classService, formatTime, formatDate, getDateString } from '../services/classService';
import { studentService } from '../services/studentService';
import Calendar from '../components/Calendar';
import AddClassModal from '../components/AddClassModal';
import BulkClassSchedulingModal from '../components/BulkClassSchedulingModal';

const ClassesScreen = () => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [classes, setClasses] = useState([]);
    const [todaysClasses, setTodaysClasses] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getDateString());
    const [selectedDateClasses, setSelectedDateClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [error, setError] = useState(null);
    const [students, setStudents] = useState([]);
    
    const { logout, user, userName } = useAuth();

    // Initialize data loading
    useEffect(() => {
        loadInitialData();
    }, []);

    // Set up real-time subscriptions
    useEffect(() => {
        const unsubscribe = classService.subscribeToClasses((update) => {
            console.log('Real-time class update received:', update.type);
            
            // Reload data when classes are updated
            loadClasses();
            loadTodaysClasses();
            loadStudents(); // Also reload students to keep counts accurate
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    // Load initial data
    const loadInitialData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await Promise.all([
                loadClasses(),
                loadTodaysClasses(),
                loadStudents()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            setError('Failed to load class data');
        } finally {
            setIsLoading(false);
        }
    };

    // Load all classes for calendar
    const loadClasses = async () => {
        try {
            const result = await classService.getClasses({ limit: 100 });
            
            if (result.success) {
                setClasses(result.data);
            } else {
                console.error('Error loading classes:', result.error);
                if (!isLoading) {
                    setError(result.error);
                }
            }
        } catch (error) {
            console.error('Error loading classes:', error);
            if (!isLoading) {
                setError('Failed to load classes');
            }
        }
    };

    // Load today's classes
    const loadTodaysClasses = async () => {
        try {
            const result = await classService.getTodaysClasses();
            
            if (result.success) {
                setTodaysClasses(result.data);
                
                // Update selected date classes if today is selected
                if (selectedDate === getDateString()) {
                    setSelectedDateClasses(result.data);
                }
            } else {
                console.error('Error loading today\'s classes:', result.error);
            }
        } catch (error) {
            console.error('Error loading today\'s classes:', error);
        }
    };

    // Load students for eligibility calculation
    const loadStudents = async () => {
        try {
            const result = await studentService.getStudentsBySport();
            
            if (result.success) {
                setStudents(result.data);
            } else {
                console.error('Error loading students:', result.error);
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    };

    // Helper function to normalize batch times for comparison (same as AttendanceModal)
    const normalizeBatchTime = (batchTime) => {
        if (!batchTime) return '';
        
        // Clean and normalize the time string
        let normalizedTime = batchTime.trim();
        
        // Convert old format to new format for comparison
        const batchMappings = {
            'Morning (8-10)': 'Morning batch (8:00-10:00)',
            'Evening (4-6)': 'Evening batch (4:00-6:00)',
            '06:00 - 07:00': 'Morning batch (8:00-10:00)',
            '16:00 - 18:00': 'Evening batch (4:00-6:00)',
            '08:00 - 10:00': 'Morning batch (8:00-10:00)',
            '04:00 - 06:00': 'Evening batch (4:00-6:00)',
            '4:00-6:00': 'Evening batch (4:00-6:00)',
            '8:00-10:00': 'Morning batch (8:00-10:00)',
        };
        
        return batchMappings[normalizedTime] || normalizedTime;
    };

    // Check if student time matches class time (same logic as AttendanceModal)
    const timeMatches = (studentTime, classTime) => {
        if (!studentTime || !classTime) return false;
        
        const normalizedStudentTime = normalizeBatchTime(studentTime);
        const normalizedClassTime = normalizeBatchTime(classTime);
        
        // Exact match
        if (normalizedStudentTime === normalizedClassTime) return true;
        
        // Flexible matching for common variations
        const studentLower = normalizedStudentTime.toLowerCase().replace(/\s+/g, ' ');
        const classLower = normalizedClassTime.toLowerCase().replace(/\s+/g, ' ');
        
        return studentLower === classLower;
    };

    // Calculate eligible students for a class
    const getEligibleStudentsCount = (classItem) => {
        if (!classItem.time || students.length === 0) return 0;
        
        return students.filter(student => 
            timeMatches(student.batch_time, classItem.time)
        ).length;
    };

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadInitialData();
        setIsRefreshing(false);
    }, []);

    // Handle date selection from calendar
    const handleDatePress = useCallback((dateString, dayClasses) => {
        setSelectedDate(dateString);
        setSelectedDateClasses(dayClasses);
    }, []);

    // Handle class addition
    const handleClassAdded = useCallback((newClass) => {
        // Classes will be updated via real-time subscription
        // But we can also update locally for immediate feedback
        setClasses(prev => [...prev, newClass]);
        
        // Update today's classes if the new class is today
        if (newClass.date === getDateString()) {
            setTodaysClasses(prev => [...prev, newClass].sort((a, b) => a.time.localeCompare(b.time)));
        }
        
        // Update selected date classes if applicable
        if (newClass.date === selectedDate) {
            setSelectedDateClasses(prev => [...prev, newClass].sort((a, b) => a.time.localeCompare(b.time)));
        }
    }, [selectedDate]);

    // Handle bulk classes creation
    const handleBulkClassesCreated = useCallback((bulkResult) => {
        console.log('Bulk classes created:', bulkResult);
        
        // Reload all data to reflect the new classes
        loadInitialData();
        
        // Show success message
        const { created, skipped, errors } = bulkResult;
        let message = `Successfully created ${created.length} classes!`;
        
        if (skipped.length > 0) {
            message += `\n${skipped.length} classes were skipped due to conflicts.`;
        }
        
        if (errors.length > 0) {
            message += `\n${errors.length} classes had errors.`;
        }
        
        // Don't show alert here as it's already shown in the modal
        console.log('Bulk creation summary:', message);
    }, []);

    // Handle logout with confirmation
    const handleLogout = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: performLogout },
            ]
        );
    };

    // Perform actual logout
    const performLogout = async () => {
        try {
            setIsLoggingOut(true);
            const result = await logout();
            
            if (!result.success) {
                Alert.alert('Logout Error', result.error || 'Failed to sign out completely');
            }
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'An unexpected error occurred during logout');
        } finally {
            setIsLoggingOut(false);
        }
    };

    // Render class item
    const renderClassItem = ({ item: classItem }) => {
        const eligibleStudents = getEligibleStudentsCount(classItem);
        
        return (
            <View style={styles.classItem}>
                <View style={styles.classHeader}>
                    <View style={styles.classInfo}>
                        <Text style={styles.classTitle}>{classItem.title}</Text>
                    </View>
                    <View style={styles.classTime}>
                        <Text style={styles.classTimeText}>{formatTime(classItem.time)}</Text>
                    </View>
                </View>
                
                <View style={styles.classDetails}>
                    <View style={styles.classDetail}>
                        <Ionicons name="person-outline" size={14} color="#6b7280" />
                        <Text style={styles.classDetailText}>{classItem.instructor}</Text>
                    </View>
                    
                    <View style={styles.classDetail}>
                        <Ionicons name="people-outline" size={14} color="#6b7280" />
                        <Text style={styles.classDetailText}>
                            {eligibleStudents} eligible students
                        </Text>
                    </View>
                </View>
                
                {classItem.description && (
                    <Text style={styles.classDescription}>{classItem.description}</Text>
                )}
            </View>
        );
    };

    // Render empty state
    const renderEmptyState = (message) => (
        <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>{message}</Text>
        </View>
    );

    // Render loading state
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading classes...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Render error state
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>Classes</Text>
                        <Text style={styles.subtitle}>
                            Welcome back, {userName || 'User'}
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            style={styles.bulkButton}
                            onPress={() => setShowBulkModal(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar" size={18} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.addButton}
                            onPress={() => setShowAddModal(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={20} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.logoutButton, isLoggingOut && styles.disabledButton]}
                            onPress={handleLogout}
                            disabled={isLoggingOut}
                            activeOpacity={0.7}
                        >
                            {isLoggingOut ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar */}
                <Calendar
                    classes={classes}
                    selectedDate={selectedDate}
                    onDatePress={handleDatePress}
                />

                {/* Selected Date Classes */}
                {selectedDate && (
                    <View style={styles.selectedDateSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {selectedDate === getDateString() 
                                    ? "Today's Classes" 
                                    : `Classes on ${formatDate(selectedDate)}`
                                }
                            </Text>
                            <Text style={styles.sectionCount}>
                                {selectedDateClasses.length} {selectedDateClasses.length === 1 ? 'class' : 'classes'}
                            </Text>
                        </View>
                        
                        {selectedDateClasses.length > 0 ? (
                            <FlatList
                                data={selectedDateClasses}
                                renderItem={renderClassItem}
                                keyExtractor={(item) => item.$id}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            renderEmptyState(
                                selectedDate === getDateString() 
                                    ? "No classes scheduled for today" 
                                    : "No classes scheduled for this date"
                            )
                        )}
                    </View>
                )}

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Quick Stats</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{classes.length}</Text>
                            <Text style={styles.statLabel}>Total Classes</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{todaysClasses.length}</Text>
                            <Text style={styles.statLabel}>Today</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {classes.filter(cls => cls.date >= getDateString()).length}
                            </Text>
                            <Text style={styles.statLabel}>Upcoming</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Add Class Modal */}
            <AddClassModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onClassAdded={handleClassAdded}
            />

            {/* Bulk Class Scheduling Modal */}
            <BulkClassSchedulingModal
                visible={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                onClassesCreated={handleBulkClassesCreated}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#dc2626',
        textAlign: 'center',
        marginVertical: 16,
    },
    retryButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    addButton: {
        backgroundColor: '#10b981',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    logoutButton: {
        backgroundColor: '#ef4444',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    bulkButton: {
        backgroundColor: '#4f46e5',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    selectedDateSection: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    sectionCount: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    classItem: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    classHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    classInfo: {
        flex: 1,
    },
    classTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    classSport: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
    },
    classTime: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    classTimeText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    classDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    classDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    classDetailText: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 4,
    },
    classDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 12,
        textAlign: 'center',
    },
    statsSection: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginHorizontal: 4,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
});

export default ClassesScreen; 
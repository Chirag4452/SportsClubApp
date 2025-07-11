import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { classService, formatClassTime } from '../services/classService';
import { 
    attendanceService, 
    formatAttendanceDate,
    getAttendanceColor,
    calculateAttendancePercentage 
} from '../services/attendanceService';
import AttendanceModal from '../components/AttendanceModal';

const { width } = Dimensions.get('window');

const AttendanceScreen = () => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState({});
    const [dateFilter, setDateFilter] = useState('today'); // 'today', 'upcoming', 'all'

    const { logout, userName } = useAuth();

    // Initialize data loading
    useEffect(() => {
        loadInitialData();
    }, []);

    // Set up real-time subscriptions for classes and attendance
    useEffect(() => {
        const classUnsubscribe = classService.subscribeToClasses((update) => {
            console.log('Real-time class update received:', update.type);
            loadClasses();
        });

        const attendanceUnsubscribe = attendanceService.subscribeToAttendance((update) => {
            console.log('Real-time attendance update received:', update.type);
            loadAttendanceStats();
        });

        return () => {
            if (classUnsubscribe) classUnsubscribe();
            if (attendanceUnsubscribe) attendanceUnsubscribe();
        };
    }, []);

    // Load initial data
    const loadInitialData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await Promise.all([
                loadClasses(),
                loadAttendanceStats()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            setError('Failed to load attendance data');
        } finally {
            setIsLoading(false);
        }
    };

    // Load classes based on date filter
    const loadClasses = async () => {
        try {
            let result;
            
            if (dateFilter === 'today') {
                result = await classService.getTodaysClasses();
            } else if (dateFilter === 'upcoming') {
                result = await classService.getUpcomingClasses(7); // Next 7 days
            } else {
                result = await classService.getClasses({ limit: 50 });
            }
            
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

    // Load attendance statistics for all classes
    const loadAttendanceStats = async () => {
        try {
            // Get attendance stats for each class
            const statsPromises = classes.map(async (classItem) => {
                const today = new Date().toISOString().split('T')[0];
                const classDate = classItem.date || today;
                
                const stats = await attendanceService.getAttendanceStats(classItem.$id, classDate);
                return {
                    classId: classItem.$id,
                    date: classDate,
                    stats: stats.success ? stats.data : null
                };
            });

            const statsResults = await Promise.all(statsPromises);
            
            const statsMap = {};
            statsResults.forEach(result => {
                if (result.stats) {
                    const key = `${result.classId}_${result.date}`;
                    statsMap[key] = result.stats;
                }
            });

            setAttendanceStats(statsMap);
        } catch (error) {
            console.error('Error loading attendance stats:', error);
        }
    };

    // Update classes when date filter changes
    useEffect(() => {
        if (!isLoading) {
            loadClasses();
        }
    }, [dateFilter]);

    // Update attendance stats when classes change
    useEffect(() => {
        if (classes.length > 0 && !isLoading) {
            loadAttendanceStats();
        }
    }, [classes]);

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadInitialData();
        setIsRefreshing(false);
    }, []);

    // Handle class selection for attendance
    const handleClassPress = (classItem) => {
        const classDate = classItem.date || new Date().toISOString().split('T')[0];
        setSelectedClass(classItem);
        setSelectedDate(classDate);
        setShowAttendanceModal(true);
    };

    // Handle attendance update
    const handleAttendanceUpdated = useCallback((attendanceData) => {
        // Refresh attendance stats
        loadAttendanceStats();
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

    // Get attendance stats for a class
    const getClassAttendanceStats = (classItem) => {
        const classDate = classItem.date || new Date().toISOString().split('T')[0];
        const key = `${classItem.$id}_${classDate}`;
        return attendanceStats[key] || null;
    };

    // Render class item
    const renderClassItem = ({ item: classItem }) => {
        const stats = getClassAttendanceStats(classItem);
        const classDate = classItem.date || new Date().toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        const isToday = classDate === today;
        const isPast = new Date(classDate) < new Date(today);

        return (
            <TouchableOpacity
                style={[
                    styles.classCard,
                    isToday && styles.todayClass,
                    isPast && styles.pastClass
                ]}
                onPress={() => handleClassPress(classItem)}
                activeOpacity={0.7}
            >
                <View style={styles.classHeader}>
                    <View style={styles.classInfo}>
                        <Text style={[
                            styles.className,
                            isPast && styles.pastText
                        ]}>
                            {classItem.title}
                        </Text>
                        <View style={styles.classDetails}>
                            <Text style={[styles.classTime, isPast && styles.pastText]}>
                                {formatClassTime(classItem.time)}
                            </Text>
                        </View>
                        <Text style={[styles.classDate, isPast && styles.pastText]}>
                            {formatAttendanceDate(classDate)}
                            {isToday && <Text style={styles.todayBadge}> • Today</Text>}
                        </Text>
                    </View>

                    <View style={styles.attendanceStatus}>
                        {stats ? (
                            <>
                                <View style={styles.attendanceNumbers}>
                                    <Text style={styles.attendanceCount}>
                                        {stats.presentCount}/{stats.totalStudents}
                                    </Text>
                                    <Text style={styles.attendanceLabel}>Present</Text>
                                </View>
                                <View style={[
                                    styles.attendanceIndicator,
                                    { backgroundColor: getAttendanceColor(stats.attendancePercentage > 50) }
                                ]}>
                                    <Text style={styles.attendancePercentage}>
                                        {stats.attendancePercentage}%
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.noAttendance}>
                                <Ionicons name="add-circle-outline" size={24} color="#6b7280" />
                                <Text style={styles.markAttendanceText}>Mark</Text>
                            </View>
                        )}
                    </View>
                </View>

                {stats && (
                    <View style={styles.classStats}>
                        <View style={styles.statItem}>
                            <Ionicons name="people" size={16} color="#6b7280" />
                            <Text style={styles.statText}>{stats.totalStudents} Students</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="card" size={16} color="#10b981" />
                            <Text style={styles.statText}>{stats.paymentCompleteCount} Paid</Text>
                        </View>
                        {stats.lastMarkedBy && (
                            <View style={styles.statItem}>
                                <Ionicons name="person" size={16} color="#6b7280" />
                                <Text style={styles.statText}>By {stats.lastMarkedBy}</Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Classes Found</Text>
            <Text style={styles.emptyStateText}>
                {dateFilter === 'today' 
                    ? "No classes scheduled for today"
                    : dateFilter === 'upcoming'
                    ? "No upcoming classes in the next 7 days"
                    : "No classes found"
                }
            </Text>
            <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setDateFilter('all')}
            >
                <Text style={styles.emptyStateButtonText}>View All Classes</Text>
            </TouchableOpacity>
        </View>
    );

    // Render date filter tabs
    const renderDateFilterTabs = () => (
        <View style={styles.filterContainer}>
            {[
                { key: 'today', label: 'Today' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'all', label: 'All' }
            ].map((filter) => (
                <TouchableOpacity
                    key={filter.key}
                    style={[
                        styles.filterTab,
                        dateFilter === filter.key && styles.activeFilterTab
                    ]}
                    onPress={() => setDateFilter(filter.key)}
                >
                    <Text style={[
                        styles.filterTabText,
                        dateFilter === filter.key && styles.activeFilterTabText
                    ]}>
                        {filter.label}
                    </Text>
                </TouchableOpacity>
            ))}
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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Attendance</Text>
                    <Text style={styles.subtitle}>
                        Welcome back, {userName || 'User'}
                    </Text>
                </View>
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

            {/* Date Filter Tabs */}
            {renderDateFilterTabs()}

            {/* Classes List */}
            <View style={styles.listContainer}>
                <FlatList
                    data={classes}
                    renderItem={renderClassItem}
                    keyExtractor={(item) => item.$id}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={classes.length === 0 ? styles.emptyListContainer : styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </View>

            {/* Attendance Modal */}
            <AttendanceModal
                visible={showAttendanceModal}
                onClose={() => setShowAttendanceModal(false)}
                selectedClass={selectedClass}
                classDate={selectedDate}
                onAttendanceUpdated={handleAttendanceUpdated}
            />
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
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeFilterTab: {
        backgroundColor: '#3b82f6',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    activeFilterTabText: {
        color: '#ffffff',
    },
    listContainer: {
        flex: 1,
        marginTop: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    classCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    todayClass: {
        borderLeftWidth: 4,
        borderLeftColor: '#10b981',
    },
    pastClass: {
        opacity: 0.7,
    },
    classHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    classInfo: {
        flex: 1,
        marginRight: 16,
    },
    className: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 6,
    },
    classDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    sportBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sportText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    classTime: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    classDate: {
        fontSize: 14,
        color: '#9ca3af',
    },
    todayBadge: {
        color: '#10b981',
        fontWeight: '600',
    },
    pastText: {
        color: '#9ca3af',
    },
    attendanceStatus: {
        alignItems: 'center',
    },
    attendanceNumbers: {
        alignItems: 'center',
        marginBottom: 4,
    },
    attendanceCount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    attendanceLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    attendanceIndicator: {
        width: 50,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attendancePercentage: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    noAttendance: {
        alignItems: 'center',
    },
    markAttendanceText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    classStats: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: '#6b7280',
    },
    separator: {
        height: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        paddingHorizontal: 32,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    emptyStateButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyStateButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyListContainer: {
        flex: 1,
    },
});

export default AttendanceScreen; 
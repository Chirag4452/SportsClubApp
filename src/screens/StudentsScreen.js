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
    TextInput,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { 
    studentService, 
    formatPhoneNumber, 
    formatEnrollmentDate, 
    getStudentStatusColor, 
    formatAgeWithDOB
} from '../services/studentService';
import AddStudentModal from '../components/AddStudentModal';

const { width } = Dimensions.get('window');

const StudentsScreen = () => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const { logout, userName } = useAuth();

    // Initialize data loading
    useEffect(() => {
        loadInitialData();
    }, []);

    // Set up real-time subscriptions
    useEffect(() => {
        const unsubscribe = studentService.subscribeToStudents((update) => {
            console.log('Real-time student update received:', update.type);
            
            // Reload data when students are updated
            loadStudents();
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    // Filter students based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStudents(students);
        } else {
            const filtered = students.filter(student =>
                student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.phone.includes(searchQuery)
            );
            setFilteredStudents(filtered);
        }
    }, [searchQuery, students]);

    // Load initial data
    const loadInitialData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await loadStudents();
        } catch (error) {
            console.error('Error loading initial data:', error);
            setError('Failed to load student data');
        } finally {
            setIsLoading(false);
        }
    };

    // Load all students
    const loadStudents = async () => {
        try {
            const result = await studentService.getStudents({ limit: 500 });
            
            if (result.success) {
                setStudents(result.data);
            } else {
                console.error('Error loading students:', result.error);
                if (!isLoading) {
                    setError(result.error);
                }
            }
        } catch (error) {
            console.error('Error loading students:', error);
            if (!isLoading) {
                setError('Failed to load students');
            }
        }
    };



    // Handle refresh
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadInitialData();
        setIsRefreshing(false);
    }, []);

    // Handle student addition
    const handleStudentAdded = useCallback((newStudent) => {
        // Don't update local state here - let real-time subscription handle it
        // This prevents duplicate entries
        console.log('Student added successfully, real-time updates will refresh the list');
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

    // Render student item
    const renderStudentItem = ({ item: student }) => (
        <View style={styles.studentCard}>
            <View style={styles.studentHeader}>
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <View style={styles.studentBadges}>
                        <View style={styles.batchBadge}>
                            <Text style={styles.batchText}>{student.batch_time}</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: getStudentStatusColor(student.status || 'active') }]} />
            </View>
            
            <View style={styles.studentDetails}>
                <View style={styles.contactInfo}>
                    <View style={styles.contactItem}>
                        <Ionicons name="mail-outline" size={14} color="#6b7280" />
                        <Text style={styles.contactText}>{student.email}</Text>
                    </View>
                    <View style={styles.contactItem}>
                        <Ionicons name="call-outline" size={14} color="#6b7280" />
                        <Text style={styles.contactText}>{formatPhoneNumber(student.phone)}</Text>
                    </View>
                    <View style={styles.contactItem}>
                        <Ionicons name="person-outline" size={14} color="#6b7280" />
                        <Text style={styles.contactText}>{formatAgeWithDOB(student.date_of_birth)}</Text>
                    </View>
                </View>
                
                {student.enrollment_date && (
                    <View style={styles.enrollmentInfo}>
                        <Text style={styles.enrollmentText}>
                            Enrolled: {formatEnrollmentDate(student.enrollment_date)}
                        </Text>
                    </View>
                )}
            </View>
            
            {student.notes && student.notes.trim() && (
                <View style={styles.notesSection}>
                    <Text style={styles.notesText}>{student.notes}</Text>
                </View>
            )}
        </View>
    );

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Students Found</Text>
            <Text style={styles.emptyStateText}>
                {searchQuery 
                    ? `No students match "${searchQuery}"`
                    : "Start by adding your first student"
                }
            </Text>
            {!searchQuery && (
                <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Text style={styles.emptyStateButtonText}>Add Student</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    // Render search header
    const renderSearchHeader = () => (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={20} color="#6b7280" />
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search students by name, email, or phone"
                    placeholderTextColor="#9ca3af"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#6b7280" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    // Render loading state
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading students...</Text>
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
                    <Text style={styles.title}>Students</Text>
                    <Text style={styles.subtitle}>
                        Welcome back, {userName || 'User'}
                    </Text>
                </View>
                <View style={styles.headerActions}>
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

            {/* Search */}
            {renderSearchHeader()}

            {/* Student List */}
            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>
                        {searchQuery 
                            ? `Search Results (${filteredStudents.length})`
                            : `All Students (${filteredStudents.length})`
                        }
                    </Text>
                </View>
                
                <FlatList
                    data={filteredStudents}
                    renderItem={renderStudentItem}
                    keyExtractor={(item) => item.$id}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={filteredStudents.length === 0 ? styles.emptyListContainer : null}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </View>

            {/* Add Student Modal */}
            <AddStudentModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onStudentAdded={handleStudentAdded}
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
    },
    listContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    listHeader: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    studentCard: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
    },
    studentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    studentBadges: {
        flexDirection: 'row',
        gap: 8,
    },
    sportBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    batchBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    batchText: {
        color: '#374151',
        fontSize: 12,
        fontWeight: '500',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 4,
    },
    studentDetails: {
        marginBottom: 8,
    },
    contactInfo: {
        gap: 6,
        marginBottom: 8,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 6,
    },
    enrollmentInfo: {
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    enrollmentText: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    notesSection: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
    },
    notesText: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    separator: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 20,
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

export default StudentsScreen; 
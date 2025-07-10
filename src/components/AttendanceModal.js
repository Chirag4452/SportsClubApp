import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
    attendanceService, 
    formatAttendanceStatus,
    formatPaymentStatus,
    getAttendanceColor,
    getPaymentColor 
} from '../services/attendanceService';
import { studentService } from '../services/studentService';
import { useAuth } from '../context/AuthContext';

const AttendanceModal = ({ 
    visible, 
    onClose, 
    selectedClass, 
    classDate, 
    onAttendanceUpdated 
}) => {
    // State management
    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        present: 0,
        absent: 0,
        paymentComplete: 0,
        paymentPending: 0
    });

    const { userName } = useAuth();

    // Load data when modal opens
    useEffect(() => {
        if (visible && selectedClass) {
            loadAttendanceData();
        } else {
            resetState();
        }
    }, [visible, selectedClass, classDate]);

    // Calculate stats when attendance data changes
    useEffect(() => {
        calculateStats();
    }, [attendanceData, students]);

    const resetState = () => {
        setStudents([]);
        setAttendanceData({});
        setError(null);
        setStats({
            total: 0,
            present: 0,
            absent: 0,
            paymentComplete: 0,
            paymentPending: 0
        });
    };

    const loadAttendanceData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('📚 Loading attendance data for class:', selectedClass.title, 'on', classDate);

            // Load students for this sport/batch
            const studentsResult = await studentService.getStudentsBySport(selectedClass.sport);
            
            if (!studentsResult.success) {
                throw new Error(studentsResult.error);
            }

            // Helper function to normalize batch times for comparison
            const normalizeBatchTime = (batchTime) => {
                if (!batchTime) return '';
                
                // Convert old format to new format for comparison
                const batchMappings = {
                    'Morning (8-10)': 'Morning batch (8:00-10:00)',
                    'Evening (4-6)': 'Evening batch (4:00-6:00)',
                    // Add any other old formats you might have
                    '06:00 - 07:00': 'Morning batch (8:00-10:00)', // Legacy morning
                    '16:00 - 18:00': 'Evening batch (4:00-6:00)',  // Legacy evening
                    '08:00 - 10:00': 'Morning batch (8:00-10:00)', // Alternative morning
                    '04:00 - 06:00': 'Evening batch (4:00-6:00)',  // Alternative evening
                };
                
                // Return mapped value if exists, otherwise return original
                return batchMappings[batchTime] || batchTime;
            };

            // Filter students by batch time with smart format matching
            const filteredStudents = studentsResult.data.filter(student => {
                if (!selectedClass.time) {
                    return true; // If no specific time, include all students
                }
                
                // Normalize both class and student batch times for comparison
                const normalizedClassTime = normalizeBatchTime(selectedClass.time);
                const normalizedStudentTime = normalizeBatchTime(student.batch_time);
                
                const matches = normalizedStudentTime === normalizedClassTime;
                
                // Debug log for the problematic case
                if (student.batch_time && selectedClass.time) {
                    console.log(`🔄 Batch matching for ${student.name}:`);
                    console.log(`   Student: "${student.batch_time}" → "${normalizedStudentTime}"`);
                    console.log(`   Class: "${selectedClass.time}" → "${normalizedClassTime}"`);
                    console.log(`   Match: ${matches}`);
                }
                
                return matches;
            });

            setStudents(filteredStudents);
            console.log(`👥 Found ${filteredStudents.length} students for this class`);

            // Load existing attendance for this class and date
            const attendanceResult = await attendanceService.getAttendanceForClass(
                selectedClass.$id, 
                classDate
            );

            if (attendanceResult.success) {
                // Convert attendance array to object for easier lookup
                const attendanceMap = {};
                attendanceResult.data.forEach(record => {
                    attendanceMap[record.student_id] = {
                        is_present: record.is_present,
                        payment_complete: record.payment_complete,
                        notes: record.notes || '',
                        marked_by: record.marked_by,
                        marked_at: record.marked_at,
                        existing_id: record.$id
                    };
                });

                setAttendanceData(attendanceMap);
                console.log(`📊 Loaded existing attendance for ${Object.keys(attendanceMap).length} students`);
            } else {
                // Initialize empty attendance data for all students
                const initialAttendance = {};
                filteredStudents.forEach(student => {
                    initialAttendance[student.$id] = {
                        is_present: false,
                        payment_complete: false,
                        notes: '',
                        marked_by: null,
                        marked_at: null,
                        existing_id: null
                    };
                });
                setAttendanceData(initialAttendance);
            }

        } catch (error) {
            console.error('Error loading attendance data:', error);
            setError(error.message || 'Failed to load attendance data');
        } finally {
            setIsLoading(false);
        }
    };

    const calculateStats = () => {
        const total = students.length;
        let present = 0;
        let paymentComplete = 0;

        Object.values(attendanceData).forEach(attendance => {
            if (attendance.is_present) present++;
            if (attendance.payment_complete) paymentComplete++;
        });

        setStats({
            total,
            present,
            absent: total - present,
            paymentComplete,
            paymentPending: total - paymentComplete
        });
    };

    const toggleAttendance = (studentId) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                is_present: !prev[studentId]?.is_present
            }
        }));
    };

    const togglePayment = (studentId) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                payment_complete: !prev[studentId]?.payment_complete
            }
        }));
    };

    const markAllPresent = () => {
        const updatedAttendance = {};
        students.forEach(student => {
            updatedAttendance[student.$id] = {
                ...attendanceData[student.$id],
                is_present: true
            };
        });
        setAttendanceData(prev => ({ ...prev, ...updatedAttendance }));
    };

    const markAllAbsent = () => {
        const updatedAttendance = {};
        students.forEach(student => {
            updatedAttendance[student.$id] = {
                ...attendanceData[student.$id],
                is_present: false
            };
        });
        setAttendanceData(prev => ({ ...prev, ...updatedAttendance }));
    };

    const markAllPaymentComplete = () => {
        const updatedAttendance = {};
        students.forEach(student => {
            updatedAttendance[student.$id] = {
                ...attendanceData[student.$id],
                payment_complete: true
            };
        });
        setAttendanceData(prev => ({ ...prev, ...updatedAttendance }));
    };

    const saveAttendance = async () => {
        if (!selectedClass || !classDate) {
            Alert.alert('Error', 'Missing class or date information');
            return;
        }

        setIsSaving(true);

        try {
            console.log('💾 Saving attendance for', students.length, 'students');

            // Prepare attendance updates
            const attendanceUpdates = students.map(student => ({
                student_id: student.$id,
                is_present: attendanceData[student.$id]?.is_present || false,
                payment_complete: attendanceData[student.$id]?.payment_complete || false,
                notes: attendanceData[student.$id]?.notes || ''
            }));

            // Bulk update attendance
            const result = await attendanceService.bulkUpdateAttendance(
                attendanceUpdates,
                selectedClass.$id,
                classDate,
                userName || 'Unknown Instructor'
            );

            if (result.success) {
                const { successCount, errorCount } = result.data;
                
                if (errorCount > 0) {
                    Alert.alert(
                        'Partial Success', 
                        `${successCount} students saved successfully, ${errorCount} failed. Please try again for failed entries.`
                    );
                } else {
                    Alert.alert(
                        'Success', 
                        `Attendance saved for all ${successCount} students!`,
                        [
                            { 
                                text: 'OK', 
                                onPress: () => {
                                    onAttendanceUpdated?.(result.data);
                                    onClose();
                                }
                            }
                        ]
                    );
                }
            } else {
                Alert.alert('Error', result.error);
            }

        } catch (error) {
            console.error('Error saving attendance:', error);
            Alert.alert('Error', 'An unexpected error occurred while saving attendance');
        } finally {
            setIsSaving(false);
        }
    };

    const renderStudentItem = ({ item: student }) => {
        const attendance = attendanceData[student.$id] || {
            is_present: false,
            payment_complete: false
        };

        return (
            <View style={styles.studentItem}>
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentDetails}>
                        {student.email} • Age {student.age}
                    </Text>
                    {attendance.marked_by && (
                        <Text style={styles.markedByText}>
                            Marked by {attendance.marked_by}
                        </Text>
                    )}
                </View>

                <View style={styles.checkboxContainer}>
                    {/* Present/Absent Toggle */}
                    <TouchableOpacity
                        style={[
                            styles.checkbox,
                            attendance.is_present && styles.checkedBox,
                            { backgroundColor: getAttendanceColor(attendance.is_present) }
                        ]}
                        onPress={() => toggleAttendance(student.$id)}
                        disabled={isSaving}
                    >
                        <Ionicons
                            name={attendance.is_present ? "checkmark" : "close"}
                            size={16}
                            color="#ffffff"
                        />
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>
                        {formatAttendanceStatus(attendance.is_present)}
                    </Text>

                    {/* Payment Toggle */}
                    <TouchableOpacity
                        style={[
                            styles.checkbox,
                            styles.paymentCheckbox,
                            attendance.payment_complete && styles.checkedBox,
                            { backgroundColor: getPaymentColor(attendance.payment_complete) }
                        ]}
                        onPress={() => togglePayment(student.$id)}
                        disabled={isSaving}
                    >
                        <Ionicons
                            name={attendance.payment_complete ? "card" : "card-outline"}
                            size={16}
                            color="#ffffff"
                        />
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>
                        {formatPaymentStatus(attendance.payment_complete)}
                    </Text>
                </View>
            </View>
        );
    };

    const renderQuickActions = () => (
        <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
                <TouchableOpacity
                    style={[styles.quickActionButton, styles.presentAllButton]}
                    onPress={markAllPresent}
                    disabled={isSaving}
                >
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                    <Text style={styles.quickActionText}>All Present</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickActionButton, styles.absentAllButton]}
                    onPress={markAllAbsent}
                    disabled={isSaving}
                >
                    <Ionicons name="close-circle" size={16} color="#ffffff" />
                    <Text style={styles.quickActionText}>All Absent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickActionButton, styles.paymentAllButton]}
                    onPress={markAllPaymentComplete}
                    disabled={isSaving}
                >
                    <Ionicons name="card" size={16} color="#ffffff" />
                    <Text style={styles.quickActionText}>All Paid</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStats = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.paymentComplete}</Text>
                <Text style={styles.statLabel}>Paid</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
            </View>
        </View>
    );

    if (!selectedClass) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} disabled={isSaving}>
                        <Text style={styles.cancelButton}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>Mark Attendance</Text>
                        <Text style={styles.subtitle}>
                            {selectedClass.title} • {classDate}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={saveAttendance} 
                        disabled={isLoading || isSaving}
                        style={[styles.saveButton, (isLoading || isSaving) && styles.disabledButton]}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Loading State */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                        <Text style={styles.loadingText}>Loading students...</Text>
                    </View>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadAttendanceData}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Main Content */}
                {!isLoading && !error && (
                    <>
                        {/* Stats */}
                        {renderStats()}

                        {/* Quick Actions */}
                        {renderQuickActions()}

                        {/* Student List */}
                        <View style={styles.listContainer}>
                            <Text style={styles.listTitle}>
                                Students ({students.length})
                            </Text>
                            
                            {students.length > 0 ? (
                                <FlatList
                                    data={students}
                                    renderItem={renderStudentItem}
                                    keyExtractor={(item) => item.$id}
                                    showsVerticalScrollIndicator={false}
                                    style={styles.studentList}
                                />
                            ) : (
                                <View style={styles.emptyState}>
                                    <Ionicons name="people-outline" size={48} color="#9ca3af" />
                                    <Text style={styles.emptyStateText}>
                                        No students found for this class
                                    </Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
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
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
    },
    cancelButton: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    saveButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
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
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    quickActionsContainer: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    quickActionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        gap: 4,
    },
    presentAllButton: {
        backgroundColor: '#10b981',
    },
    absentAllButton: {
        backgroundColor: '#ef4444',
    },
    paymentAllButton: {
        backgroundColor: '#f59e0b',
    },
    quickActionText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    listContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    studentList: {
        flex: 1,
    },
    studentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    studentInfo: {
        flex: 1,
        marginRight: 16,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    studentDetails: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    markedByText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
        fontStyle: 'italic',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkbox: {
        width: 32,
        height: 32,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    paymentCheckbox: {
        marginLeft: 8,
    },
    checkedBox: {
        shadowOpacity: 0.15,
    },
    checkboxLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
        width: 50,
        textAlign: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
        textAlign: 'center',
    },
});

export default AttendanceModal; 
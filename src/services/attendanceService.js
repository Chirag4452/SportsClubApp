import { databases, DATABASE_ID, ID, Query } from '../config/appwrite';

// Collection ID for attendance - you'll need to create this collection in Appwrite
export const ATTENDANCE_COLLECTION_ID = 'attendance';

/**
 * Attendance data structure:
 * {
 *   $id: string (auto-generated)
 *   class_id: string (reference to class document)
 *   student_id: string (reference to student document)
 *   class_date: string (YYYY-MM-DD format)
 *   is_present: string ('true' or 'false' - stored as string in database)
 *   payment_complete: string ('true' or 'false' - stored as string in database)
 *   marked_by: string (instructor name/id who marked attendance)
 *   marked_at: string (ISO timestamp when attendance was marked)
 *   notes?: string (optional notes about attendance)
 *   created_at: string (ISO timestamp)
 * }
 */

class AttendanceService {
    /**
     * Mark attendance for a student in a class
     * @param {Object} attendanceData - The attendance data
     * @param {string} attendanceData.class_id - Class document ID
     * @param {string} attendanceData.student_id - Student document ID
     * @param {string} attendanceData.class_date - Date of the class (YYYY-MM-DD)
     * @param {boolean} attendanceData.is_present - Whether student was present
     * @param {boolean} attendanceData.payment_complete - Whether payment is complete
     * @param {string} attendanceData.marked_by - Instructor who marked attendance
     * @param {string} [attendanceData.notes] - Optional notes
     * @returns {Promise<Object>} Created/updated attendance record or error
     */
    async markAttendance(attendanceData) {
        try {
            console.log('🔧 AttendanceService: Starting attendance marking...');
            console.log('📊 Database ID:', DATABASE_ID);
            console.log('📚 Collection ID:', ATTENDANCE_COLLECTION_ID);
            console.log('📝 Attendance data:', attendanceData);

            const now = new Date().toISOString();
            
            // Check if attendance already exists for this student in this class on this date
            const existingAttendance = await this.getAttendanceRecord(
                attendanceData.class_id,
                attendanceData.student_id,
                attendanceData.class_date
            );

            const attendanceDocument = {
                class_id: attendanceData.class_id,
                student_id: attendanceData.student_id,
                class_date: attendanceData.class_date,
                is_present: attendanceData.is_present ? 'true' : 'false',
                payment_complete: attendanceData.payment_complete ? 'true' : 'false',
                marked_by: attendanceData.marked_by,
                marked_at: now,
                notes: attendanceData.notes?.trim() || '',
                created_at: now,
            };

            let result;

            if (existingAttendance.success && existingAttendance.data) {
                // Update existing attendance record
                console.log('📝 Updating existing attendance record:', existingAttendance.data.$id);
                result = await databases.updateDocument(
                    DATABASE_ID,
                    ATTENDANCE_COLLECTION_ID,
                    existingAttendance.data.$id,
                    {
                        is_present: attendanceDocument.is_present,
                        payment_complete: attendanceDocument.payment_complete,
                        marked_by: attendanceDocument.marked_by,
                        marked_at: attendanceDocument.marked_at,
                        notes: attendanceDocument.notes,
                    }
                );
                console.log('✅ Attendance updated successfully:', result.$id);
            } else {
                // Create new attendance record
                console.log('📝 Creating new attendance record');
                result = await databases.createDocument(
                    DATABASE_ID,
                    ATTENDANCE_COLLECTION_ID,
                    ID.unique(),
                    attendanceDocument
                );
                console.log('✅ Attendance created successfully:', result.$id);
            }

            return { success: true, data: result, wasUpdate: !!existingAttendance.data };
        } catch (error) {
            console.error('❌ Error marking attendance:', error);
            console.error('🔍 Error details:', {
                message: error.message,
                code: error.code,
                type: error.type,
                response: error.response
            });
            
            let errorMessage = 'Failed to mark attendance. Please try again.';
            if (error.code === 400) {
                errorMessage = 'Invalid attendance data. Please check all fields.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to mark attendance.';
            } else if (error.code === 404) {
                errorMessage = 'Database or collection not found. Please check your setup.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Get attendance record for a specific student in a class on a date
     * @param {string} classId - Class document ID
     * @param {string} studentId - Student document ID
     * @param {string} classDate - Date of the class (YYYY-MM-DD)
     * @returns {Promise<Object>} Attendance record or null
     */
    async getAttendanceRecord(classId, studentId, classDate) {
        try {
            const queries = [
                Query.equal('class_id', classId),
                Query.equal('student_id', studentId),
                Query.equal('class_date', classDate),
                Query.limit(1)
            ];

            const result = await databases.listDocuments(
                DATABASE_ID,
                ATTENDANCE_COLLECTION_ID,
                queries
            );

            return {
                success: true,
                data: result.documents.length > 0 ? result.documents[0] : null
            };
        } catch (error) {
            console.error('Error getting attendance record:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all attendance records for a specific class on a date
     * @param {string} classId - Class document ID
     * @param {string} classDate - Date of the class (YYYY-MM-DD)
     * @returns {Promise<Object>} Attendance records array or error
     */
    async getAttendanceForClass(classId, classDate) {
        try {
            const queries = [
                Query.equal('class_id', classId),
                Query.equal('class_date', classDate),
                Query.orderAsc('created_at')
            ];

            const result = await databases.listDocuments(
                DATABASE_ID,
                ATTENDANCE_COLLECTION_ID,
                queries
            );

            // Convert string booleans back to actual booleans for easier handling
            const attendanceRecords = result.documents.map(record => ({
                ...record,
                is_present: record.is_present === 'true',
                payment_complete: record.payment_complete === 'true',
            }));

            return { success: true, data: attendanceRecords };
        } catch (error) {
            console.error('Error fetching attendance for class:', error);
            
            let errorMessage = 'Failed to load attendance records. Please try again.';
            if (error.code === 401) {
                errorMessage = 'You are not authorized to view attendance records.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Bulk update attendance for multiple students
     * @param {Array} attendanceUpdates - Array of attendance updates
     * @param {string} classId - Class document ID
     * @param {string} classDate - Date of the class
     * @param {string} markedBy - Instructor marking attendance
     * @returns {Promise<Object>} Bulk update results
     */
    async bulkUpdateAttendance(attendanceUpdates, classId, classDate, markedBy) {
        try {
            console.log('🔧 Bulk updating attendance for', attendanceUpdates.length, 'students');
            
            const results = [];
            const errors = [];

            // Process each attendance update
            for (const update of attendanceUpdates) {
                try {
                    const result = await this.markAttendance({
                        class_id: classId,
                        student_id: update.student_id,
                        class_date: classDate,
                        is_present: update.is_present,
                        payment_complete: update.payment_complete,
                        marked_by: markedBy,
                        notes: update.notes || '',
                    });

                    if (result.success) {
                        results.push(result.data);
                    } else {
                        errors.push({
                            student_id: update.student_id,
                            error: result.error
                        });
                    }
                } catch (error) {
                    errors.push({
                        student_id: update.student_id,
                        error: error.message
                    });
                }
            }

            console.log('✅ Bulk attendance update completed:', {
                successful: results.length,
                failed: errors.length
            });

            return {
                success: true,
                data: {
                    successful: results,
                    failed: errors,
                    totalProcessed: attendanceUpdates.length,
                    successCount: results.length,
                    errorCount: errors.length
                }
            };
        } catch (error) {
            console.error('Error in bulk attendance update:', error);
            return { success: false, error: error.message || 'Bulk update failed' };
        }
    }

    /**
     * Get attendance statistics for a class
     * @param {string} classId - Class document ID
     * @param {string} classDate - Date of the class
     * @returns {Promise<Object>} Attendance statistics
     */
    async getAttendanceStats(classId, classDate) {
        try {
            const attendanceResult = await this.getAttendanceForClass(classId, classDate);
            
            if (!attendanceResult.success) {
                return attendanceResult;
            }

            const attendance = attendanceResult.data;
            
            const stats = {
                totalStudents: attendance.length,
                presentCount: attendance.filter(a => a.is_present).length,
                absentCount: attendance.filter(a => !a.is_present).length,
                paymentCompleteCount: attendance.filter(a => a.payment_complete).length,
                paymentPendingCount: attendance.filter(a => !a.payment_complete).length,
                attendancePercentage: attendance.length > 0 
                    ? Math.round((attendance.filter(a => a.is_present).length / attendance.length) * 100)
                    : 0,
                paymentPercentage: attendance.length > 0
                    ? Math.round((attendance.filter(a => a.payment_complete).length / attendance.length) * 100)
                    : 0,
                lastMarkedBy: attendance.length > 0 ? attendance[attendance.length - 1].marked_by : null,
                lastMarkedAt: attendance.length > 0 ? attendance[attendance.length - 1].marked_at : null,
            };

            return { success: true, data: stats };
        } catch (error) {
            console.error('Error getting attendance stats:', error);
            return { success: false, error: error.message || 'Failed to load attendance statistics' };
        }
    }

    /**
     * Get attendance history for a student
     * @param {string} studentId - Student document ID
     * @param {number} [limit] - Limit number of records (default: 50)
     * @returns {Promise<Object>} Student attendance history
     */
    async getStudentAttendanceHistory(studentId, limit = 50) {
        try {
            const queries = [
                Query.equal('student_id', studentId),
                Query.orderDesc('class_date'),
                Query.limit(limit)
            ];

            const result = await databases.listDocuments(
                DATABASE_ID,
                ATTENDANCE_COLLECTION_ID,
                queries
            );

            // Convert string booleans and calculate stats
            const attendanceHistory = result.documents.map(record => ({
                ...record,
                is_present: record.is_present === 'true',
                payment_complete: record.payment_complete === 'true',
            }));

            const stats = {
                totalClasses: attendanceHistory.length,
                presentCount: attendanceHistory.filter(a => a.is_present).length,
                absentCount: attendanceHistory.filter(a => !a.is_present).length,
                attendancePercentage: attendanceHistory.length > 0
                    ? Math.round((attendanceHistory.filter(a => a.is_present).length / attendanceHistory.length) * 100)
                    : 0,
            };

            return {
                success: true,
                data: {
                    attendance: attendanceHistory,
                    stats
                }
            };
        } catch (error) {
            console.error('Error getting student attendance history:', error);
            return { success: false, error: error.message || 'Failed to load attendance history' };
        }
    }

    /**
     * Subscribe to real-time attendance updates
     * @param {Function} callback - Callback function to handle updates
     * @returns {Function} Unsubscribe function
     */
    subscribeToAttendance(callback) {
        try {
            const channel = `databases.${DATABASE_ID}.collections.${ATTENDANCE_COLLECTION_ID}.documents`;
            
            const unsubscribe = databases.client.subscribe(channel, (response) => {
                console.log('Real-time attendance update:', response);
                
                if (callback && typeof callback === 'function') {
                    callback({
                        type: response.events[0]?.split('.').pop() || 'update',
                        document: response.payload,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            console.log('Subscribed to attendance updates');
            return unsubscribe;
        } catch (error) {
            console.error('Error subscribing to attendance updates:', error);
            return () => {}; // Return empty function if subscription fails
        }
    }

    /**
     * Delete attendance record
     * @param {string} attendanceId - Attendance document ID
     * @returns {Promise<Object>} Success status or error
     */
    async deleteAttendance(attendanceId) {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                ATTENDANCE_COLLECTION_ID,
                attendanceId
            );

            console.log('Attendance record deleted successfully:', attendanceId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            
            let errorMessage = 'Failed to delete attendance record. Please try again.';
            if (error.code === 404) {
                errorMessage = 'Attendance record not found.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to delete this attendance record.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Get attendance summary for multiple classes
     * @param {Array} classIds - Array of class document IDs
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Attendance summary for classes
     */
    async getAttendanceSummary(classIds, startDate, endDate) {
        try {
            const queries = [
                Query.equal('class_id', classIds),
                Query.greaterThanEqual('class_date', startDate),
                Query.lessThanEqual('class_date', endDate),
                Query.orderDesc('class_date')
            ];

            const result = await databases.listDocuments(
                DATABASE_ID,
                ATTENDANCE_COLLECTION_ID,
                queries
            );

            // Group by class and date
            const summary = {};
            
            result.documents.forEach(record => {
                const key = `${record.class_id}_${record.class_date}`;
                if (!summary[key]) {
                    summary[key] = {
                        class_id: record.class_id,
                        class_date: record.class_date,
                        attendance: [],
                        stats: {
                            total: 0,
                            present: 0,
                            absent: 0,
                            paymentComplete: 0,
                            paymentPending: 0
                        }
                    };
                }
                
                const attendanceRecord = {
                    ...record,
                    is_present: record.is_present === 'true',
                    payment_complete: record.payment_complete === 'true',
                };
                
                summary[key].attendance.push(attendanceRecord);
                summary[key].stats.total++;
                
                if (attendanceRecord.is_present) {
                    summary[key].stats.present++;
                } else {
                    summary[key].stats.absent++;
                }
                
                if (attendanceRecord.payment_complete) {
                    summary[key].stats.paymentComplete++;
                } else {
                    summary[key].stats.paymentPending++;
                }
            });

            return { success: true, data: Object.values(summary) };
        } catch (error) {
            console.error('Error getting attendance summary:', error);
            return { success: false, error: error.message || 'Failed to load attendance summary' };
        }
    }
}

// Export singleton instance
export const attendanceService = new AttendanceService();

// Helper functions for formatting and utilities
export const formatAttendanceStatus = (isPresent) => {
    return isPresent ? 'Present' : 'Absent';
};

export const formatPaymentStatus = (paymentComplete) => {
    return paymentComplete ? 'Paid' : 'Pending';
};

export const getAttendanceColor = (isPresent) => {
    return isPresent ? '#10b981' : '#ef4444'; // Green for present, red for absent
};

export const getPaymentColor = (paymentComplete) => {
    return paymentComplete ? '#10b981' : '#f59e0b'; // Green for paid, amber for pending
};

export const calculateAttendancePercentage = (presentCount, totalCount) => {
    if (totalCount === 0) return 0;
    return Math.round((presentCount / totalCount) * 100);
};

export const formatAttendanceDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const formatAttendanceTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}; 
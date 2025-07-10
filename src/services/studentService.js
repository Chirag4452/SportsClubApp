import { databases, DATABASE_ID, ID, Query } from '../config/appwrite';
import { SPORTS_OPTIONS } from './classService';

// Collection ID for students - you'll need to create this collection in Appwrite
export const STUDENTS_COLLECTION_ID = 'students';

// Batch time options for dropdown
export const BATCH_TIME_OPTIONS = [
    '06:00 - 07:00',
    '07:00 - 08:00', 
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00',
    '18:00 - 19:00',
    '19:00 - 20:00'
];

/**
 * Student data structure:
 * {
 *   $id: string (auto-generated)
 *   name: string
 *   phone: string
 *   email: string
 *   age: string (stored as string in database)
 *   sport: string
 *   batch_time: string
 *   enrollment_date?: string
 *   status?: string ('active', 'inactive', 'suspended')
 *   notes?: string
 *   created_at: string (ISO timestamp)
 *   updated_at: string (ISO timestamp)
 * }
 */

class StudentService {
    /**
     * Create a new student in the database
     * @param {Object} studentData - The student data
     * @param {string} studentData.name - Student name
     * @param {string} studentData.phone - Student phone number
     * @param {string} studentData.email - Student email
     * @param {string} studentData.age - Student age (as string)
     * @param {string} studentData.sport - Sport type
     * @param {string} studentData.batch_time - Batch time
     * @param {string} [studentData.enrollment_date] - Enrollment date
     * @param {string} [studentData.notes] - Additional notes
     * @returns {Promise<Object>} Created student document
     */
    async createStudent(studentData) {
        try {
            console.log('🔧 StudentService: Starting student creation...');
            console.log('📊 Database ID:', DATABASE_ID);
            console.log('📚 Collection ID:', STUDENTS_COLLECTION_ID);
            console.log('📝 Student data:', studentData);

            const now = new Date().toISOString();
            
            // Only include attributes that exist in your database
            const studentDocument = {
                name: studentData.name.trim(),
                phone: studentData.phone.trim(),
                email: studentData.email.trim().toLowerCase(),
                age: studentData.age.trim(), // Keep as string since database expects string
                sport: studentData.sport,
                batch_time: studentData.batch_time,
                created_at: now, // This attribute exists and is required
            };

            console.log('📄 Final document to save:', studentDocument);

            const result = await databases.createDocument(
                DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                ID.unique(),
                studentDocument
            );

            console.log('✅ Student created successfully:', result.$id);
            return { success: true, data: result };
        } catch (error) {
            console.error('❌ Error creating student:', error);
            console.error('🔍 Error details:', {
                message: error.message,
                code: error.code,
                type: error.type,
                response: error.response
            });
            
            let errorMessage = 'Failed to create student. Please try again.';
            if (error.code === 400) {
                errorMessage = 'Invalid student data. Please check all fields.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to create students.';
            } else if (error.code === 404) {
                errorMessage = 'Database or collection not found. Please check your setup.';
            } else if (error.code === 409) {
                errorMessage = 'A student with this email already exists.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Get all students with optional filtering
     * @param {Object} [filters] - Optional filters
     * @param {string} [filters.sport] - Filter by sport
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.search] - Search by name, email, or phone
     * @param {number} [filters.limit] - Limit number of results
     * @returns {Promise<Object>} Students array or error
     */
    async getStudents(filters = {}) {
        try {
            const queries = [];
            
            // Add sport filter if provided
            if (filters.sport) {
                queries.push(Query.equal('sport', filters.sport));
            }
            
            // Add status filter if provided
            if (filters.status) {
                queries.push(Query.equal('status', filters.status));
            }
            
            // Add limit if provided
            if (filters.limit) {
                queries.push(Query.limit(filters.limit));
            }
            
            // Order by name
            queries.push(Query.orderAsc('name'));

            const result = await databases.listDocuments(
                DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                queries
            );

            let students = result.documents;

            // Apply search filter client-side for flexibility
            if (filters.search && filters.search.trim()) {
                const searchTerm = filters.search.trim().toLowerCase();
                students = students.filter(student => 
                    student.name.toLowerCase().includes(searchTerm) ||
                    student.email.toLowerCase().includes(searchTerm) ||
                    student.phone.includes(searchTerm)
                );
            }

            return { success: true, data: students };
        } catch (error) {
            console.error('Error fetching students:', error);
            
            let errorMessage = 'Failed to load students. Please try again.';
            if (error.code === 401) {
                errorMessage = 'You are not authorized to view students.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Search students by name, email, or phone
     * @param {string} searchTerm - Search term
     * @returns {Promise<Object>} Filtered students array or error
     */
    async searchStudents(searchTerm) {
        return this.getStudents({ search: searchTerm });
    }

    /**
     * Get students by sport
     * @param {string} sport - Sport name
     * @returns {Promise<Object>} Students array or error
     */
    async getStudentsBySport(sport) {
        return this.getStudents({ sport });
    }

    /**
     * Get students by batch time
     * @param {string} batchTime - Batch time
     * @returns {Promise<Object>} Students array or error
     */
    async getStudentsByBatchTime(batchTime) {
        try {
            const queries = [
                Query.equal('batch_time', batchTime),
                Query.orderAsc('name')
            ];

            const result = await databases.listDocuments(
                DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                queries
            );

            return { success: true, data: result.documents };
        } catch (error) {
            console.error('Error fetching students by batch time:', error);
            return { success: false, error: error.message || 'Failed to load students for batch time' };
        }
    }

    /**
     * Update a student
     * @param {string} studentId - Student document ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated student or error
     */
    async updateStudent(studentId, updateData) {
        try {
            // Don't include updated_at if it doesn't exist in your database
            const updatedData = {
                ...updateData,
            };

            const result = await databases.updateDocument(
                DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                studentId,
                updatedData
            );

            console.log('Student updated successfully:', studentId);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error updating student:', error);
            
            let errorMessage = 'Failed to update student. Please try again.';
            if (error.code === 404) {
                errorMessage = 'Student not found.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to update this student.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Delete a student
     * @param {string} studentId - Student document ID
     * @returns {Promise<Object>} Success status or error
     */
    async deleteStudent(studentId) {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                studentId
            );

            console.log('Student deleted successfully:', studentId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting student:', error);
            
            let errorMessage = 'Failed to delete student. Please try again.';
            if (error.code === 404) {
                errorMessage = 'Student not found.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to delete this student.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Subscribe to real-time student updates
     * @param {Function} callback - Callback function to handle updates
     * @returns {Function} Unsubscribe function
     */
    subscribeToStudents(callback) {
        try {
            const channel = `databases.${DATABASE_ID}.collections.${STUDENTS_COLLECTION_ID}.documents`;
            
            const unsubscribe = databases.client.subscribe(channel, (response) => {
                console.log('Real-time student update:', response);
                
                if (callback && typeof callback === 'function') {
                    callback({
                        type: response.events[0]?.split('.').pop() || 'update',
                        document: response.payload,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            console.log('Subscribed to student updates');
            return unsubscribe;
        } catch (error) {
            console.error('Error subscribing to student updates:', error);
            return () => {}; // Return empty function if subscription fails
        }
    }

    /**
     * Get student statistics
     * @returns {Promise<Object>} Student statistics or error
     */
    async getStudentStats() {
        try {
            const allStudentsResult = await this.getStudents({ limit: 1000 });
            
            if (!allStudentsResult.success) {
                return allStudentsResult;
            }

            const students = allStudentsResult.data;
            
            const stats = {
                totalStudents: students.length,
                activeStudents: students.length, // Assume all are active since status might not exist
                sportsCount: {},
                batchTimeCount: {},
                recentEnrollments: 0, // Set to 0 since enrollment_date might not exist
            };

            // Count students by sport
            students.forEach(student => {
                stats.sportsCount[student.sport] = (stats.sportsCount[student.sport] || 0) + 1;
            });

            // Count students by batch time
            students.forEach(student => {
                stats.batchTimeCount[student.batch_time] = (stats.batchTimeCount[student.batch_time] || 0) + 1;
            });

            return { success: true, data: stats };
        } catch (error) {
            console.error('Error getting student stats:', error);
            return { success: false, error: error.message || 'Failed to load student statistics' };
        }
    }

    /**
     * Check for duplicate email
     * @param {string} email - Email to check
     * @returns {Promise<Object>} Duplicate check result
     */
    async checkDuplicateEmail(email) {
        try {
            const queries = [
                Query.equal('email', email.toLowerCase().trim()),
                Query.limit(1)
            ];

            const result = await databases.listDocuments(
                DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                queries
            );

            return {
                success: true,
                isDuplicate: result.documents.length > 0,
                existingStudent: result.documents[0] || null
            };
        } catch (error) {
            console.error('Error checking duplicate email:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
export const studentService = new StudentService();

// Helper functions for formatting
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // Basic phone formatting - adjust based on your region
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
};

export const formatEnrollmentDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const getStudentStatusColor = (status) => {
    const colors = {
        'active': '#10b981',
        'inactive': '#6b7280',
        'suspended': '#ef4444',
    };
    return colors[status] || '#6b7280';
};

export const getSportColor = (sport) => {
    const colors = {
        'Football': '#ef4444',
        'Basketball': '#f97316',
        'Tennis': '#eab308',
        'Swimming': '#06b6d4',
        'Volleyball': '#8b5cf6',
        'Baseball': '#10b981',
        'Soccer': '#22c55e',
        'Golf': '#84cc16',
        'Track & Field': '#f59e0b',
        'Wrestling': '#dc2626',
        'Gymnastics': '#ec4899',
        'Other': '#6b7280',
    };
    return colors[sport] || '#6b7280';
}; 
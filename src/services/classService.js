import { databases, DATABASE_ID, ID, Query } from '../config/appwrite';

// Collection ID for classes - you'll need to create this collection in Appwrite
export const CLASSES_COLLECTION_ID = 'classes';

// Sports options for dropdown
export const SPORTS_OPTIONS = [
    'Football',
    'Basketball',
    'Tennis',
    'Swimming',
    'Volleyball',
    'Baseball',
    'Soccer',
    'Golf',
    'Track & Field',
    'Wrestling',
    'Gymnastics',
    'Other'
];

// Time/Batch options for dropdown (matching student batch times)
export const TIME_OPTIONS = [
    'Morning batch (8:00-10:00)',
    'Evening batch (4:00-6:00)'
];

/**
 * Class data structure:
 * {
 *   $id: string (auto-generated)
 *   title: string
 *   sport: string
 *   date: string (YYYY-MM-DD)
 *   time: string (HH:MM)
 *   instructor: string
 *   instructor_id: string (user ID)
 *   description?: string
 *   max_participants?: number
 *   current_participants?: number
 *   created_at: string (ISO timestamp)
 *   updated_at: string (ISO timestamp)
 * }
 */

class ClassService {
    /**
     * Create a new class in the database
     * @param {Object} classData - The class data
     * @param {string} classData.title - Class title
     * @param {string} classData.sport - Sport type
     * @param {string} classData.date - Class date (YYYY-MM-DD)
     * @param {string} classData.time - Class time (HH:MM)
     * @param {string} classData.instructor - Instructor name
     * @param {string} classData.instructorId - Instructor user ID
     * @param {string} [classData.description] - Optional description
     * @param {number} [classData.maxParticipants] - Maximum participants
     * @returns {Promise<Object>} Created class document
     */
    async createClass(classData) {
        try {
            console.log('🔧 ClassService: Starting class creation...');
            console.log('📊 Database ID:', DATABASE_ID);
            console.log('📚 Collection ID:', CLASSES_COLLECTION_ID);
            console.log('📝 Class data:', classData);

            const now = new Date().toISOString();
            
            const classDocument = {
                title: classData.title.trim(),
                sport: classData.sport,
                date: classData.date,
                time: classData.time,
                instructor: classData.instructor.trim(),
                instructor_id: classData.instructorId, // Changed to snake_case
                description: classData.description?.trim() || '',
                max_participants: classData.maxParticipants || 20, // Changed to snake_case
                current_participants: 0, // Changed to snake_case
                created_at: now, // Changed to snake_case
                updated_at: now, // Changed to snake_case
            };

            console.log('📄 Final document to save:', classDocument);

            const result = await databases.createDocument(
                DATABASE_ID,
                CLASSES_COLLECTION_ID,
                ID.unique(),
                classDocument
            );

            console.log('✅ Class created successfully:', result.$id);
            return { success: true, data: result };
        } catch (error) {
            console.error('❌ Error creating class:', error);
            console.error('🔍 Error details:', {
                message: error.message,
                code: error.code,
                type: error.type,
                response: error.response
            });
            
            let errorMessage = 'Failed to create class. Please try again.';
            if (error.code === 400) {
                errorMessage = 'Invalid class data. Please check all fields.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to create classes.';
            } else if (error.code === 404) {
                errorMessage = 'Database or collection not found. Please check your setup.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Get all classes with optional filtering
     * @param {Object} [filters] - Optional filters
     * @param {string} [filters.date] - Filter by specific date (YYYY-MM-DD)
     * @param {string} [filters.sport] - Filter by sport
     * @param {number} [filters.limit] - Limit number of results
     * @returns {Promise<Object>} Classes array or error
     */
    async getClasses(filters = {}) {
        try {
            const queries = [];
            
            // Add date filter if provided
            if (filters.date) {
                queries.push(Query.equal('date', filters.date));
            }
            
            // Add sport filter if provided
            if (filters.sport) {
                queries.push(Query.equal('sport', filters.sport));
            }
            
            // Add limit if provided
            if (filters.limit) {
                queries.push(Query.limit(filters.limit));
            }
            
            // Order by date and time
            queries.push(Query.orderAsc('date'));
            queries.push(Query.orderAsc('time'));

            const result = await databases.listDocuments(
                DATABASE_ID,
                CLASSES_COLLECTION_ID,
                queries
            );

            return { success: true, data: result.documents };
        } catch (error) {
            console.error('Error fetching classes:', error);
            
            let errorMessage = 'Failed to load classes. Please try again.';
            if (error.code === 401) {
                errorMessage = 'You are not authorized to view classes.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Get classes for a specific date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Classes array or error
     */
    async getClassesInDateRange(startDate, endDate) {
        try {
            const queries = [
                Query.greaterThanEqual('date', startDate),
                Query.lessThanEqual('date', endDate),
                Query.orderAsc('date'),
                Query.orderAsc('time'),
                Query.limit(100) // Reasonable limit for monthly view
            ];

            const result = await databases.listDocuments(
                DATABASE_ID,
                CLASSES_COLLECTION_ID,
                queries
            );

            return { success: true, data: result.documents };
        } catch (error) {
            console.error('Error fetching classes in date range:', error);
            return { success: false, error: error.message || 'Failed to load classes for date range' };
        }
    }

    /**
     * Get today's classes
     * @returns {Promise<Object>} Today's classes or error
     */
    async getTodaysClasses() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        return this.getClasses({ date: today });
    }

    /**
     * Get upcoming classes (next N days)
     * @param {number} [days=7] - Number of days to look ahead
     * @returns {Promise<Object>} Upcoming classes or error
     */
    async getUpcomingClasses(days = 7) {
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        const endDateString = endDate.toISOString().split('T')[0];
        
        return this.getClassesInDateRange(today, endDateString);
    }

    /**
     * Update a class
     * @param {string} classId - Class document ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated class or error
     */
    async updateClass(classId, updateData) {
        try {
            const updatedData = {
                ...updateData,
                updated_at: new Date().toISOString(), // Changed to snake_case
            };

            const result = await databases.updateDocument(
                DATABASE_ID,
                CLASSES_COLLECTION_ID,
                classId,
                updatedData
            );

            console.log('Class updated successfully:', classId);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error updating class:', error);
            
            let errorMessage = 'Failed to update class. Please try again.';
            if (error.code === 404) {
                errorMessage = 'Class not found.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to update this class.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Delete a class
     * @param {string} classId - Class document ID
     * @returns {Promise<Object>} Success status or error
     */
    async deleteClass(classId) {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                CLASSES_COLLECTION_ID,
                classId
            );

            console.log('Class deleted successfully:', classId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting class:', error);
            
            let errorMessage = 'Failed to delete class. Please try again.';
            if (error.code === 404) {
                errorMessage = 'Class not found.';
            } else if (error.code === 401) {
                errorMessage = 'You are not authorized to delete this class.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Subscribe to real-time class updates
     * @param {Function} callback - Callback function to handle updates
     * @returns {Function} Unsubscribe function
     */
    subscribeToClasses(callback) {
        try {
            const channel = `databases.${DATABASE_ID}.collections.${CLASSES_COLLECTION_ID}.documents`;
            
            const unsubscribe = databases.client.subscribe(channel, (response) => {
                console.log('Real-time class update:', response);
                
                if (callback && typeof callback === 'function') {
                    callback({
                        type: response.events[0]?.split('.').pop() || 'update',
                        document: response.payload,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            console.log('Subscribed to class updates');
            return unsubscribe;
        } catch (error) {
            console.error('Error subscribing to class updates:', error);
            return () => {}; // Return empty function if subscription fails
        }
    }

    /**
     * Get class statistics
     * @returns {Promise<Object>} Class statistics or error
     */
    async getClassStats() {
        try {
            const allClassesResult = await this.getClasses({ limit: 1000 });
            
            if (!allClassesResult.success) {
                return allClassesResult;
            }

            const classes = allClassesResult.data;
            const today = new Date().toISOString().split('T')[0];
            
            const stats = {
                totalClasses: classes.length,
                todaysClasses: classes.filter(cls => cls.date === today).length,
                sportsCount: {},
                upcomingClasses: classes.filter(cls => cls.date >= today).length,
            };

            // Count classes by sport
            classes.forEach(cls => {
                stats.sportsCount[cls.sport] = (stats.sportsCount[cls.sport] || 0) + 1;
            });

            return { success: true, data: stats };
        } catch (error) {
            console.error('Error getting class stats:', error);
            return { success: false, error: error.message || 'Failed to load class statistics' };
        }
    }
}

// Export singleton instance
export const classService = new ClassService();

// Helper functions for date formatting
export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const formatTime = (time) => {
    if (!time) return '';
    
    // If it's a descriptive batch name (contains "batch"), return as-is
    if (time.includes('batch')) {
        return time;
    }
    
    // Otherwise, format as traditional time (for backward compatibility)
    if (time.includes(':') && time.split(':').length === 2) {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        if (!isNaN(hour)) {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        }
    }
    
    // Fallback: return the time as-is
    return time;
};

export const formatDateTime = (date, time) => {
    return `${formatDate(date)} at ${formatTime(time)}`;
};

// Helper to get date in YYYY-MM-DD format
export const getDateString = (date = new Date()) => {
    return date.toISOString().split('T')[0];
};

// Helper to get time in HH:MM format
export const getTimeString = (date = new Date()) => {
    return date.toTimeString().split(' ')[0].substring(0, 5);
};

// Helper function to get color for each sport
export const getSportColor = (sport) => {
    const colors = {
        'Football': '#ff6b35',
        'Basketball': '#f7931e',
        'Tennis': '#8bc34a',
        'Swimming': '#03a9f4',
        'Volleyball': '#9c27b0',
        'Baseball': '#795548',
        'Soccer': '#4caf50',
        'Golf': '#ff9800',
        'Track & Field': '#e91e63',
        'Wrestling': '#3f51b5',
        'Gymnastics': '#9e9e9e',
        'Other': '#607d8b'
    };
    return colors[sport] || '#6b7280'; // Default gray color
};

// Alias for formatTime to match the import in AttendanceScreen
export const formatClassTime = formatTime; 
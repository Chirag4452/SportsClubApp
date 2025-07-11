import { databases, DATABASE_ID, ID, Query } from '../config/appwrite';

// Collection ID for classes - you'll need to create this collection in Appwrite
export const CLASSES_COLLECTION_ID = 'classes';

// Default sport for this single-sport application
export const DEFAULT_SPORT = 'Football';

// Sports options for dropdown (kept for backward compatibility)
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
            console.log('🔧 ClassService: Creating class:', classData.title);

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
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.date] - Filter by date (YYYY-MM-DD)
     * @param {number} [filters.limit] - Limit number of results
     * @returns {Promise<Object>} Classes array or error
     */
    async getClasses(filters = {}) {
        try {
            console.log('🔍 ClassService: Getting classes with filters:', filters);
            
            const queries = [];
            
            // Add date filter if provided
            if (filters.date) {
                queries.push(Query.equal('date', filters.date));
            }
            
            // Add limit if provided
            if (filters.limit) {
                queries.push(Query.limit(filters.limit));
            }
            
            // Order by date (newest first)
            queries.push(Query.orderDesc('date'));

            const result = await databases.listDocuments(
                DATABASE_ID,
                CLASSES_COLLECTION_ID,
                queries
            );

            console.log(`✅ ClassService: Found ${result.documents.length} classes`);
            return { success: true, data: result.documents };
        } catch (error) {
            console.error('❌ ClassService: Error fetching classes:', error);
            
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
                Query.limit(500) // Increased from 100 to handle bulk operations
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
                upcomingClasses: classes.filter(cls => cls.date >= today).length,
            };

            return { success: true, data: stats };
        } catch (error) {
            console.error('Error getting class stats:', error);
            return { success: false, error: error.message || 'Failed to load class statistics' };
        }
    }

    /**
     * Generate a list of dates between start and end date
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {number[]} selectedDays - Array of day numbers (0=Sunday, 1=Monday, etc.)
     * @param {string[]} skipDates - Array of dates to skip (YYYY-MM-DD)
     * @returns {string[]} Array of dates
     */
    generateDateRange(startDate, endDate, selectedDays = [1,2,3,4,5], skipDates = []) {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const skipSet = new Set(skipDates);
        
        // Iterate through each day from start to end
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateString = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            
            // Include if day is selected and not in skip list
            if (selectedDays.includes(dayOfWeek) && !skipSet.has(dateString)) {
                dates.push(dateString);
            }
        }
        
        return dates;
    }

    /**
     * Preview bulk class creation without actually creating them
     * @param {Object} bulkData - Bulk scheduling parameters
     * @param {string} bulkData.startDate - Start date (YYYY-MM-DD)
     * @param {string} bulkData.endDate - End date (YYYY-MM-DD)
     * @param {number[]} bulkData.selectedDays - Days of week (0=Sunday, 1=Monday, etc.)
     * @param {string[]} bulkData.selectedTimes - Array of batch times
     * @param {string[]} bulkData.skipDates - Dates to skip
     * @param {string} bulkData.instructor - Instructor name
     * @param {string} bulkData.instructorId - Instructor ID
     * @param {string} bulkData.titleTemplate - Title template (e.g., "Football Training")
     * @returns {Promise<Object>} Preview data with classes and conflicts
     */
    async previewBulkClasses(bulkData) {
        try {
            const {
                startDate,
                endDate,
                selectedDays,
                selectedTimes,
                skipDates = [],
                instructor,
                instructorId,
                titleTemplate = "Football Training"
            } = bulkData;

            // Generate all dates
            const dates = this.generateDateRange(startDate, endDate, selectedDays, skipDates);
            
            // Create preview classes
            const previewClasses = [];
            const totalClasses = dates.length * selectedTimes.length;
            
            dates.forEach(date => {
                selectedTimes.forEach(time => {
                    previewClasses.push({
                        title: titleTemplate,
                        sport: DEFAULT_SPORT,
                        date,
                        time,
                        instructor,
                        instructor_id: instructorId,
                        description: `Auto-generated class for ${date}`,
                        max_participants: 20
                    });
                });
            });

            // Check for conflicts with existing classes
            const existingClasses = await this.getClassesInDateRange(startDate, endDate);
            const conflicts = [];
            
            if (existingClasses.success) {
                previewClasses.forEach(previewClass => {
                    const conflict = existingClasses.data.find(existing => 
                        existing.date === previewClass.date && 
                        existing.time === previewClass.time
                    );
                    if (conflict) {
                        conflicts.push({
                            date: previewClass.date,
                            time: previewClass.time,
                            existingClass: conflict
                        });
                    }
                });
            }

            return {
                success: true,
                data: {
                    previewClasses,
                    totalClasses,
                    conflicts,
                    dateRange: { startDate, endDate },
                    selectedDays,
                    selectedTimes
                }
            };
        } catch (error) {
            console.error('Error previewing bulk classes:', error);
            return { success: false, error: error.message || 'Failed to preview classes' };
        }
    }

    /**
     * Create multiple classes in bulk
     * @param {Object} bulkData - Bulk scheduling parameters
     * @param {string} bulkData.startDate - Start date (YYYY-MM-DD)
     * @param {string} bulkData.endDate - End date (YYYY-MM-DD)
     * @param {number[]} bulkData.selectedDays - Days of week (0=Sunday, 1=Monday, etc.)
     * @param {string[]} bulkData.selectedTimes - Array of batch times
     * @param {string[]} bulkData.skipDates - Dates to skip
     * @param {string} bulkData.instructor - Instructor name
     * @param {string} bulkData.instructorId - Instructor ID
     * @param {string} bulkData.titleTemplate - Title template
     * @param {boolean} bulkData.skipConflicts - Whether to skip conflicting classes
     * @returns {Promise<Object>} Bulk creation result
     */
    async createBulkClasses(bulkData) {
        try {
            const {
                startDate,
                endDate,
                selectedDays,
                selectedTimes,
                skipDates = [],
                instructor,
                instructorId,
                titleTemplate = "Football Training",
                skipConflicts = true
            } = bulkData;

            console.log('🔧 Starting bulk class creation...');
            
            // First, get preview to check for conflicts
            const preview = await this.previewBulkClasses(bulkData);
            if (!preview.success) {
                return preview;
            }

            const { previewClasses, conflicts } = preview.data;
            let classesToCreate = previewClasses;

            // Filter out conflicts if requested
            if (skipConflicts && conflicts.length > 0) {
                const conflictSet = new Set(
                    conflicts.map(c => `${c.date}-${c.time}`)
                );
                classesToCreate = previewClasses.filter(
                    cls => !conflictSet.has(`${cls.date}-${cls.time}`)
                );
            }
            
            // Limit bulk operations to prevent overwhelming the system
            const MAX_BULK_SIZE = 100;
            if (classesToCreate.length > MAX_BULK_SIZE) {
                return { 
                    success: false, 
                    error: `Bulk operation too large. Maximum ${MAX_BULK_SIZE} classes per batch. You requested ${classesToCreate.length} classes. Please use a smaller date range or fewer batch times.` 
                };
            }

            const results = {
                created: [],
                skipped: [],
                errors: []
            };

            console.log(`📝 Creating ${classesToCreate.length} classes...`);

            // Create classes one by one with rate limiting protection
            for (let i = 0; i < classesToCreate.length; i++) {
                const classData = classesToCreate[i];
                
                try {
                    const result = await this.createClass({
                        ...classData,
                        instructorId: classData.instructor_id, // Map snake_case to camelCase for createClass compatibility
                        maxParticipants: classData.max_participants
                    });
                    
                    if (result.success) {
                        results.created.push({
                            ...result.data,
                            date: classData.date,
                            time: classData.time
                        });
                    } else {
                        results.errors.push({
                            date: classData.date,
                            time: classData.time,
                            error: result.error
                        });
                    }
                    
                    // Add small delay to prevent rate limiting (every 10 operations)
                    if (i > 0 && (i + 1) % 10 === 0) {
                        console.log(`⏳ Rate limiting pause after ${i + 1} operations...`);
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms pause
                    }
                    
                } catch (error) {
                    results.errors.push({
                        date: classData.date,
                        time: classData.time,
                        error: error.message
                    });
                }
            }

            // Add skipped conflicts to results
            if (skipConflicts) {
                results.skipped = conflicts.map(c => ({
                    date: c.date,
                    time: c.time,
                    reason: 'Conflict with existing class'
                }));
            }

            console.log(`✅ Bulk creation completed:`, {
                created: results.created.length,
                skipped: results.skipped.length,
                errors: results.errors.length
            });

            return {
                success: true,
                data: results
            };
        } catch (error) {
            console.error('❌ Error in bulk class creation:', error);
            return { success: false, error: error.message || 'Failed to create bulk classes' };
        }
    }

    /**
     * Delete multiple classes by date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {string[]} selectedTimes - Optional: only delete classes at these times
     * @returns {Promise<Object>} Deletion result
     */
    async deleteBulkClasses(startDate, endDate, selectedTimes = []) {
        try {
            // Get classes in the date range
            const classesResult = await this.getClassesInDateRange(startDate, endDate);
            if (!classesResult.success) {
                return classesResult;
            }

            let classesToDelete = classesResult.data;

            // Filter by times if specified
            if (selectedTimes.length > 0) {
                classesToDelete = classesToDelete.filter(cls => 
                    selectedTimes.includes(cls.time)
                );
            }

            const results = {
                deleted: [],
                errors: []
            };

            console.log(`🗑️ Deleting ${classesToDelete.length} classes...`);

            // Delete classes one by one
            for (const classItem of classesToDelete) {
                try {
                    const result = await this.deleteClass(classItem.$id);
                    if (result.success) {
                        results.deleted.push({
                            id: classItem.$id,
                            title: classItem.title,
                            date: classItem.date,
                            time: classItem.time
                        });
                    } else {
                        results.errors.push({
                            id: classItem.$id,
                            date: classItem.date,
                            time: classItem.time,
                            error: result.error
                        });
                    }
                } catch (error) {
                    results.errors.push({
                        id: classItem.$id,
                        date: classItem.date,
                        time: classItem.time,
                        error: error.message
                    });
                }
            }

            console.log(`✅ Bulk deletion completed:`, {
                deleted: results.deleted.length,
                errors: results.errors.length
            });

            return {
                success: true,
                data: results
            };
        } catch (error) {
            console.error('❌ Error in bulk class deletion:', error);
            return { success: false, error: error.message || 'Failed to delete bulk classes' };
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
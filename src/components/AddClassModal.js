import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
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
// Conditional import for DateTimePicker with fallback
let DateTimePicker;
try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
    console.log('DateTimePicker not available, using fallback');
    DateTimePicker = null;
}
// Custom dropdown component since we removed the picker package
import { useAuth } from '../context/AuthContext';
import { classService, SPORTS_OPTIONS, getDateString, getTimeString } from '../services/classService';

const AddClassModal = ({ visible, onClose, onClassAdded }) => {
    const { user } = useAuth();
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        sport: SPORTS_OPTIONS[0],
        date: getDateString(),
        time: '09:00',
        description: '',
        maxParticipants: '20',
    });
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showSportDropdown, setShowSportDropdown] = useState(false);

    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (visible) {
            resetForm();
        }
    }, [visible]);

    const resetForm = () => {
        setFormData({
            title: '',
            sport: SPORTS_OPTIONS[0],
            date: getDateString(),
            time: '09:00',
            description: '',
            maxParticipants: '20',
        });
        setErrors({});
        setIsLoading(false);
    };

    // Handle form field changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear field error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Date picker handlers
    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        
        if (selectedDate) {
            const dateString = getDateString(selectedDate);
            handleInputChange('date', dateString);
        }
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        
        if (selectedTime) {
            const timeString = getTimeString(selectedTime);
            handleInputChange('time', timeString);
        }
    };

    // Fallback handlers for text input
    const handleDateTextChange = (text) => {
        // Simple date validation (YYYY-MM-DD format)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(text) || text === '') {
            handleInputChange('date', text);
        }
    };

    const handleTimeTextChange = (text) => {
        // Simple time validation (HH:MM format)
        const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
        if (timeRegex.test(text) || text === '') {
            handleInputChange('time', text);
        }
    };

    // Sport selection handler
    const handleSportSelect = (sport) => {
        handleInputChange('sport', sport);
        setShowSportDropdown(false);
    };

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        // Title validation
        if (!formData.title.trim()) {
            newErrors.title = 'Class title is required';
        } else if (formData.title.trim().length < 3) {
            newErrors.title = 'Title must be at least 3 characters';
        }

        // Date validation
        if (!formData.date) {
            newErrors.date = 'Date is required';
        } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(formData.date)) {
                newErrors.date = 'Date must be in YYYY-MM-DD format';
            } else {
                const selectedDate = new Date(formData.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (isNaN(selectedDate.getTime())) {
                    newErrors.date = 'Invalid date';
                } else if (selectedDate < today) {
                    newErrors.date = 'Class date cannot be in the past';
                }
            }
        }

        // Time validation
        if (!formData.time) {
            newErrors.time = 'Time is required';
        } else {
            const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
            if (!timeRegex.test(formData.time)) {
                newErrors.time = 'Time must be in HH:MM format (24-hour)';
            }
        }

        // Max participants validation
        const maxParticipants = parseInt(formData.maxParticipants, 10);
        if (isNaN(maxParticipants) || maxParticipants < 1) {
            newErrors.maxParticipants = 'Must be a valid number greater than 0';
        } else if (maxParticipants > 100) {
            newErrors.maxParticipants = 'Maximum participants cannot exceed 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const classData = {
                title: formData.title.trim(),
                sport: formData.sport,
                date: formData.date,
                time: formData.time,
                description: formData.description.trim(),
                maxParticipants: parseInt(formData.maxParticipants, 10),
                instructor: user?.name || user?.email || 'Unknown',
                instructorId: user?.$id || '',
            };

            console.log('📝 Attempting to create class with data:', classData);
            const result = await classService.createClass(classData);
            console.log('✅ Class creation result:', result);

            if (result.success) {
                Alert.alert(
                    'Success',
                    'Class created successfully!',
                    [{ text: 'OK', onPress: () => {
                        onClassAdded?.(result.data);
                        onClose();
                    }}]
                );
            } else {
                console.error('❌ Class creation failed:', result.error);
                Alert.alert('Error', result.error);
            }
        } catch (error) {
            console.error('💥 Unexpected error creating class:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Format date for display
    const formatDisplayDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format time for display
    const formatDisplayTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

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
                    <TouchableOpacity onPress={onClose} disabled={isLoading}>
                        <Text style={styles.cancelButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Add New Class</Text>
                    <TouchableOpacity 
                        onPress={handleSubmit} 
                        disabled={isLoading}
                        style={[styles.saveButton, isLoading && styles.disabledButton]}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Class Title */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Class Title *</Text>
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            value={formData.title}
                            onChangeText={(value) => handleInputChange('title', value)}
                            placeholder="e.g., Beginner Soccer Training"
                            placeholderTextColor="#9ca3af"
                            editable={!isLoading}
                            maxLength={50}
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* Sport Selection */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Sport *</Text>
                        <TouchableOpacity
                            style={[styles.dropdownButton, errors.sport && styles.inputError]}
                            onPress={() => setShowSportDropdown(true)}
                            disabled={isLoading}
                        >
                            <Text style={styles.dropdownText}>{formData.sport}</Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                        {errors.sport && <Text style={styles.errorText}>{errors.sport}</Text>}
                    </View>

                    {/* Date Selection */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Date *</Text>
                        {DateTimePicker ? (
                            <TouchableOpacity
                                style={[styles.dateTimeButton, errors.date && styles.inputError]}
                                onPress={() => setShowDatePicker(true)}
                                disabled={isLoading}
                            >
                                <Text style={styles.dateTimeText}>
                                    {formatDisplayDate(formData.date)}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TextInput
                                style={[styles.input, errors.date && styles.inputError]}
                                value={formData.date}
                                onChangeText={handleDateTextChange}
                                placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
                                placeholderTextColor="#9ca3af"
                                editable={!isLoading}
                                keyboardType="numeric"
                                maxLength={10}
                            />
                        )}
                        {!DateTimePicker && (
                            <Text style={styles.helperText}>Enter date in YYYY-MM-DD format</Text>
                        )}
                        {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
                    </View>

                    {/* Time Selection */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Time *</Text>
                        {DateTimePicker ? (
                            <TouchableOpacity
                                style={[styles.dateTimeButton, errors.time && styles.inputError]}
                                onPress={() => setShowTimePicker(true)}
                                disabled={isLoading}
                            >
                                <Text style={styles.dateTimeText}>
                                    {formatDisplayTime(formData.time)}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TextInput
                                style={[styles.input, errors.time && styles.inputError]}
                                value={formData.time}
                                onChangeText={handleTimeTextChange}
                                placeholder="HH:MM (e.g., 14:30)"
                                placeholderTextColor="#9ca3af"
                                editable={!isLoading}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        )}
                        {!DateTimePicker && (
                            <Text style={styles.helperText}>Enter time in 24-hour format (HH:MM)</Text>
                        )}
                        {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
                    </View>

                    {/* Max Participants */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Maximum Participants</Text>
                        <TextInput
                            style={[styles.input, errors.maxParticipants && styles.inputError]}
                            value={formData.maxParticipants}
                            onChangeText={(value) => handleInputChange('maxParticipants', value)}
                            placeholder="20"
                            placeholderTextColor="#9ca3af"
                            keyboardType="numeric"
                            editable={!isLoading}
                            maxLength={3}
                        />
                        {errors.maxParticipants && <Text style={styles.errorText}>{errors.maxParticipants}</Text>}
                    </View>

                    {/* Description */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(value) => handleInputChange('description', value)}
                            placeholder="Add class details, requirements, or special instructions..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            editable={!isLoading}
                            maxLength={200}
                        />
                    </View>

                    {/* Instructor Info */}
                    <View style={styles.instructorContainer}>
                        <Text style={styles.instructorLabel}>Instructor</Text>
                        <Text style={styles.instructorName}>
                            {user?.name || user?.email || 'Unknown'}
                        </Text>
                    </View>
                </ScrollView>

                {/* Date/Time Pickers - Only show if DateTimePicker is available */}
                {DateTimePicker && showDatePicker && (
                    <DateTimePicker
                        value={new Date(formData.date)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                    />
                )}

                {DateTimePicker && showTimePicker && (
                    <DateTimePicker
                        value={new Date(`2000-01-01T${formData.time}:00`)}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleTimeChange}
                    />
                )}

                {/* Sport Selection Modal */}
                <Modal
                    visible={showSportDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowSportDropdown(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowSportDropdown(false)}
                    >
                        <View style={styles.dropdownModal}>
                            <View style={styles.dropdownHeader}>
                                <Text style={styles.dropdownTitle}>Select Sport</Text>
                                <TouchableOpacity onPress={() => setShowSportDropdown(false)}>
                                    <Ionicons name="close" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={SPORTS_OPTIONS}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.sportOption,
                                            formData.sport === item && styles.selectedSportOption
                                        ]}
                                        onPress={() => handleSportSelect(item)}
                                    >
                                        <Text style={[
                                            styles.sportOptionText,
                                            formData.sport === item && styles.selectedSportText
                                        ]}>
                                            {item}
                                        </Text>
                                        {formData.sport === item && (
                                            <Ionicons name="checkmark" size={20} color="#3b82f6" />
                                        )}
                                    </TouchableOpacity>
                                )}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>
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
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
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
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
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
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    dropdownButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 16,
        color: '#1f2937',
        flex: 1,
    },
    dateTimeButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        justifyContent: 'center',
    },
    dateTimeText: {
        fontSize: 16,
        color: '#1f2937',
    },
    instructorContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    instructorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 4,
    },
    instructorName: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    helperText: {
        color: '#6b7280',
        fontSize: 11,
        marginTop: 4,
        fontStyle: 'italic',
        lineHeight: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    dropdownModal: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        maxHeight: '70%',
        width: '100%',
        maxWidth: 400,
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    dropdownTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    sportOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    selectedSportOption: {
        backgroundColor: '#dbeafe',
    },
    sportOptionText: {
        fontSize: 16,
        color: '#1f2937',
        flex: 1,
    },
    selectedSportText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
});

export default AddClassModal; 
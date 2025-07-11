import React, { useState, useEffect } from 'react';
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
    FlatList,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { classService, TIME_OPTIONS, getDateString, formatDate } from '../services/classService';

const DAYS_OF_WEEK = [
    { id: 0, name: 'Sunday', short: 'Sun' },
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
];

const BulkClassSchedulingModal = ({ visible, onClose, onClassesCreated }) => {
    const { user } = useAuth();
    
    // Form state
    const [formData, setFormData] = useState({
        startDate: getDateString(),
        endDate: getDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
        selectedDays: [1, 2, 3, 4, 5], // Monday to Friday by default
        selectedTimes: [TIME_OPTIONS[0]], // Morning batch by default
        titleTemplate: 'Football Training',
        skipDates: [],
        skipConflicts: true,
    });
    
    // UI state
    const [currentStep, setCurrentStep] = useState(1); // 1: Setup, 2: Preview, 3: Creating
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [errors, setErrors] = useState({});
    const [previewData, setPreviewData] = useState(null);
    const [skipDateInput, setSkipDateInput] = useState('');

    // Reset form when modal opens/closes
    useEffect(() => {
        if (visible) {
            resetForm();
        }
    }, [visible]);

    const resetForm = () => {
        setFormData({
            startDate: getDateString(),
            endDate: getDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            selectedDays: [1, 2, 3, 4, 5],
            selectedTimes: [TIME_OPTIONS[0]],
            titleTemplate: 'Football Training',
            skipDates: [],
            skipConflicts: true,
        });
        setCurrentStep(1);
        setErrors({});
        setPreviewData(null);
        setSkipDateInput('');
        setIsLoading(false);
        setIsCreating(false);
    };

    // Handle form field changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear field error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Toggle day selection
    const toggleDay = (dayId) => {
        setFormData(prev => ({
            ...prev,
            selectedDays: prev.selectedDays.includes(dayId)
                ? prev.selectedDays.filter(id => id !== dayId)
                : [...prev.selectedDays, dayId]
        }));
    };

    // Toggle time selection
    const toggleTime = (time) => {
        setFormData(prev => ({
            ...prev,
            selectedTimes: prev.selectedTimes.includes(time)
                ? prev.selectedTimes.filter(t => t !== time)
                : [...prev.selectedTimes, time]
        }));
    };

    // Add skip date
    const addSkipDate = () => {
        if (!skipDateInput.trim()) return;
        
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(skipDateInput)) {
            Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
            return;
        }

        if (formData.skipDates.includes(skipDateInput)) {
            Alert.alert('Duplicate Date', 'This date is already in the skip list');
            return;
        }

        setFormData(prev => ({
            ...prev,
            skipDates: [...prev.skipDates, skipDateInput]
        }));
        setSkipDateInput('');
    };

    // Remove skip date
    const removeSkipDate = (dateToRemove) => {
        setFormData(prev => ({
            ...prev,
            skipDates: prev.skipDates.filter(date => date !== dateToRemove)
        }));
    };

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        // Date validation
        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }
        if (!formData.endDate) {
            newErrors.endDate = 'End date is required';
        }
        if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
            newErrors.endDate = 'End date must be after start date';
        }

        // Day selection validation
        if (formData.selectedDays.length === 0) {
            newErrors.selectedDays = 'Please select at least one day';
        }

        // Time selection validation
        if (formData.selectedTimes.length === 0) {
            newErrors.selectedTimes = 'Please select at least one batch time';
        }

        // Title validation
        if (!formData.titleTemplate.trim()) {
            newErrors.titleTemplate = 'Class title template is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Generate preview
    const generatePreview = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setCurrentStep(2);

        try {
            const bulkData = {
                ...formData,
                instructor: user?.name || user?.email || 'Unknown',
                instructorId: user?.$id || '',
            };

            const result = await classService.previewBulkClasses(bulkData);
            
            if (result.success) {
                setPreviewData(result.data);
            } else {
                Alert.alert('Preview Error', result.error);
                setCurrentStep(1);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to generate preview');
            setCurrentStep(1);
        } finally {
            setIsLoading(false);
        }
    };

    // Create bulk classes
    const createBulkClasses = async () => {
        setIsCreating(true);
        setCurrentStep(3);

        try {
            const bulkData = {
                ...formData,
                instructor: user?.name || user?.email || 'Unknown',
                instructorId: user?.$id || '',
            };

            const result = await classService.createBulkClasses(bulkData);
            
            if (result.success) {
                const { created, skipped, errors: creationErrors } = result.data;
                
                let message = `Successfully created ${created.length} classes!`;
                if (skipped.length > 0) {
                    message += `\n${skipped.length} classes were skipped due to conflicts.`;
                }
                if (creationErrors.length > 0) {
                    message += `\n${creationErrors.length} classes failed to create.`;
                }

                Alert.alert('Bulk Creation Complete', message);
                
                if (onClassesCreated) {
                    onClassesCreated(result.data);
                }
                
                onClose();
            } else {
                Alert.alert('Creation Error', result.error);
                setCurrentStep(2);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create bulk classes');
            setCurrentStep(2);
        } finally {
            setIsCreating(false);
        }
    };

    // Render step 1: Setup
    const renderSetupStep = () => (
        <ScrollView style={styles.stepContent}>
            {/* Date Range */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 Date Range</Text>
                
                <View style={styles.dateRow}>
                    <View style={styles.dateInput}>
                        <Text style={styles.label}>Start Date</Text>
                        <TextInput
                            style={[styles.input, errors.startDate && styles.inputError]}
                            value={formData.startDate}
                            onChangeText={(value) => handleInputChange('startDate', value)}
                            placeholder="YYYY-MM-DD"
                            maxLength={10}
                        />
                        {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
                    </View>
                    
                    <View style={styles.dateInput}>
                        <Text style={styles.label}>End Date</Text>
                        <TextInput
                            style={[styles.input, errors.endDate && styles.inputError]}
                            value={formData.endDate}
                            onChangeText={(value) => handleInputChange('endDate', value)}
                            placeholder="YYYY-MM-DD"
                            maxLength={10}
                        />
                        {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
                    </View>
                </View>
            </View>

            {/* Days of Week */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📆 Days of Week</Text>
                {errors.selectedDays && <Text style={styles.errorText}>{errors.selectedDays}</Text>}
                
                <View style={styles.daysGrid}>
                    {DAYS_OF_WEEK.map(day => (
                        <TouchableOpacity
                            key={day.id}
                            style={[
                                styles.dayButton,
                                formData.selectedDays.includes(day.id) && styles.dayButtonSelected
                            ]}
                            onPress={() => toggleDay(day.id)}
                        >
                            <Text style={[
                                styles.dayButtonText,
                                formData.selectedDays.includes(day.id) && styles.dayButtonTextSelected
                            ]}>
                                {day.short}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Batch Times */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏰ Batch Times</Text>
                {errors.selectedTimes && <Text style={styles.errorText}>{errors.selectedTimes}</Text>}
                
                {TIME_OPTIONS.map(time => (
                    <TouchableOpacity
                        key={time}
                        style={[
                            styles.timeOption,
                            formData.selectedTimes.includes(time) && styles.timeOptionSelected
                        ]}
                        onPress={() => toggleTime(time)}
                    >
                        <Text style={[
                            styles.timeOptionText,
                            formData.selectedTimes.includes(time) && styles.timeOptionTextSelected
                        ]}>
                            {time}
                        </Text>
                        {formData.selectedTimes.includes(time) && (
                            <Ionicons name="checkmark" size={20} color="#3b82f6" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Class Title Template */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Class Title Template</Text>
                <TextInput
                    style={[styles.input, errors.titleTemplate && styles.inputError]}
                    value={formData.titleTemplate}
                    onChangeText={(value) => handleInputChange('titleTemplate', value)}
                    placeholder="e.g., Football Training"
                    maxLength={50}
                />
                {errors.titleTemplate && <Text style={styles.errorText}>{errors.titleTemplate}</Text>}
            </View>

            {/* Skip Dates */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚫 Skip Dates (Optional)</Text>
                <Text style={styles.sectionSubtitle}>Add dates you want to skip (holidays, breaks, etc.)</Text>
                
                <View style={styles.skipDateInput}>
                    <TextInput
                        style={styles.input}
                        value={skipDateInput}
                        onChangeText={setSkipDateInput}
                        placeholder="YYYY-MM-DD"
                        maxLength={10}
                    />
                    <TouchableOpacity style={styles.addButton} onPress={addSkipDate}>
                        <Ionicons name="add" size={20} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {formData.skipDates.length > 0 && (
                    <View style={styles.skipDatesList}>
                        {formData.skipDates.map(date => (
                            <View key={date} style={styles.skipDateItem}>
                                <Text style={styles.skipDateText}>{formatDate(date)}</Text>
                                <TouchableOpacity onPress={() => removeSkipDate(date)}>
                                    <Ionicons name="close" size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Options */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚙️ Options</Text>
                
                <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Skip conflicting classes</Text>
                    <Switch
                        value={formData.skipConflicts}
                        onValueChange={(value) => handleInputChange('skipConflicts', value)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={formData.skipConflicts ? '#3b82f6' : '#f4f3f4'}
                    />
                </View>
                <Text style={styles.optionDescription}>
                    Automatically skip dates/times that already have classes scheduled
                </Text>
            </View>
        </ScrollView>
    );

    // Render step 2: Preview
    const renderPreviewStep = () => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Generating preview...</Text>
                </View>
            );
        }

        if (!previewData) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Failed to generate preview</Text>
                </View>
            );
        }

        const { totalClasses, conflicts, previewClasses } = previewData;

        return (
            <ScrollView style={styles.stepContent}>
                {/* Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Summary</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryNumber}>{totalClasses}</Text>
                            <Text style={styles.summaryLabel}>Total Classes</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryNumber, { color: '#ef4444' }]}>{conflicts.length}</Text>
                            <Text style={styles.summaryLabel}>Conflicts</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryNumber, { color: '#10b981' }]}>
                                {formData.skipConflicts ? totalClasses - conflicts.length : totalClasses}
                            </Text>
                            <Text style={styles.summaryLabel}>Will Create</Text>
                        </View>
                    </View>
                </View>

                {/* Conflicts */}
                {conflicts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>⚠️ Conflicts Found</Text>
                        <Text style={styles.sectionSubtitle}>
                            These dates/times already have classes scheduled:
                        </Text>
                        
                        {conflicts.slice(0, 5).map((conflict, index) => (
                            <View key={index} style={styles.conflictItem}>
                                <Text style={styles.conflictText}>
                                    {formatDate(conflict.date)} at {conflict.time}
                                </Text>
                                <Text style={styles.conflictSubtext}>
                                    Existing: {conflict.existingClass.title}
                                </Text>
                            </View>
                        ))}
                        
                        {conflicts.length > 5 && (
                            <Text style={styles.moreConflictsText}>
                                ... and {conflicts.length - 5} more conflicts
                            </Text>
                        )}
                        
                        <Text style={styles.conflictNote}>
                            {formData.skipConflicts 
                                ? "These will be automatically skipped." 
                                : "Please enable 'Skip conflicting classes' or adjust your date range."
                            }
                        </Text>
                    </View>
                )}

                {/* First few classes preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👀 Preview (First 10 Classes)</Text>
                    
                    {previewClasses.slice(0, 10).map((cls, index) => (
                        <View key={index} style={styles.previewItem}>
                            <Text style={styles.previewTitle}>{cls.title}</Text>
                            <Text style={styles.previewDetails}>
                                {formatDate(cls.date)} • {cls.time}
                            </Text>
                        </View>
                    ))}
                    
                    {previewClasses.length > 10 && (
                        <Text style={styles.moreClassesText}>
                            ... and {previewClasses.length - 10} more classes
                        </Text>
                    )}
                </View>
            </ScrollView>
        );
    };

    // Render step 3: Creating
    const renderCreatingStep = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Creating classes...</Text>
            <Text style={styles.loadingSubtext}>This may take a few moments</Text>
        </View>
    );

    // Main render
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
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={onClose}
                        disabled={isCreating}
                    >
                        <Ionicons name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>
                    
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Bulk Schedule Classes</Text>
                        <Text style={styles.headerSubtitle}>
                            Step {currentStep} of 3
                        </Text>
                    </View>
                    
                    <View style={styles.headerRight} />
                </View>

                {/* Step Progress */}
                <View style={styles.progressContainer}>
                    {[1, 2, 3].map(step => (
                        <View
                            key={step}
                            style={[
                                styles.progressStep,
                                currentStep >= step && styles.progressStepActive
                            ]}
                        >
                            <Text style={[
                                styles.progressStepText,
                                currentStep >= step && styles.progressStepTextActive
                            ]}>
                                {step}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {currentStep === 1 && renderSetupStep()}
                    {currentStep === 2 && renderPreviewStep()}
                    {currentStep === 3 && renderCreatingStep()}
                </View>

                {/* Footer */}
                {currentStep !== 3 && (
                    <View style={styles.footer}>
                        {currentStep === 2 && (
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => setCurrentStep(1)}
                                disabled={isLoading}
                            >
                                <Text style={styles.secondaryButtonText}>Back</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                (isLoading || isCreating) && styles.disabledButton
                            ]}
                            onPress={currentStep === 1 ? generatePreview : createBulkClasses}
                            disabled={isLoading || isCreating}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    {currentStep === 1 ? 'Preview Classes' : 'Create Classes'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
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
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    closeButton: {
        padding: 8,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    headerRight: {
        width: 40,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    progressStep: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    progressStepActive: {
        backgroundColor: '#3b82f6',
    },
    progressStepText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    progressStepTextActive: {
        color: '#ffffff',
    },
    content: {
        flex: 1,
    },
    stepContent: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateInput: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#1f2937',
    },
    inputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    dayButtonSelected: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    dayButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
    },
    dayButtonTextSelected: {
        color: '#ffffff',
    },
    timeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
    },
    timeOptionSelected: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    timeOptionText: {
        fontSize: 16,
        color: '#1f2937',
    },
    timeOptionTextSelected: {
        color: '#3b82f6',
        fontWeight: '500',
    },
    skipDateInput: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    addButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipDatesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    skipDateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 8,
    },
    skipDateText: {
        fontSize: 12,
        color: '#dc2626',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    optionLabel: {
        fontSize: 16,
        color: '#1f2937',
    },
    optionDescription: {
        fontSize: 14,
        color: '#6b7280',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    summaryItem: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    summaryNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    conflictItem: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    conflictText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#dc2626',
    },
    conflictSubtext: {
        fontSize: 12,
        color: '#991b1b',
        marginTop: 2,
    },
    moreConflictsText: {
        fontSize: 14,
        color: '#dc2626',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    conflictNote: {
        fontSize: 14,
        color: '#6b7280',
        fontStyle: 'italic',
        marginTop: 12,
        textAlign: 'center',
    },
    previewItem: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
    },
    previewDetails: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    moreClassesText: {
        fontSize: 14,
        color: '#6b7280',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    primaryButton: {
        flex: 2,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    disabledButton: {
        opacity: 0.6,
    },
});

export default BulkClassSchedulingModal; 
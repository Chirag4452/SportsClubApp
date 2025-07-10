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
import { studentService, BATCH_TIME_OPTIONS } from '../services/studentService';
import { SPORTS_OPTIONS } from '../services/classService';

const AddStudentModal = ({ visible, onClose, onStudentAdded }) => {
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        age: '',
        sport: SPORTS_OPTIONS[0],
        batch_time: BATCH_TIME_OPTIONS[0],
        notes: '',
    });
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showSportDropdown, setShowSportDropdown] = useState(false);
    const [showBatchTimeDropdown, setShowBatchTimeDropdown] = useState(false);

    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (visible) {
            resetForm();
        }
    }, [visible]);

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            email: '',
            age: '',
            sport: SPORTS_OPTIONS[0],
            batch_time: BATCH_TIME_OPTIONS[0],
            notes: '',
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

    // Selection handlers
    const handleSportSelect = (sport) => {
        handleInputChange('sport', sport);
        setShowSportDropdown(false);
    };

    const handleBatchTimeSelect = (batchTime) => {
        handleInputChange('batch_time', batchTime);
        setShowBatchTimeDropdown(false);
    };

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Student name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        } else if (formData.name.trim().length > 50) {
            newErrors.name = 'Name must be less than 50 characters';
        }

        // Phone validation
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
            if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10) {
                newErrors.phone = 'Please enter a valid phone number (10+ digits)';
            }
        }

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email address is required';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                newErrors.email = 'Please enter a valid email address';
            }
        }

        // Age validation (stored as string in database)
        if (!formData.age.trim()) {
            newErrors.age = 'Age is required';
        } else {
            const age = parseInt(formData.age.trim(), 10);
            if (isNaN(age) || age < 1 || age > 120) {
                newErrors.age = 'Please enter a valid age (1-120)';
            }
        }

        // Sport validation
        if (!formData.sport) {
            newErrors.sport = 'Please select a sport';
        }

        // Batch time validation
        if (!formData.batch_time) {
            newErrors.batch_time = 'Please select a batch time';
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
            // Check for duplicate email first
            console.log('📧 Checking for duplicate email...');
            const duplicateCheck = await studentService.checkDuplicateEmail(formData.email);
            
            if (duplicateCheck.success && duplicateCheck.isDuplicate) {
                Alert.alert(
                    'Duplicate Email',
                    `A student with email "${formData.email}" already exists. Please use a different email address.`
                );
                setErrors({ email: 'Email already exists' });
                setIsLoading(false);
                return;
            }

            const studentData = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim(),
                age: formData.age.trim(),
                sport: formData.sport,
                batch_time: formData.batch_time,
                // notes: formData.notes.trim(), // Comment out if notes attribute doesn't exist
            };

            console.log('📝 Creating student with data:', studentData);
            const result = await studentService.createStudent(studentData);

            if (result.success) {
                Alert.alert(
                    'Success',
                    'Student added successfully!',
                    [{ text: 'OK', onPress: () => {
                        onStudentAdded?.(result.data);
                        onClose();
                    }}]
                );
            } else {
                Alert.alert('Error', result.error);
            }
        } catch (error) {
            console.error('Error creating student:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Format phone number as user types
    const handlePhoneChange = (text) => {
        // Remove all non-digits
        const cleaned = text.replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX for US numbers
        let formatted = cleaned;
        if (cleaned.length >= 6) {
            formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
        } else if (cleaned.length >= 3) {
            formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        }
        
        handleInputChange('phone', formatted);
    };

    // Render dropdown option
    const renderDropdownOption = ({ item, selectedValue, onSelect, isSelected }) => (
        <TouchableOpacity
            style={[
                styles.dropdownOption,
                isSelected && styles.selectedDropdownOption
            ]}
            onPress={() => onSelect(item)}
        >
            <Text style={[
                styles.dropdownOptionText,
                isSelected && styles.selectedDropdownText
            ]}>
                {item}
            </Text>
            {isSelected && (
                <Ionicons name="checkmark" size={20} color="#3b82f6" />
            )}
        </TouchableOpacity>
    );

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
                    <Text style={styles.title}>Add New Student</Text>
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
                    {/* Student Name */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Student Name *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(value) => handleInputChange('name', value)}
                            placeholder="e.g., John Doe"
                            placeholderTextColor="#9ca3af"
                            editable={!isLoading}
                            maxLength={50}
                            autoCapitalize="words"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Phone Number */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Phone Number *</Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            value={formData.phone}
                            onChangeText={handlePhoneChange}
                            placeholder="(123) 456-7890"
                            placeholderTextColor="#9ca3af"
                            editable={!isLoading}
                            keyboardType="phone-pad"
                            maxLength={17}
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    {/* Email Address */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address *</Text>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            value={formData.email}
                            onChangeText={(value) => handleInputChange('email', value)}
                            placeholder="john.doe@example.com"
                            placeholderTextColor="#9ca3af"
                            editable={!isLoading}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={100}
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    {/* Age */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Age *</Text>
                        <TextInput
                            style={[styles.input, errors.age && styles.inputError]}
                            value={formData.age}
                            onChangeText={(value) => handleInputChange('age', value)}
                            placeholder="e.g., 25"
                            placeholderTextColor="#9ca3af"
                            editable={!isLoading}
                            keyboardType="numeric"
                            maxLength={3}
                        />
                        {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
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

                    {/* Batch Time Selection */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Batch Time *</Text>
                        <TouchableOpacity
                            style={[styles.dropdownButton, errors.batch_time && styles.inputError]}
                            onPress={() => setShowBatchTimeDropdown(true)}
                            disabled={isLoading}
                        >
                            <Text style={styles.dropdownText}>{formData.batch_time}</Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                        {errors.batch_time && <Text style={styles.errorText}>{errors.batch_time}</Text>}
                    </View>

                    {/* Notes - Commented out since attribute might not exist in database */}
                    {/* 
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Notes (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.notes}
                            onChangeText={(value) => handleInputChange('notes', value)}
                            placeholder="Additional notes about the student (medical conditions, special requirements, etc.)"
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            editable={!isLoading}
                            maxLength={200}
                        />
                    </View>
                    */}
                </ScrollView>

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
                                renderItem={({ item }) => renderDropdownOption({
                                    item,
                                    selectedValue: formData.sport,
                                    onSelect: handleSportSelect,
                                    isSelected: formData.sport === item
                                })}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Batch Time Selection Modal */}
                <Modal
                    visible={showBatchTimeDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowBatchTimeDropdown(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowBatchTimeDropdown(false)}
                    >
                        <View style={styles.dropdownModal}>
                            <View style={styles.dropdownHeader}>
                                <Text style={styles.dropdownTitle}>Select Batch Time</Text>
                                <TouchableOpacity onPress={() => setShowBatchTimeDropdown(false)}>
                                    <Ionicons name="close" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={BATCH_TIME_OPTIONS}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => renderDropdownOption({
                                    item,
                                    selectedValue: formData.batch_time,
                                    onSelect: handleBatchTimeSelect,
                                    isSelected: formData.batch_time === item
                                })}
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
    errorText: {
        color: '#dc2626',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
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
    dropdownOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    selectedDropdownOption: {
        backgroundColor: '#dbeafe',
    },
    dropdownOptionText: {
        fontSize: 16,
        color: '#1f2937',
        flex: 1,
    },
    selectedDropdownText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
});

export default AddStudentModal; 
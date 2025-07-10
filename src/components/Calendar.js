import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Calendar = ({ classes = [], onDatePress, selectedDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get current month and year
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Month names
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Navigation functions
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Get calendar data
    const calendarData = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const startDate = new Date(firstDayOfMonth);
        
        // Get the first Sunday of the calendar view
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const days = [];
        const currentCalendarDate = new Date(startDate);

        // Generate 42 days (6 weeks) for the calendar grid
        for (let i = 0; i < 42; i++) {
            const dateString = currentCalendarDate.toISOString().split('T')[0];
            const isCurrentMonth = currentCalendarDate.getMonth() === currentMonth;
            const isToday = dateString === new Date().toISOString().split('T')[0];
            const isSelected = selectedDate === dateString;

            // Find classes for this date
            const dayClasses = classes.filter(cls => cls.date === dateString);

            days.push({
                date: new Date(currentCalendarDate),
                dateString,
                day: currentCalendarDate.getDate(),
                isCurrentMonth,
                isToday,
                isSelected,
                hasClasses: dayClasses.length > 0,
                classCount: dayClasses.length,
                classes: dayClasses,
            });

            currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
        }

        return days;
    }, [currentMonth, currentYear, classes, selectedDate]);

    // Handle date press
    const handleDatePress = (dayData) => {
        if (onDatePress) {
            onDatePress(dayData.dateString, dayData.classes);
        }
    };

    // Get class indicator color based on sport
    const getClassIndicatorColor = (sport) => {
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

    // Render class indicators
    const renderClassIndicators = (dayClasses) => {
        if (dayClasses.length === 0) return null;

        if (dayClasses.length === 1) {
            return (
                <View 
                    style={[
                        styles.singleClassIndicator, 
                        { backgroundColor: getClassIndicatorColor(dayClasses[0].sport) }
                    ]} 
                />
            );
        }

        // Multiple classes - show up to 3 dots
        const indicatorsToShow = dayClasses.slice(0, 3);
        return (
            <View style={styles.multipleClassIndicators}>
                {indicatorsToShow.map((cls, index) => (
                    <View
                        key={`${cls.$id}-${index}`}
                        style={[
                            styles.classIndicatorDot,
                            { backgroundColor: getClassIndicatorColor(cls.sport) }
                        ]}
                    />
                ))}
                {dayClasses.length > 3 && (
                    <Text style={styles.moreClassesText}>+{dayClasses.length - 3}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Calendar Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={20} color="#374151" />
                </TouchableOpacity>
                
                <View style={styles.monthYearContainer}>
                    <Text style={styles.monthYear}>
                        {monthNames[currentMonth]} {currentYear}
                    </Text>
                    <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                        <Text style={styles.todayButtonText}>Today</Text>
                    </TouchableOpacity>
                </View>
                
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={20} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
                {dayNames.map((dayName) => (
                    <View key={dayName} style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{dayName}</Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.calendarGrid}>
                    {calendarData.map((dayData, index) => {
                        const isWeekend = dayData.date.getDay() === 0 || dayData.date.getDay() === 6;
                        
                        return (
                            <TouchableOpacity
                                key={`${dayData.dateString}-${index}`}
                                style={[
                                    styles.dayCell,
                                    !dayData.isCurrentMonth && styles.otherMonthDay,
                                    dayData.isToday && styles.todayCell,
                                    dayData.isSelected && styles.selectedCell,
                                    isWeekend && styles.weekendCell,
                                ]}
                                onPress={() => handleDatePress(dayData)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.dayText,
                                    !dayData.isCurrentMonth && styles.otherMonthText,
                                    dayData.isToday && styles.todayText,
                                    dayData.isSelected && styles.selectedText,
                                    isWeekend && dayData.isCurrentMonth && styles.weekendText,
                                ]}>
                                    {dayData.day}
                                </Text>
                                {renderClassIndicators(dayData.classes)}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Legend */}
            <View style={styles.legend}>
                <Text style={styles.legendTitle}>Legend:</Text>
                <View style={styles.legendItems}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                        <Text style={styles.legendText}>Classes scheduled</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                        <Text style={styles.legendText}>Today</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    navButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    monthYearContainer: {
        alignItems: 'center',
    },
    monthYear: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    todayButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
    },
    todayButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    dayHeaders: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayHeader: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    calendarContainer: {
        maxHeight: 300,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', // 100% / 7 days
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        borderWidth: 0.5,
        borderColor: '#f3f4f6',
    },
    otherMonthDay: {
        opacity: 0.3,
    },
    todayCell: {
        backgroundColor: '#ecfdf5',
        borderColor: '#10b981',
    },
    selectedCell: {
        backgroundColor: '#dbeafe',
        borderColor: '#3b82f6',
    },
    weekendCell: {
        backgroundColor: '#fafafa',
    },
    dayText: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
    },
    otherMonthText: {
        color: '#9ca3af',
    },
    todayText: {
        color: '#10b981',
        fontWeight: 'bold',
    },
    selectedText: {
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    weekendText: {
        color: '#6b7280',
    },
    singleClassIndicator: {
        position: 'absolute',
        bottom: 2,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    multipleClassIndicators: {
        position: 'absolute',
        bottom: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    classIndicatorDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 1,
    },
    moreClassesText: {
        fontSize: 8,
        color: '#6b7280',
        marginLeft: 2,
        fontWeight: '600',
    },
    legend: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    legendTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 8,
    },
    legendItems: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#6b7280',
    },
});

export default Calendar; 
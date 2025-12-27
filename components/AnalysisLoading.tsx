import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, useColorScheme } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    Easing,
} from 'react-native-reanimated';
import Colors from '../app/theme/colors';
import { Ionicons } from '@expo/vector-icons';

const SCAN_DURATION = 1500;

interface AnalysisLoadingProps {
    imageUri: string | null;
}

const MESSAGES = [
    "Uploading image...",
    "Analyzing receipt...",
    "Extracting items and prices...",
    "Identifying currency...",
    "Finalizing results..."
];

export default function AnalysisLoading({ imageUri }: AnalysisLoadingProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
    
    // Animation Values
    const scanLineY = useSharedValue(0);
    const progress = useSharedValue(0);
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        // Scanning Animation
        scanLineY.value = withRepeat(
            withSequence(
                withTiming(200, { duration: SCAN_DURATION, easing: Easing.linear }),
                withTiming(0, { duration: SCAN_DURATION, easing: Easing.linear })
            ),
            -1,
            false
        );

        // Progress Animation (Simulated)
        // Fast start, then slow down to simulate processing
        progress.value = withTiming(0.7, { duration: 2500, easing: Easing.out(Easing.quad) });
        
        // Final slow crawl to 90% until done
        const timeout = setTimeout(() => {
            progress.value = withTiming(0.9, { duration: 5000, easing: Easing.linear });
        }, 2500);

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        // Cycle messages
        if (messageIndex >= MESSAGES.length - 1) return;

        const interval = setInterval(() => {
            setMessageIndex(prev => {
                if (prev < MESSAGES.length - 1) return prev + 1;
                return prev;
            });
        }, 1200); // Change message every 1.2s

        return () => clearInterval(interval);
    }, [messageIndex]);

    const scannerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: scanLineY.value }]
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`
    }));

    return (
        <View style={styles.container}>
            <View style={[styles.imageContainer, { borderColor: theme.border }]}>
                {imageUri && (
                    <Image 
                        source={{ uri: imageUri }} 
                        style={styles.image} 
                        resizeMode="contain" 
                    />
                )}
                
                {/* Scanning Beam */}
                <Animated.View style={[
                    styles.scanLine, 
                    { 
                        backgroundColor: theme.accent, 
                        shadowColor: theme.accent,
                    }, 
                    scannerStyle 
                ]} />
                
                {/* Overlay to darken slightly */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.1 }]} />
            </View>

            <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: theme.text }]}>
                    {MESSAGES[messageIndex]}
                </Text>
                
                {/* Progress Bar */}
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                    <Animated.View style={[
                        styles.progressBarFill, 
                        { backgroundColor: theme.accent }, 
                        progressStyle
                    ]} />
                </View>
                
                <View style={styles.iconRow}>
                    <Ionicons name="scan-outline" size={20} color={theme.textSecondary} style={{ opacity: messageIndex >= 1 ? 1 : 0.3 }} />
                    <Ionicons name="arrow-forward" size={16} color={theme.border} />
                    <Ionicons name="cog-outline" size={20} color={theme.textSecondary} style={{ opacity: messageIndex >= 2 ? 1 : 0.3 }} />
                    <Ionicons name="arrow-forward" size={16} color={theme.border} />
                    <Ionicons name="receipt-outline" size={20} color={theme.textSecondary} style={{ opacity: messageIndex >= 4 ? 1 : 0.3 }} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        width: '100%',
    },
    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24,
        position: 'relative',
        backgroundColor: '#00000005',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    scanLine: {
        height: 2,
        width: '100%',
        position: 'absolute',
        top: 0,
        zIndex: 10,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    statusContainer: {
        width: '100%',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    progressBarBg: {
        width: '80%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    }
});

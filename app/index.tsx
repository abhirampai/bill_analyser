import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { ocr } from "./gemini/gemini";
import ResponseModal from "./gemini/ResponseModal";
import Colors from "./theme/colors";

export default function Index() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];
  const isDark = colorScheme === "dark";

  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null); // Keep as any for now to match original
  const [visible, setVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const copyToClipboard = async () => {
    if (analysis)
      await Clipboard.setStringAsync(JSON.stringify(analysis, null, 2));
  };

  const pickImage = async () => {
    setAnalysis(null);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      base64: true,
      quality: 1,
    });

    if (!result.canceled) {
      setIsLoading(true);
      setVisible(true);
      const uri = result.assets[0].uri;
      setImage(uri);
      const base64Data = result.assets[0].base64;
      const mimeType = result.assets[0].mimeType;
      try {
        const resultFromApi = await ocr(base64Data, mimeType);
        setAnalysis(resultFromApi);
      } catch (error) {
        console.log(error);
        setVisible(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const FeatureCard = ({
    icon,
    title,
    description,
  }: {
    icon: any;
    title: string;
    description: string;
  }) => (
    <View
      style={[
        styles.featureCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View
        style={[styles.featureIconContainer, { backgroundColor: theme.featureIconBg }]}
      >
        <Ionicons name={icon} size={24} color={theme.featureIconColor} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: theme.headerIconBg,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="receipt-outline"
              size={32}
              color={theme.headerIconColor}
            />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>
            Bill Analyser
          </Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            AI-Powered Expense Insights
          </Text>
        </View>

        {/* Hero / Action Section */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              {
                backgroundColor: theme.scanButtonBg,
                borderColor: theme.border,
              },
            ]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <BlurView
              intensity={20}
              tint={isDark ? "light" : "dark"}
              style={styles.scanButtonBlur}
            >
              <View style={styles.scanIconWrapper}>
                <Ionicons
                  name="scan-circle"
                  size={64}
                  color={isDark ? "#fff" : theme.accent}
                />
              </View>
              <Text style={[styles.scanButtonText, { color: theme.text }]}>
                Scan New Bill
              </Text>
              <Text
                style={[styles.scanButtonSubtext, { color: theme.textSecondary }]}
              >
                Upload from Gallery
              </Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Recent / Preview Section */}
        {image && (
          <View style={styles.previewSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Last Analysis
            </Text>
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <Image source={{ uri: image }} style={styles.previewImage} />
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.accent }]}
                  onPress={() => setVisible(true)}
                >
                  <Ionicons name="eye-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                {analysis && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.secondaryButton,
                      { backgroundColor: isDark ? "#333" : "#E0E0E0" },
                    ]}
                    onPress={copyToClipboard}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={20}
                      color={isDark ? "#fff" : "#333"}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: isDark ? "#fff" : "#333" },
                      ]}
                    >
                      Copy Data
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Capabilities
          </Text>
          <View style={styles.featuresGrid}>
            <FeatureCard
              icon="flash"
              title="Instant OCR"
              description="Extract text from bills in seconds."
            />
            <FeatureCard
              icon="pie-chart"
              title="Smart Analysis"
              description="Categorize expenses automatically."
            />
            <FeatureCard
              icon="document-text"
              title="Detailed Reports"
              description="Get itemized breakdowns."
            />
          </View>
        </View>
      </ScrollView>

      <ResponseModal
        visible={visible}
        onClose={() => setVisible(false)}
        billData={analysis}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  scanButton: {
    width: "100%",
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
  },
  scanButtonBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanIconWrapper: {
    marginBottom: 12,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  scanButtonText: {
    fontSize: 20,
    fontWeight: "700",
  },
  scanButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 20,
    marginBottom: 16,
  },
  previewSection: {
    marginBottom: 40,
  },
  previewCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#ccc",
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    // Styles handled inline for dynamic colors
  },
  actionButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  featuresSection: {
    paddingBottom: 20,
  },
  featuresGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
  },
});

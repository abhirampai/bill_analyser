import { useState } from "react";
import { StyleSheet, Button, Image, Text, ScrollView, View, Dimensions } from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as Clipboard from 'expo-clipboard';

import { ocr } from "./gemini/gemini";

export default function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const copyToClipboard = async () => {
    if(analysis) await Clipboard.setStringAsync(analysis);
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    setAnalysis(null)
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      base64: true,
      quality: 1
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      const base64Data = result.assets[0].base64;
      const mimeType = result.assets[0].mimeType;
      try {
        const resultFromApi = await ocr(base64Data, mimeType);
        setAnalysis(resultFromApi);
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <View
     style={styles.container}
    >
      <Button title="Pick an image from camera roll" onPress={pickImage} />
      {image && (
        <Image
          source={{ uri: image }}
          style={styles.image}
        />
      )}
      {analysis && (
        <ScrollView>
          <Button title="Click here to copy analysis to Clipboard" onPress={copyToClipboard} />
          <Text style={styles.text}>{analysis}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  text: {
    fontSize: 20
  },
  image: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height / 2
  }
})

import { useState } from "react";
import { Button, Image, Text, View } from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import ocr from "./api/ocr";

export default function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      try {
        const resultFromApi = await ocr.ocrApi(base64Data);
        setAnalysis(resultFromApi.data.response);
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Button title="Pick an image from camera roll" onPress={pickImage} />
      {image && (
        <Image
          source={{ uri: image }}
          style={{
            width: 200,
            height: 200,
          }}
        />
      )}
      {analysis && (
        <Text style={{ fontSize: 20 }}>{analysis}</Text>
      )}
    </View>
  );
}

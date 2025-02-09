import axios from "axios";

const ocrApi = (image) =>
  axios.post(
    "http://localhost:11434/api/generate",
    {
      model: "llava",
      prompt:
        "Can you explain the image and also respond if the image is a bill if yes respond with the bill details as a table and if not respond with a description of the image.",
      images: [image],
      stream: false,
    },
  );

const ocr = { ocrApi };

export default ocr;

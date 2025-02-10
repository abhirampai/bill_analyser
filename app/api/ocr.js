import axios from "axios";

const ocrApi = (image) =>
  axios.post(
    `${process.env.EXPO_PUBLIC_OLLAMA_SERVER_URL}/api/generate`,
    {
      model: "llama3.2-vision",
      prompt:
        `Can you run ocr on the image to check if the image is a bill and respond with the following properties
          isBill - Boolean value to check if the image is a bill.
          items - List of items in the bill with name, price, and quantity if isBill is true.
          taxDetails - Tax details with taxName, taxRate and taxAmount(total tax amount) if isBill is true.
          description - Description of the bill.
          error - Boolean value to check if there is an error.
          errorMessage - Error message if there is an error.
          totalAmount - Total amount of the bill if isBill is true.
        . The bill could be split based on different category like food, beverages, etc so analyze the entire bill and return the response. Respond as JSON.`,
      images: [image],
      stream: false,
      format: {
        type: "object",
        properties: {
          items: {
            type: "array",
            properties: {
              name: {
                type: "string"
              },
              price: {
                type: "number"
              },
              quantity: {
                type: "number"
              }
            }
          },
          totalAmount: {
            type: "number"
          },
          taxDetails: {
            type: "array",
            properties: {
              taxName: {
                type: "string"
              },
              taxRate: {
                type: "number"
              },
              taxAmount: {
                type: "number"
              }
            }
          },
          description: {
            type: "string"
          },
          isBill: {
            type: "boolean"
          },
          error: {
            type: "boolean"
          },
          errorMessage: {
            type: "string"
          }
        },
        required: [
          "items",
          "description",
          "isBill",
          "error",
          "errorMessage"
        ]
      }
    },
  );

const ocr = { ocrApi };

export default ocr;

# Welcome to Bill Analyzer App 👋

This is an expo app that runs ocr with the help of llama3.2-vision using Ollama.

## Get started

1. Clone the repo
2. Run yarn

   ```bash
   yarn
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

3. Install ollama and pull llama3.2-vision model.
4. Use ngrok or pinggy to expose the ollama server.

    ```bash
      ssh -p 443 -R 0:127.0.0.1:11434 -L 4300:localhost:4300 a.pinggy.io "u:Host:localhost:11434"
    ```

### Screenshot
<img src="./assets/app_screenshot.jpeg"/>

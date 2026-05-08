# Smart Attendance Android APK

This Android project wraps the live Render site in a native WebView:

`https://smart-attendance-tracker-ymta.onrender.com/`

## Build APK

1. Install Android Studio.
2. Open the `android-apk` folder.
3. Let Android Studio install the required Gradle and SDK files.
4. Choose `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
5. The APK will appear under `android-apk/app/build/outputs/apk/debug/`.

## Notes

- The app requires internet because attendance data is stored on the hosted backend/Postgres.
- Excel/file import is supported through Android's file chooser.
- For Play Store release, create a signed release build from Android Studio.

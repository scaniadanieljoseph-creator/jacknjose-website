# Elsha Android app

A native Android app (package `in.co.jacknjose.elsha`) that opens https://elsha.co.in.
Website changes appear in the app straight away; only the app itself (icon, name, behaviour) needs a new APK.

Inside the app: printing goes to Android's print service, Excel/CSV downloads are saved to Downloads,
photo and document uploads use the phone's file picker, and WhatsApp, phone, mail and UPI links open their apps.
Without internet it shows an offline page with a Try again button.

## Build
1. Install the Android SDK (platform 35, build-tools 35) and set `sdk.dir` in `android/local.properties`.
2. Put the signing details in `android/keystore.properties` (not committed):
   storeFile=/path/to/elsha-release.jks, storePassword=…, keyAlias=elsha, keyPassword=…
3. `gradle assembleRelease` in this folder. The APK is `app/build/outputs/apk/release/app-release.apk`.
For each update raise `versionCode` in `app/build.gradle` and sign with the same key.

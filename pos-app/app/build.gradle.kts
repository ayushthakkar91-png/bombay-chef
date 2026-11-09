plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    id("com.google.gms.google-services")
}

// BBC API base + branch slug, injected at build time. Override per build, e.g.
//   ./gradlew :app:assembleDebug -PposServerUrl=http://10.0.2.2:3000/api/pos -PposLocationSlug=balham
val posServerUrl = (project.findProperty("posServerUrl") as String?) ?: "https://www.bombay-bicycle-chef.com/api/pos"
val posLocationSlug = (project.findProperty("posLocationSlug") as String?) ?: "balham"

android {
    // Keep namespace the same so you don't have to move files
    namespace = "com.example.newmilano"
    compileSdk = 35

    defaultConfig {
        // App install identity (shown in Android settings, matched by Firebase).
        // Note: this differs from `namespace` above — namespace is the internal
        // code package (where R/BuildConfig generate) and is left unchanged to
        // avoid moving every Kotlin source file for no visible benefit.
        applicationId = "com.americanpizza.pos"

        minSdk = 24
        // --- LOWER TARGET SDK FOR COMPATIBILITY ---
        targetSdk = 30

        versionCode = 4
        versionName = "2.2"

        buildConfigField("String", "SERVER_URL", "\"$posServerUrl\"")
        buildConfigField("String", "LOCATION_SLUG", "\"$posLocationSlug\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // --- ADDED CHIP SUPPORT FOR SUNMI V2 ---
        ndk {
            abiFilters.add("armeabi-v7a")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        buildConfig = true
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)

    implementation(platform("com.google.firebase:firebase-bom:33.1.0"))
    implementation("com.google.firebase:firebase-messaging:24.0.0")
    implementation("com.google.firebase:firebase-messaging-ktx")

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")

    // Encrypted storage for staff credentials, so the always-on POS can silently
    // re-authenticate when its JWT expires (see SecureCreds / OrderPrintService.reauth).
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    implementation("com.sunmi:printerlibrary:1.0.18")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}

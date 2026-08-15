package com.openupi.daemon.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore

val Context.dataStore by preferencesDataStore(name = "openupi_settings")

object AppSettings {
    val KEY_SERVER_URL = stringPreferencesKey("server_url")
    val KEY_SECRET_KEY = stringPreferencesKey("secret_key")
    val KEY_FALLBACK_URL = stringPreferencesKey("fallback_webhook_url")
    val KEY_MONGO_URI = stringPreferencesKey("mongo_uri")
    val KEY_MERCHANT_VPA = stringPreferencesKey("merchant_vpa")
    val KEY_MERCHANT_NAME = stringPreferencesKey("merchant_name")
    val KEY_BANK_KEYWORDS = stringPreferencesKey("bank_keywords")
    val KEY_ENABLE_TTS = booleanPreferencesKey("enable_tts")
}

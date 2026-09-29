package expo.modules.smslistener

import android.content.Context

internal object SmsPrefs {
  private const val FILE = "expo.modules.smslistener"
  private const val KEY_ENABLED = "enabled"

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, enabled).apply()
  }

  fun isEnabled(context: Context): Boolean =
    context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)
}

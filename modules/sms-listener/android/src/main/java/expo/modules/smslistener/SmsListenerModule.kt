package expo.modules.smslistener

import android.content.Context
import android.provider.Telephony
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsListenerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SmsListener")

    // Mirrors the JS "Auto-add from SMS" switch so the receiver can skip waking JS when it's off.
    Function("setEnabled") { enabled: Boolean ->
      SmsPrefs.setEnabled(context, enabled)
    }

    // Inbox messages received after `sinceMs`, oldest first. Used to catch up on anything the
    // receiver missed (e.g. the app was force-stopped). Requires READ_SMS.
    AsyncFunction("readInboxSince") { sinceMs: Double, limit: Int ->
      val messages = mutableListOf<Map<String, Any?>>()
      context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
        "${Telephony.Sms.DATE} > ?",
        arrayOf(sinceMs.toLong().toString()),
        "${Telephony.Sms.DATE} ASC"
      )?.use { cursor ->
        while (cursor.moveToNext() && messages.size < limit) {
          messages.add(
            mapOf(
              "address" to cursor.getString(0),
              "body" to cursor.getString(1),
              "timestamp" to cursor.getLong(2).toDouble()
            )
          )
        }
      }
      messages
    }
  }
}

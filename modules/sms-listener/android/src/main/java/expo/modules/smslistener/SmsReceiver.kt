package expo.modules.smslistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.facebook.react.HeadlessJsTaskService

/**
 * Receives every incoming SMS. Messages that look like a payment are handed to JavaScript
 * (SmsHeadlessTaskService → "SmsDebitTask"), which does the real parsing and adds the expense.
 * Works while the app is closed; receiving SMS_RECEIVED lets the app start a service briefly.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    if (!SmsPrefs.isEnabled(context)) return

    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    val receivedAt = System.currentTimeMillis()

    // A long SMS arrives as several parts; join them back together per sender.
    val bodies = linkedMapOf<String, StringBuilder>()
    for (part in parts) {
      val address = part?.displayOriginatingAddress ?: continue
      bodies.getOrPut(address) { StringBuilder() }.append(part.displayMessageBody ?: "")
    }

    for ((address, body) in bodies) {
      val text = body.toString()
      if (!looksLikePayment(text)) continue
      val task = Intent(context, SmsHeadlessTaskService::class.java).apply {
        putExtra("address", address)
        putExtra("body", text)
        putExtra("timestamp", receivedAt.toDouble())
      }
      try {
        context.startService(task)
        HeadlessJsTaskService.acquireWakeLockNow(context)
      } catch (e: Exception) {
        // The app picks this message up from the inbox next time it opens.
        Log.w(TAG, "Could not start SMS task", e)
      }
    }
  }

  companion object {
    private const val TAG = "SmsReceiver"

    // Cheap pre-filter so ordinary messages don't wake the JavaScript runtime.
    private val PAYMENT_WORDS =
      Regex("(?i)\\b(debited|debit|spent|paid|sent|withdrawn|purchase|txn|transaction)\\b")
    // "Rs 250", "INR 250", "₹250", or SBI-style "debited by 150.0" with no currency.
    private val AMOUNT = Regex("(?i)(rs\\.?|inr|₹)\\s*\\d|debited\\s+(by|for|with)?\\s*\\d")

    fun looksLikePayment(text: String): Boolean =
      PAYMENT_WORDS.containsMatchIn(text) && AMOUNT.containsMatchIn(text)
  }
}

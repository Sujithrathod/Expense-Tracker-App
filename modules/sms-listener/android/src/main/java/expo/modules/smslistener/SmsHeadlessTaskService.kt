package expo.modules.smslistener

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/** Runs the JavaScript task registered as "SmsDebitTask" with { address, body, timestamp }. */
class SmsHeadlessTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(
      "SmsDebitTask",
      Arguments.fromBundle(extras),
      30_000L,
      true // also run while the app is open, so the list updates live
    )
  }
}

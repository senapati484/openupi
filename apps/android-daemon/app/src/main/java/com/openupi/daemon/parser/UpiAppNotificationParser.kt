package com.openupi.daemon.parser

/**
 * Parses push notifications from UPI apps installed on the same device.
 * Works for: Google Pay (GPay), PhonePe, Paytm, BHIM, Amazon Pay.
 */
class UpiAppNotificationParser : BankParser {
    private val appAllowlist = setOf(
        "com.google.android.apps.nbu.paisa.user",  // Google Pay
        "com.phonepe.app",                          // PhonePe
        "net.one97.paytm",                          // Paytm
        "in.org.npci.upiapp",                       // BHIM
        "com.amazon.mShop.android.shopping",        // Amazon Pay
        "com.freecharge.android",                   // FreeCharge
    )

    private val amountRegex = Regex(
        """(?:received|credited|added|payment\s+of)\s+(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)""",
        RegexOption.IGNORE_CASE
    )

    private val utrRegex = Regex(
        """(?:UPI\s+Ref|Ref\s+No|UTR)[:\s]*([0-9]{12})""",
        RegexOption.IGNORE_CASE
    )

    override fun canHandle(packageName: String, title: String, body: String): Boolean =
        appAllowlist.contains(packageName)

    override fun extract(title: String, body: String): ParsedPayment? {
        val combined = "$title $body".replace(",", "")
        val amount = amountRegex.find(combined)?.groupValues?.get(1)?.toDoubleOrNull() ?: return null
        val utr = utrRegex.find(combined)?.groupValues?.get(1)
        return ParsedPayment(amount = amount, utr = utr, sender = title, rawText = combined)
    }
}

/**
 * Central registry of all active parsers — ordered by specificity (most specific first).
 */
object ParserRegistry {
    val parsers = listOf(
        UpiAppNotificationParser(),   // Most specific: exact package match
        GenericSmsBankParser(),        // Broad: DLT sender allowlist
    )
}

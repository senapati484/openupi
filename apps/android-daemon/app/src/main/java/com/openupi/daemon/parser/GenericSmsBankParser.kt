package com.openupi.daemon.parser

/**
 * Handles SMS-based bank credit notifications for major Indian banks.
 * Covers: UCO Bank, SBI, HDFC, ICICI, Axis, PNB, Kotak, Union Bank.
 *
 * TRAI DLT sender ID format: XX-BANKID-S (e.g. VM-UCOBNK-S)
 * Only processes "credited" messages — debits are explicitly rejected.
 */
class GenericSmsBankParser : BankParser {
    private val senderAllowlist = listOf(
        "UCOBNK", "SBINB", "SBINR", "HDFCBK", "ICICIB",
        "AXISBK", "UTIBNK", "PUNBNK", "KOTAKB", "UNIONB",
        "YESBNK", "IDBIBK", "BOIIND", "CANBNK"
    )

    // Matches "credited with Rs.99.04", "credited by INR 1,499.50", "received Rs.300"
    private val amountRegex = Regex(
        """(?:credited\s+(?:with|by)?|received|deposited)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)""",
        RegexOption.IGNORE_CASE
    )

    // Matches 12-digit UPI RRN / UTR or alphanumeric ref
    private val utrRegex = Regex(
        """(?:UPI\s+Ref(?:\s+no)?|Ref\s+no|UTR|RRN|by\s+[A-Z0-9\-]+)[:\s]*([0-9]{12}|[A-Za-z0-9]{8,18})""",
        RegexOption.IGNORE_CASE
    )

    override fun canHandle(packageName: String, title: String, body: String): Boolean {
        val combined = "$title $body"
        return senderAllowlist.any { combined.contains(it, ignoreCase = true) }
    }

    override fun extract(title: String, body: String): ParsedPayment? {
        // Remove Indian comma formatting for clean number parsing
        val cleanBody = body.replace(",", "")

        val amountMatch = amountRegex.find(cleanBody) ?: return null
        val amount = amountMatch.groupValues[1].toDoubleOrNull() ?: return null
        val utr = utrRegex.find(cleanBody)?.groupValues?.get(1)

        return ParsedPayment(amount = amount, utr = utr, sender = title, rawText = body)
    }
}

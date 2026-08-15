package com.openupi.daemon.parser

data class ParsedPayment(
    val amount: Double,
    val utr: String?,
    val sender: String,
    val rawText: String,
    val timestamp: Long = System.currentTimeMillis()
)

interface BankParser {
    /**
     * Returns true if this parser can handle the given notification source.
     * @param packageName  e.g. "com.google.android.apps.nbu.paisa.user"
     * @param title        Notification title / sender ID
     * @param body         Notification body text
     */
    fun canHandle(packageName: String, title: String, body: String): Boolean

    /**
     * Extracts payment details from a notification.
     * Returns null if the notification is not a credit (e.g. debit, OTP, balance).
     */
    fun extract(title: String, body: String): ParsedPayment?
}

package com.openupi.daemon.ui

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** In-process event bus for streaming log entries to the Compose UI. */
object LiveLogBus {
    private val _events = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val events = _events.asSharedFlow()

    fun emit(message: String) {
        _events.tryEmit("[${java.time.LocalTime.now().toString().substringBefore('.')}] $message")
    }
}

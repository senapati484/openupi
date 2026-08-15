package com.openupi.daemon.data

import android.content.Context
import androidx.room.*

@Entity(tableName = "pending_dispatches")
data class QueuedPayment(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val amount: Double,
    val utr: String?,
    val rawText: String,
    val attempts: Int = 0,
    val timestamp: Long = System.currentTimeMillis()
)

@Dao
interface PaymentDao {
    @Insert
    suspend fun insert(payment: QueuedPayment): Long

    @Query("SELECT * FROM pending_dispatches ORDER BY timestamp ASC")
    suspend fun getAllPending(): List<QueuedPayment>

    @Query("DELETE FROM pending_dispatches WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("UPDATE pending_dispatches SET attempts = attempts + 1 WHERE id = :id")
    suspend fun incrementAttempts(id: Long)

    @Query("SELECT COUNT(*) FROM pending_dispatches")
    suspend fun count(): Int
}

@Database(entities = [QueuedPayment::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun paymentDao(): PaymentDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "openupi_queue.db"
                ).build().also { INSTANCE = it }
            }
    }
}

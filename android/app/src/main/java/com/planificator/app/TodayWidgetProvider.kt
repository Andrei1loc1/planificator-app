package com.planificator.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

private class TaskData(val title: String, val time: String, val color: String, val done: Boolean)

private class DayData(val label: String, val total: Int, val done: Int, val tasks: List<TaskData>)

class TodayWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            render(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        render(context, appWidgetManager, appWidgetId)
    }

    companion object {
        private const val PREFS_NAME = "widget_prefs"
        private const val PREF_KEY = "widget_payload"
        private const val MAX_ROWS = 6

        private val COLOR_TITLE = 0xFFf0eee8.toInt()
        private val COLOR_TIME = 0xFF8b8a99.toInt()
        private val COLOR_DONE = 0xFF50505f.toInt()
        private val COLOR_FALLBACK = 0xFF8b8a99.toInt()

        private val ROW_IDS = intArrayOf(R.id.row_1, R.id.row_2, R.id.row_3, R.id.row_4, R.id.row_5, R.id.row_6)
        private val DOT_IDS = intArrayOf(R.id.dot_1, R.id.dot_2, R.id.dot_3, R.id.dot_4, R.id.dot_5, R.id.dot_6)
        private val TIME_IDS = intArrayOf(R.id.time_1, R.id.time_2, R.id.time_3, R.id.time_4, R.id.time_5, R.id.time_6)
        private val TITLE_IDS = intArrayOf(R.id.title_1, R.id.title_2, R.id.title_3, R.id.title_4, R.id.title_5, R.id.title_6)

        fun render(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_today)
            val options = manager.getAppWidgetOptions(appWidgetId)
            val heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180)
            val capacity = rowCapacity(heightDp)
            val today = loadToday(context)
            if (today == null) {
                views.setTextViewText(R.id.widget_label, "")
                views.setTextViewText(R.id.widget_count, "")
                for (i in 0 until MAX_ROWS) {
                    views.setViewVisibility(ROW_IDS[i], View.GONE)
                }
                views.setViewVisibility(R.id.row_more, View.GONE)
                views.setTextViewText(R.id.widget_empty, "Deschide aplicația pentru azi")
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
            } else {
                views.setTextViewText(R.id.widget_label, "· " + today.label)
                views.setTextViewText(R.id.widget_count, "${today.done}/${today.total} bifate")
                renderRows(views, today, capacity)
                if (today.tasks.isEmpty()) {
                    views.setTextViewText(R.id.widget_empty, "Nimic azi — deschide aplicația")
                    views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.widget_empty, View.GONE)
                }
            }
            val launchIntent = Intent(context, MainActivity::class.java)
            views.setOnClickPendingIntent(
                R.id.widget_root,
                PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE)
            )
            manager.updateAppWidget(appWidgetId, views)
        }

        private fun rowCapacity(heightDp: Int): Int {
            val ROOT_PAD_DP = 28
            val HEADER_DP = 40
            val CARD_DP = 52
            val capacity = (heightDp - ROOT_PAD_DP - HEADER_DP) / CARD_DP
            return max(1, min(capacity, MAX_ROWS))
        }

        private fun renderRows(views: RemoteViews, today: DayData, capacity: Int) {
            val shown = min(today.tasks.size, capacity)
            for (i in 0 until MAX_ROWS) {
                if (i < shown) {
                    val task = today.tasks[i]
                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE)
                    views.setInt(DOT_IDS[i], "setTextColor", parseColor(task.color))
                    views.setTextViewText(TIME_IDS[i], task.time)
                    views.setTextViewText(TITLE_IDS[i], task.title)
                    if (task.done) {
                        views.setInt(TIME_IDS[i], "setTextColor", COLOR_DONE)
                        views.setInt(TITLE_IDS[i], "setTextColor", COLOR_DONE)
                    } else {
                        views.setInt(TIME_IDS[i], "setTextColor", COLOR_TIME)
                        views.setInt(TITLE_IDS[i], "setTextColor", COLOR_TITLE)
                    }
                } else {
                    views.setViewVisibility(ROW_IDS[i], View.GONE)
                }
            }
            if (today.tasks.size > capacity) {
                views.setViewVisibility(R.id.row_more, View.VISIBLE)
                views.setTextViewText(R.id.row_more, "Încă ${today.tasks.size - capacity}…")
            } else {
                views.setViewVisibility(R.id.row_more, View.GONE)
            }
        }

        private fun loadToday(context: Context): DayData? {
            val payload = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(PREF_KEY, null)
                ?: return null
            return try {
                val days = JSONObject(payload).getJSONObject("days")
                val todayKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                if (!days.has(todayKey)) {
                    return null
                }
                val day = days.getJSONObject(todayKey)
                val tasks = ArrayList<TaskData>()
                val tasksArray = day.optJSONArray("tasks")
                if (tasksArray != null) {
                    for (i in 0 until tasksArray.length()) {
                        val task = tasksArray.optJSONObject(i) ?: continue
                        tasks.add(
                            TaskData(
                                task.optString("title", ""),
                                buildTime(task.optString("start", ""), task.optString("end", "")),
                                task.optString("color", ""),
                                task.optBoolean("done", false)
                            )
                        )
                    }
                }
                DayData(day.optString("label", ""), day.optInt("total", tasks.size), day.optInt("done", 0), tasks)
            } catch (e: Exception) {
                null
            }
        }

        private fun buildTime(start: String, end: String): String {
            if (start.isEmpty()) {
                return end
            }
            return if (end.isEmpty()) start else "$start–$end"
        }

        private fun parseColor(color: String): Int {
            return try {
                Color.parseColor(color)
            } catch (e: Exception) {
                COLOR_FALLBACK
            }
        }
    }
}
package com.planificator.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal class TaskData(
    val title: String,
    val time: String,
    val color: String,
    val done: Boolean,
    val startMin: Int?,
    val endMin: Int?
) {
    val effectiveEnd: Int?
        get() = when {
            startMin == null -> null
            endMin != null && endMin > startMin -> endMin
            else -> startMin + 60
        }
}

internal class DayData(val label: String, val total: Int, val done: Int, val tasks: List<TaskData>)

internal object WidgetData {
    const val PREFS_NAME = "widget_prefs"
    const val PREF_KEY = "widget_payload"

    val COLOR_TITLE = 0xFFf0eee8.toInt()
    val COLOR_TIME = 0xFF8b8a99.toInt()
    val COLOR_DONE = 0xFF50505f.toInt()
    val COLOR_FALLBACK = 0xFF8b8a99.toInt()

    fun nowMinutes(): Int {
        val cal = java.util.Calendar.getInstance()
        return cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)
    }

    fun sortForWidget(list: List<TaskData>, now: Int): List<TaskData> {
        val current = ArrayList<TaskData>()
        val upcoming = ArrayList<TaskData>()
        val past = ArrayList<TaskData>()
        val timeless = ArrayList<TaskData>()
        for (t in list) {
            val start = t.startMin
            if (start == null) {
                timeless.add(t)
                continue
            }
            val end = t.effectiveEnd ?: (start + 60)
            when {
                start <= now && now < end -> current.add(t)
                start > now -> upcoming.add(t)
                else -> past.add(t)
            }
        }
        val byStart = compareBy<TaskData> { it.startMin ?: 0 }
        return current.sortedWith(byStart) +
            upcoming.sortedWith(byStart) +
            past.sortedWith(byStart) +
            timeless
    }

    fun isPast(task: TaskData, now: Int): Boolean {
        val end = task.effectiveEnd ?: return false
        return end < now
    }

    fun minutesOf(hhmm: String): Int? {
        if (hhmm.isEmpty()) return null
        return try {
            val p = hhmm.split(":")
            p[0].trim().toInt() * 60 + p[1].trim().toInt()
        } catch (e: Exception) {
            null
        }
    }

    fun loadToday(context: Context): DayData? {
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
                    val start = task.optString("start", "")
                    val end = task.optString("end", "")
                    tasks.add(
                        TaskData(
                            task.optString("title", ""),
                            buildTime(start, end),
                            task.optString("color", ""),
                            task.optBoolean("done", false),
                            minutesOf(start),
                            minutesOf(end)
                        )
                    )
                }
            }
            DayData(day.optString("label", ""), day.optInt("total", tasks.size), day.optInt("done", 0), tasks)
        } catch (e: Exception) {
            null
        }
    }

    fun buildTime(start: String, end: String): String {
        if (start.isEmpty()) {
            return end
        }
        return if (end.isEmpty()) start else "$start–$end"
    }

    fun parseColor(color: String): Int {
        return try {
            Color.parseColor(color)
        } catch (e: Exception) {
            COLOR_FALLBACK
        }
    }
}

internal object WidgetRenderer {

    fun render(context: Context, manager: AppWidgetManager, appWidgetId: Int, layoutId: Int, style: Int) {
        val views = RemoteViews(context.packageName, layoutId)
        val today = WidgetData.loadToday(context)
        if (today == null) {
            views.setTextViewText(R.id.widget_day_name, "")
            views.setTextViewText(R.id.widget_day_date, "")
            views.setTextViewText(R.id.widget_count, "")
            views.setViewVisibility(R.id.widget_progress, View.GONE)
        } else {
            val parts = today.label.split(", ", limit = 2)
            views.setTextViewText(R.id.widget_day_name, parts[0])
            views.setTextViewText(R.id.widget_day_date, if (parts.size > 1) parts[1] else "")
            views.setTextViewText(R.id.widget_count, "${today.done}/${today.total}")
            views.setProgressBar(R.id.widget_progress, maxOf(today.total, 1), today.done, false)
            views.setViewVisibility(
                R.id.widget_progress,
                if (today.total > 0) View.VISIBLE else View.GONE
            )
        }

        val listIntent = Intent(context, TaskListService::class.java)
        listIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        listIntent.putExtra("style", style)
        listIntent.data = Uri.parse("widget://$style/$appWidgetId")
        views.setRemoteAdapter(R.id.task_list, listIntent)
        views.setEmptyView(R.id.task_list, R.id.widget_empty)

        val launchIntent = Intent(context, MainActivity::class.java)
        val launchPending = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_root, launchPending)
        views.setOnClickPendingIntent(R.id.widget_empty, launchPending)
        views.setPendingIntentTemplate(R.id.task_list, launchPending)

        manager.updateAppWidget(appWidgetId, views)
    }
}
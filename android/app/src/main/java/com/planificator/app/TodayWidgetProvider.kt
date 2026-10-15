package com.planificator.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal class TaskData(val title: String, val time: String, val color: String, val done: Boolean)

internal class DayData(val label: String, val total: Int, val done: Int, val tasks: List<TaskData>)

internal object WidgetData {
    const val PREFS_NAME = "widget_prefs"
    const val PREF_KEY = "widget_payload"

    val COLOR_TITLE = 0xFFf0eee8.toInt()
    val COLOR_TIME = 0xFF8b8a99.toInt()
    val COLOR_DONE = 0xFF50505f.toInt()
    val COLOR_FALLBACK = 0xFF8b8a99.toInt()

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
        newOptions: android.os.Bundle?
    ) {
        render(context, appWidgetManager, appWidgetId)
    }

    companion object {

        fun render(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_today)
            val today = WidgetData.loadToday(context)
            if (today == null) {
                views.setTextViewText(R.id.widget_label, "")
                views.setTextViewText(R.id.widget_count, "")
                views.setTextViewText(R.id.widget_empty, "Deschide aplicația pentru azi")
            } else {
                views.setTextViewText(R.id.widget_label, "· " + today.label)
                views.setTextViewText(R.id.widget_count, "${today.done}/${today.total} bifate")
                views.setTextViewText(
                    R.id.widget_empty,
                    if (today.tasks.isEmpty()) "Nimic azi — deschide aplicația" else ""
                )
            }

            val listIntent = Intent(context, TaskListService::class.java)
            listIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            listIntent.data = Uri.parse("widget://$appWidgetId")
            views.setRemoteAdapter(R.id.task_list, listIntent)
            views.setEmptyView(R.id.task_list, R.id.widget_empty)

            val launchIntent = Intent(context, MainActivity::class.java)
            val launchPending = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_root, launchPending)
            views.setPendingIntentTemplate(R.id.task_list, launchPending)

            manager.updateAppWidget(appWidgetId, views)
        }
    }
}
package com.planificator.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WidgetSync")
class WidgetSyncPlugin : Plugin() {

    @PluginMethod
    fun syncTasks(call: PluginCall) {
        try {
            val payload = call.getString("payload")
            val appContext = context
            if (appContext == null) {
                call.reject("Context unavailable")
                return
            }
            appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(PREF_KEY, payload)
                .apply()
            refreshAll(appContext)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Widget sync failed")
        }
    }

    companion object {
        private const val PREFS_NAME = "widget_prefs"
        private const val PREF_KEY = "widget_payload"

        @JvmStatic
        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, TodayWidgetProvider::class.java))
            for (id in ids) {
                TodayWidgetProvider.render(context, manager, id)
            }
            manager.notifyAppWidgetViewDataChanged(ids, R.id.task_list)
        }
    }
}
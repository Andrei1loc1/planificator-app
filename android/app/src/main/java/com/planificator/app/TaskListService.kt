package com.planificator.app

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService

class TaskListService : RemoteViewsService() {

    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return TaskListFactory(applicationContext, intent)
    }
}

private class TaskListFactory(private val context: Context, intent: Intent) : RemoteViewsService.RemoteViewsFactory {

    private var tasks: List<TaskData> = emptyList()

    init {
        intent.getIntExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, -1)
    }

    override fun onCreate() {
        tasks = emptyList()
    }

    override fun onDataSetChanged() {
        tasks = WidgetData.loadToday(context)?.tasks ?: emptyList()
    }

    override fun onDestroy() {
        tasks = emptyList()
    }

    override fun getCount(): Int = tasks.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.task_card_item)
        val task = tasks[position]
        views.setTextViewText(R.id.item_title, task.title)
        views.setTextViewText(R.id.item_time, task.time)
        views.setInt(R.id.item_dot, "setTextColor", WidgetData.parseColor(task.color))
        if (task.done) {
            views.setInt(R.id.item_title, "setTextColor", WidgetData.COLOR_DONE)
            views.setInt(R.id.item_time, "setTextColor", WidgetData.COLOR_DONE)
        } else {
            views.setInt(R.id.item_title, "setTextColor", WidgetData.COLOR_TITLE)
            views.setInt(R.id.item_time, "setTextColor", WidgetData.COLOR_TIME)
        }
        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun hasStableIds(): Boolean = false

    override fun getItemId(position: Int): Long = position.toLong()
}
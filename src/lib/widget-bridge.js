import { Capacitor } from '@capacitor/core'

export function syncWidget(payload) {
  if (!Capacitor.isPluginAvailable('WidgetSync')) return false
  try {
    Capacitor.Plugins.WidgetSync.syncTasks({ payload: JSON.stringify(payload) })
    return true
  } catch (e) {
    return false
  }
}
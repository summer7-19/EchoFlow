<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { AudioLines, Bell, ChevronDown, ImagePlus, KeyRound, LogOut, Search, Settings2, UserRound } from 'lucide-vue-next'
import type { AuthUser } from '../../api/client'
import { listAudios } from '../../api/audio'
import type { AudioRecord } from '../../api/audio'
import { listScheduleEvents } from '../../api/schedule'
import type { TimelineEvent } from '../../api/schedule'
import { KIND_BY_SCENE, sceneForCategory } from '../../utils/scenes'
import ProfileDialog from './ProfileDialog.vue'

const props = defineProps<{ user?: AuthUser }>()
const emit = defineEmits<{
  (event: 'search', value: string): void
  (event: 'logout'): void
  (event: 'user-updated', user: AuthUser): void
  (event: 'popover-change', open: boolean): void
}>()

const headerSearchOpen = ref(false)
const notificationOpen = ref(false)
const profileOpen = ref(false)
const searchValue = ref('')
const dialog = ref<'avatar' | 'password' | null>(null)

const popoverOpen = computed(
  () => headerSearchOpen.value || notificationOpen.value || profileOpen.value,
)
const initials = computed(
  () =>
    props.user?.displayName?.slice(0, 1) ||
    props.user?.email?.slice(0, 1).toUpperCase() ||
    '我',
)

interface NotificationItem {
  id: string
  title: string
  meta: string
  dot: 'green' | 'orange' | 'blue'
  timestamp: number
  priority: number
}

const READ_KEY = 'echoflow.notificationsReadAt'

function readStoredReadAt() {
  try {
    const value = Number(window.localStorage.getItem(READ_KEY) ?? 0)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function persistReadAt(value: number) {
  try {
    window.localStorage.setItem(READ_KEY, String(value))
  } catch {
    // Storage can be unavailable in private mode; read state then lasts for this session.
  }
}

const scheduleEvents = ref<TimelineEvent[]>([])
const parsedAudios = ref<AudioRecord[]>([])
const eventsLoading = ref(false)
const eventsError = ref('')
const lastReadAt = ref(readStoredReadAt())
let eventsLoadedAt = 0

function audioKind(audio: AudioRecord) {
  return audio.category ? KIND_BY_SCENE[sceneForCategory(audio.category)] : '录音'
}

function eventKind(event: TimelineEvent) {
  const audio = parsedAudios.value.find(item => item.audioId === event.audioId)
  return audio ? audioKind(audio) : '日程提醒'
}

function formatEventTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const today = new Date()
  const startOfDay = (input: Date) =>
    new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000)
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  if (dayDiff === 0) return `今天 ${time}`
  if (dayDiff === 1) return `昨天 ${time}`
  if (dayDiff === -1) return `明天 ${time}`
  return `${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} ${time}`
}

function formatRemaining(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时`
  return `${Math.round(hours / 24)} 天`
}

const notificationItems = computed<NotificationItem[]>(() => {
  const items: NotificationItem[] = []

  for (const event of scheduleEvents.value) {
    const timestamp = new Date(event.triggerTime).getTime()
    if (!Number.isFinite(timestamp)) continue
    const kind = eventKind(event)

    if (event.status === 'COMPLETED') {
      items.push({
        id: `event-${event.id}`,
        title: event.title,
        meta: `已完成 · ${formatEventTime(event.triggerTime)} · ${kind}`,
        dot: 'green',
        timestamp,
        priority: 2,
      })
      continue
    }

    if (event.status === 'OVERDUE') {
      items.push({
        id: `event-${event.id}`,
        title: event.title,
        meta: `已逾期 · ${formatEventTime(event.triggerTime)} · ${kind}`,
        dot: 'blue',
        timestamp,
        priority: 1,
      })
      continue
    }

    const remaining = timestamp - Date.now()
    items.push({
      id: `event-${event.id}`,
      title: event.title,
      meta: remaining > 0
        ? `提醒 · 还有 ${formatRemaining(remaining)} · ${kind}`
        : `提醒 · ${formatEventTime(event.triggerTime)} · ${kind}`,
      dot: 'orange',
      timestamp,
      priority: 0,
    })
  }

  for (const audio of parsedAudios.value) {
    if (audio.status !== 'PARSED') continue
    const timestamp = new Date(audio.createdAt).getTime()
    if (!Number.isFinite(timestamp)) continue
    items.push({
      id: `audio-${audio.audioId}`,
      title: `「${audio.originalName}」解析完成`,
      meta: `${formatEventTime(audio.createdAt)} · ${audioKind(audio)}`,
      dot: 'blue',
      timestamp,
      priority: 3,
    })
  }

  return items.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority
    return left.priority <= 1 ? left.timestamp - right.timestamp : right.timestamp - left.timestamp
  })
})

const recentNotifications = computed(() => notificationItems.value.slice(0, 6))
const hasUnread = computed(() =>
  notificationItems.value.some(item => item.timestamp > lastReadAt.value),
)

function markAllRead() {
  const newest = notificationItems.value.reduce(
    (latest, item) => Math.max(latest, item.timestamp),
    Date.now(),
  )
  lastReadAt.value = newest
  persistReadAt(newest)
}

async function loadNotifications(force = false) {
  if (eventsLoading.value) return
  if (!force && Date.now() - eventsLoadedAt < 30_000) return

  eventsLoading.value = true
  eventsError.value = ''

  const [scheduleResult, audioResult] = await Promise.allSettled([
    listScheduleEvents(),
    listAudios(),
  ])

  if (scheduleResult.status === 'fulfilled') scheduleEvents.value = scheduleResult.value
  if (audioResult.status === 'fulfilled') parsedAudios.value = audioResult.value
  if (scheduleResult.status === 'rejected' && audioResult.status === 'rejected') {
    eventsError.value = '通知加载失败，请稍后重试'
  }

  eventsLoadedAt = Date.now()
  eventsLoading.value = false
}

let notificationCloseTimer: number | undefined

function setNotificationOpen(open: boolean) {
  window.clearTimeout(notificationCloseTimer)
  if (open) {
    notificationOpen.value = true
    void loadNotifications()
    return
  }
  notificationCloseTimer = window.setTimeout(() => {
    notificationOpen.value = false
  }, 500)
}

function toggleNotification() {
  if (notificationOpen.value) {
    window.clearTimeout(notificationCloseTimer)
    notificationOpen.value = false
    return
  }
  setNotificationOpen(true)
}

onMounted(() => {
  void loadNotifications(true)
})

onUnmounted(() => {
  window.clearTimeout(notificationCloseTimer)
})

watch(popoverOpen, value => emit('popover-change', value), { immediate: true })

function toggleSearch() {
  headerSearchOpen.value = !headerSearchOpen.value
  notificationOpen.value = false
  profileOpen.value = false
}

function openDialog(mode: 'avatar' | 'password') {
  dialog.value = mode
  profileOpen.value = false
}

let closeTimer: number | undefined

function setProfileOpen(open: boolean) {
  window.clearTimeout(closeTimer)
  if (open) {
    profileOpen.value = true
    return
  }
  closeTimer = window.setTimeout(() => {
    profileOpen.value = false
  }, 500)
}

function signOut() {
  emit('logout')
  profileOpen.value = false
}
</script>
<template>
  <header class="topbar">
    <a class="brand" href="#"><span class="brand-mark">
        <AudioLines :size="19" :stroke-width="2.1" />
      </span><span class="brand-name">echo<span>flow</span></span><span class="brand-divider"></span><span
        class="brand-cn">声流时空</span></a>
    <div class="top-center"><span class="live-dot"></span>个人工作台
      <ChevronDown :size="14" />
    </div>
    <div class="top-actions">
      <div class="header-search-wrap" :class="{ expanded: headerSearchOpen }"><input v-if="headerSearchOpen"
          v-model="searchValue" autofocus placeholder="搜索录音与纪要..." @input="emit('search', searchValue)"
          @keydown.esc="headerSearchOpen = false" /><button class="icon-btn quiet" aria-label="搜索"
          @click="toggleSearch">
          <Search :size="18" />
        </button></div>
      <div class="menu-anchor" @mouseenter="setNotificationOpen(true)" @mouseleave="setNotificationOpen(false)"><button
          class="icon-btn quiet notification" aria-label="通知" @click="toggleNotification">
          <Bell :size="18" /><i v-if="hasUnread" />
        </button>
        <div v-if="notificationOpen" class="header-popover notifications-popover"
          @mouseenter="setNotificationOpen(true)" @mouseleave="setNotificationOpen(false)">
          <div class="popover-title">最近事件 <button class="mark-read" :disabled="!notificationItems.length"
              @click="markAllRead">全部已读</button></div>
          <p v-if="eventsLoading && !notificationItems.length" class="notification-status">正在加载…</p>
          <p v-else-if="eventsError && !notificationItems.length" class="notification-status error">{{ eventsError }}</p>
          <p v-else-if="!recentNotifications.length" class="notification-status">暂无日程事件</p>
          <div v-for="item in recentNotifications" :key="item.id" class="event-row">
            <span :class="['event-dot', item.dot]" />
            <div><b>{{ item.title }}</b><small>{{ item.meta }}</small></div>
          </div>
        </div>
      </div>
      <span class="top-divider" />
      <div class="menu-anchor profile-anchor" @mouseenter="setProfileOpen(true)" @mouseleave="setProfileOpen(false)">
        <button class="profile" @click="profileOpen = !profileOpen"><img v-if="user?.avatarUrl" class="avatar"
            :src="user.avatarUrl" alt="头像" /><span v-else class="avatar">{{ initials }}</span><span
            class="profile-name">{{ user?.displayName || '个人账户' }}</span>
          <ChevronDown :size="13" />
        </button>
        <div v-if="profileOpen" class="header-popover profile-popover" @mouseover="setProfileOpen(true)" @mouseleave="setProfileOpen(false)">
          <div class="profile-summary"><img v-if="user?.avatarUrl" class="avatar large" :src="user.avatarUrl"
              alt="头像" /><span v-else class="avatar large">{{ initials }}</span>
            <div><b>{{ user?.displayName || '个人账户' }}</b><small>{{ user?.email }}</small></div>
          </div><button @click="openDialog('avatar')">
            <ImagePlus :size="15" /> 修改头像
          </button><button @click="openDialog('password')">
            <KeyRound :size="15" /> 修改密码
          </button><button>
            <UserRound :size="15" /> 个人资料
          </button><button>
            <Settings2 :size="15" /> 账户设置
          </button><button class="logout-item" @click="signOut">
            <LogOut :size="15" /> 退出登录
          </button>
        </div>
      </div>
    </div>
    <ProfileDialog v-if="dialog" :mode="dialog" :user="user" @close="dialog = null"
      @user-updated="emit('user-updated', $event)" />
  </header>
</template>
<style>
.topbar {
    height: 66px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(255, 255, 255, .88);
    border-bottom: 1px solid #edf0ed;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 max(calc((100vw - 1320px)/2), 42px);
}

.brand {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--ink);
    text-decoration: none;
}

.brand-divider,
.top-divider {
    height: 20px;
    width: 1px;
    background: #e7ebe7;
    margin: 0 4px;
}

.top-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    color: #606c65;
    display: flex;
    gap: 9px;
    align-items: center;
}

.live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #69b68a;
    box-shadow: 0 0 0 3px #eaf5ee;
}

.top-actions {
    display: flex;
    align-items: center;
    gap: 17px;
}

.notification {
    position: relative;
}

.notification i {
    position: absolute;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #e68f79;
    right: 5px;
    top: 5px;
}

.profile {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #56625b;
}

.avatar {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    background: #e9eee9;
    border-radius: 50%;
    color: #4a6956;
    font-size: 14px;
    font-weight: 600;
}

.avatar.large {
    width: 34px;
    height: 34px;
}

.profile img.avatar {
    display: block;
    object-fit: cover;
}

.menu-anchor {
    position: relative;
}

.header-search-wrap {
    display: flex;
    align-items: center;
    position: relative;
    border: 1px solid transparent;
    border-radius: 8px;
    transition: border-color .18s ease, background-color .18s ease, padding .18s ease;
}

.header-search-wrap.expanded {
    background: #f6f8f6;
    border-color: rgb(232, 238, 232);
    padding-left: 10px;
}

.header-search-wrap input {
    width: 190px;
    border: 0 !important;
    outline: 0 !important;
    box-shadow: none !important;
    appearance: none;
    background: transparent;
    font: 12px 'Noto Sans SC', sans-serif;
    color: #526057;
}

.header-search-wrap input:focus,
.header-search-wrap input:focus-visible {
    border: 0 !important;
    outline: 0 !important;
    box-shadow: none !important;
}

.header-popover {
    position: absolute;
    z-index: 22;
    top: calc(100% + 8px);
    right: 0;
    background: #fff;
    border: 1px solid #e9eeea;
    border-radius: 9px;
    box-shadow: 0 12px 35px #26372d1c;
    min-width: 155px;
    padding: 6px;
}

.notifications-popover {
    width: 285px;
    right: -80px;
    padding: 12px;
}

.popover-title {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 3px 10px;
    border-bottom: 1px solid #edf0ed;
    display: flex;
    justify-content: space-between;
}

.popover-title span {
    font-size: 9px;
    color: #78a181;
    font-weight: 400;
}

.mark-read {
    font-size: 9px;
    color: #78a181;
    font-weight: 400;
}

.mark-read:disabled {
    opacity: .5;
    cursor: not-allowed;
}

.notification-status {
    margin: 0;
    padding: 16px 3px 8px;
    font-size: 10px;
    color: #98a39a;
    text-align: center;
}

.notification-status.error {
    color: #b45c4d;
}

.event-row {
    display: flex;
    gap: 9px;
    padding: 11px 3px;
    border-bottom: 1px solid #f1f3f1;
}

.event-row:last-child {
    border-bottom: 0;
}

.event-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-top: 5px;
    flex: 0 0 auto;
}

.event-dot.green {
    background: #79b88a;
}

.event-dot.orange {
    background: #d8a27d;
}

.event-dot.blue {
    background: #8cacc0;
}

.event-row div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.event-row b {
    font-size: 10px;
    font-weight: 500;
    color: #546158;
}

.event-row small {
    font-size: 9px;
    color: #98a39a;
}

.profile-popover {
    width: 225px;
    padding: 7px;
}

.profile-summary {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px;
    border-bottom: 1px solid #edf0ed;
    margin-bottom: 5px;
}

.profile-summary div {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.profile-summary b {
    font-size: 11px;
}

.profile-summary small {
    font-size: 9px;
    color: #96a098;
}

.profile-popover>button {
    width: 100%;
    height: 34px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 9px;
    border-radius: 6px;
    font-size: 10px;
    color: #68756c;
    text-align: left;
}

.profile-popover>button:hover {
    background: #f4f7f4;
}

.profile-popover>button.logout-item {
    border-top: 1px solid #edf0ed;
    margin-top: 5px;
    padding-top: 5px;
    height: 40px;
    color: #b57868;
}

@media(max-width:1000px) {
    .topbar {
        padding: 0 22px;
    }
}

@media(max-width:720px) {
    .topbar {
        height: 58px;
        padding: 0 14px;
    }

    .top-center,
    .brand-divider,
    .brand-cn,
    .profile-name,
    .profile>svg {
        display: none;
    }

    .top-actions {
        gap: 8px;
    }

    .header-search-wrap.expanded input {
        width: 130px;
    }

    .notifications-popover {
        right: -40px;
        width: 270px;
    }

    .profile-popover {
        right: 0;
    }
}
</style>

<script setup lang="ts">
import {
  BookOpen,
  FileText,
  HeartPulse,
  Languages,
  ListMusic,
  MessagesSquare,
  MoreHorizontal,
} from 'lucide-vue-next'
import type { Scene } from '../../composables/useWorkbench'

defineProps<{ scene: Scene }>()
const emit = defineEmits<{ (event: 'change', scene: Scene): void }>()

const tabs = [
  { id: 'medication' as Scene, label: '健康日程', icon: HeartPulse },
  { id: 'sop' as Scene, label: '流程规程', icon: ListMusic },
  { id: 'quiz' as Scene, label: '语言精听', icon: Languages },
  { id: 'memo' as Scene, label: '知识纪要', icon: BookOpen },
  { id: 'interview' as Scene, label: '面试复盘', icon: MessagesSquare },
  { id: 'transcript' as Scene, label: '原文转写', icon: FileText },
]
</script>
<template>
    <div class="scene-tabs"><button v-for="s in tabs" :key="s.id" :class="['scene-tab', { active: scene === s.id }]"
            @click="emit('change', s.id)">
            <component :is="s.icon" :size="15" /><span>{{ s.label }}</span>
        </button><button class="tab-more">
            <MoreHorizontal :size="17" />
        </button></div>
</template>
<style>
.scene-tabs {
    height: 48px;
    display: flex;
    align-items: stretch;
    padding: 0 22px;
    border-bottom: 1px solid #f0f2f0;
    gap: 24px;
    overflow-x: auto;
    scrollbar-width: none;
}

.scene-tabs::-webkit-scrollbar {
    display: none;
}

.scene-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 0 0 auto;
    color: #a1aaa4;
    font-size: 14px;
    padding: 0 1px;
}

.scene-tab.active {
    color: #477d5b;
    font-weight: 600;
}

.scene-tab.active:after {
    content: '';
    position: absolute;
    height: 2px;
    background: #6cad7d;
    bottom: -1px;
    left: 0;
    right: 0;
    border-radius: 2px;
}

.tab-more {
    margin-left: auto;
    color: #a5aea8;
}

@media(max-width:720px) {
    .scene-tabs {
        padding: 0 13px;
        gap: 15px;
        overflow: auto;
    }

    .scene-tab {
        white-space: nowrap;
        font-size: 12px;
    }

    .scene-tab svg {
        display: none;
    }
}
</style>

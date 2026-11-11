<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  FileText,
  Headphones,
  HeartPulse,
  Mic,
  Radio,
  Search,
  Trash2,
} from 'lucide-vue-next'
import type { AudioRecord } from '../../api/audio'
import { KIND_BY_SCENE, sceneForCategory } from '../../utils/scenes'

const props = defineProps<{ search: string; items: AudioRecord[] }>()
const emit = defineEmits<{
  (event: 'open', item: AudioRecord): void
  (event: 'delete', item: AudioRecord): void
  (event: 'update:search', value: string): void
}>()

const KINDS = [
  '全部类型',
  '健康日程',
  '流程规程',
  '语言精听',
  '知识纪要',
  '面试复盘',
  '原文转写',
] as const
type Kind = (typeof KINDS)[number]

const filterOpen = ref(false)
const selectedFilter = ref<Kind>('全部类型')

const iconByScene = {
  medication: HeartPulse,
  sop: Radio,
  quiz: Headphones,
  memo: Mic,
  interview: BriefcaseBusiness,
  transcript: FileText,
}
const toneByScene = {
  medication: 'mint',
  sop: 'orange',
  quiz: 'blue',
  memo: 'purple',
  interview: 'rose',
  transcript: 'slate',
}
const statusLabel: Record<AudioRecord['status'], string> = {
  UPLOADED: '待解析',
  TRANSCRIBING: '转写中',
  PARSED: '已解析',
  FAILED: '解析失败',
}

const visibleItems = computed(() => {
  const term = props.search.trim().toLowerCase()

  return props.items
    .map(item => {
      const scene = sceneForCategory(item.category)
      return {
        ...item,
        scene,
        title: item.originalName,
        meta: `${new Date(item.createdAt).toLocaleString()} · ${statusLabel[item.status]}`,
        kind: item.category ? KIND_BY_SCENE[scene] : '未分类',
      }
    })
    .filter(item => {
      const matchesKind = selectedFilter.value === '全部类型' || item.kind === selectedFilter.value
      const matchesSearch = !term || item.title.toLowerCase().includes(term)
      return matchesKind && matchesSearch
    })
})

function chooseFilter(kind: Kind) {
  selectedFilter.value = kind
  filterOpen.value = false
}

function updateSearch(event: Event) {
  emit('update:search', (event.target as HTMLInputElement).value)
}

function showAll() {
  emit('update:search', '')
  selectedFilter.value = '全部类型'
}
</script>
<template>
  <section class="recent-section">
    <div class="section-heading">
      <div><span class="section-kicker">YOUR WORKSPACE</span>
        <h2>最近的声音</h2>
      </div>
      <div class="section-tools"><label class="filter-search">
          <Search :size="15" /><input :value="search" placeholder="搜索录音..." @input="updateSearch" />
        </label>
        <div class="filter-anchor"><button class="filter-btn" @click="filterOpen = !filterOpen">{{ selectedFilter }}
            <ChevronDown :size="14" />
          </button>
          <div v-if="filterOpen" class="filter-menu"><button v-for="kind in KINDS" :key="kind"
              :class="{ chosen: selectedFilter === kind }" @click="chooseFilter(kind)">{{ kind }}
              <Check v-if="selectedFilter === kind" :size="13" />
            </button></div>
        </div><button class="view-all" @click="showAll">查看全部
          <span>↗</span></button>
      </div>
    </div>
    <div class="recent-grid"><div v-for="item in visibleItems" :key="item.audioId" class="recent-card" role="button"
        tabindex="0" @click="emit('open', item)" @keydown.enter="emit('open', item)"
        @keydown.space.prevent="emit('open', item)"><span :class="['recent-icon', toneByScene[item.scene]]">
          <component :is="iconByScene[item.scene]" :size="20" />
        </span><span class="recent-info"><b>{{ item.title }}</b><small>{{ item.meta }}</small></span><span
          class="recent-type">{{ item.kind }}</span>
        <button class="recent-delete" aria-label="删除录音" title="删除录音" @click.stop="emit('delete', item)"
          @keydown.stop>
          <Trash2 :size="15" />
        </button>
        <ChevronDown class="recent-arrow" :size="17" />
      </div>
      <div v-if="!visibleItems.length" class="empty-results">
        没有找到匹配的录音，请试试其他关键词或类型。</div>
    </div>
  </section>
</template>
<style>
.recent-section {
    position: relative;
    /* Keep this element out of the stacking-context race: .filter-menu's z-index
       must compete with .workbench-card in .workspace, not with the whole card. */
    z-index: auto;
    margin-top: 0;
    margin-bottom: 28px;
}

.section-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 12px;
}

.section-kicker {
    font-size: 10px;
    letter-spacing: 1.25px;
    color: #9aa49d;
    font-weight: 700;
}

.section-heading h2 {
    font-size: 20px;
    letter-spacing: -.4px;
    margin: 4px 0 0;
    font-weight: 600;
}

.section-tools {
    display: flex;
    align-items: center;
    gap: 9px;
}

.filter-search,
.filter-btn {
    height: 31px;
    border: 1px solid #e8ece8;
    background: #fff;
    border-radius: 7px;
    display: flex;
    align-items: center;
    color: #8c968f;
    padding: 0 9px;
    gap: 7px;
    font-size: 10px;
}

.filter-search {
    position: relative;
}

.filter-search input {
    border: 0;
    outline: none;
    width: 125px;
    font: inherit;
    font-size: 12px;
}

.filter-search input::placeholder {
    color: #aab2ad;
}

.filter-btn {
    color: #758078;
    padding: 0 10px;
    font-size: 11px;
}

.view-all {
    font-size: 11px;
    color: #76847a;
    margin-left: 6px;
}

.view-all span {
    color: #56936a;
    margin-left: 4px;
}

.filter-anchor {
    position: relative;
}

.filter-menu {
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

.filter-menu button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    padding: 9px;
    border-radius: 6px;
    font-size: 11px;
    color: #69766d;
}

.filter-menu button:hover,
.filter-menu button.chosen {
    background: #f1f7f2;
    color: #4e855e;
}

.empty-results {
    grid-column: 1/-1;
    padding: 24px;
    background: #fff;
    border: 1px solid #eaeeea;
    border-radius: 9px;
    color: #929d95;
    text-align: center;
    font-size: 12px;
}

.recent-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 13px;
}

.recent-card {
    height: 104px;
    position: relative;
    text-align: left;
    background: #fff;
    border: 1px solid #eaeeea;
    border-radius: 9px;
    display: flex;
    align-items: center;
    align-content: center;
    padding: 16px 17px;
    gap: 10px;
    min-width: 0;
    flex-wrap: wrap;
    cursor: pointer;
    transition: transform .15s, border-color .15s;
}

.recent-card:focus-visible {
    outline: 2px solid #a9cfb3;
    outline-offset: 2px;
}

.recent-card:hover {
    transform: translateY(-2px);
    border-color: #cddfce;
}

.recent-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: 8px;
    display: grid;
    place-items: center;
}

.recent-icon.purple {
    background: #f0edf8;
    color: #8e80b3;
}

.recent-icon.blue {
    background: #edf3f7;
    color: #6e93a8;
}

.recent-icon.orange {
    background: #faf1e9;
    color: #bd9571;
}

.recent-icon.mint {
    background: #edf6ef;
    color: #6a9a76;
}

.recent-icon.rose {
    background: #f8edf1;
    color: #b07d90;
}

.recent-icon.slate {
    background: #eef2f3;
    color: #748a90;
}

.recent-info {
    display: flex;
    flex-direction: column;
    gap: 7px;
    flex: 1;
    min-width: 0;
    align-self: center;
    padding-right: 10px;
}

.recent-info b {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
    white-space: normal;
    max-height: 38px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recent-info small {
    font-size: 12px;
    color: #9ca69e;
}

.recent-info small i {
    font-style: normal;
    margin: 0 4px;
    color: #cbd1cc;
}

.recent-type {
    position: absolute;
    right: 12px;
    top: 10px;
    margin: 0;
    color: grey;
    font-size: 10px;
    padding: 5px 8px;
    border-radius: 4px;
    white-space: nowrap;
}

.recent-delete {
    position: absolute;
    right: 34px;
    bottom: 8px;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    color: #a4afa7;
    background: #f5f8f5;
    opacity: .7;
    transition: opacity .15s, color .15s, background .15s;
}

.recent-card:hover .recent-delete,
.recent-card:focus-within .recent-delete,
.recent-delete:focus-visible {
    opacity: 1;
}

.recent-delete:hover {
    color: #c06552;
    background: #fdf1ed;
}

.recent-arrow {
    position: absolute;
    right: 14px;
    bottom: 13px;
    width: 15px;
    color: #a2ada4;
    transform: rotate(-90deg);
    flex: 0 0 auto;
}

@media(max-width:1050px) {
    .recent-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media(max-width:1000px) {
    .recent-type {
        display: none;
    }
}

@media(max-width:900px) {
    .recent-card {
        padding: 14px;
    }
}

@media(max-width:720px) {
    .section-heading {
        align-items: flex-start;
        gap: 8px;
        flex-direction: column;
    }

    .section-tools {
        width: 100%;
        gap: 5px;
        flex-wrap: wrap;
    }

    .filter-search {
        flex: 1;
        min-width: 130px;
    }

    .filter-search input {
        width: 100%;
        min-width: 30px;
    }

    .view-all {
        margin-left: auto;
    }

    .recent-grid {
        grid-template-columns: 1fr;
    }

    .recent-card {
        height: 84px;
        align-items: center;
        align-content: center;
        padding: 14px 13px;
    }

    .recent-info b {
        font-size: 14px;
    }

    .recent-info small {
        font-size: 11px;
    }

    .recent-type {
        top: 8px;
        right: 8px;
    }

    .section-heading h2 {
        font-size: 16px;
    }
}
</style>

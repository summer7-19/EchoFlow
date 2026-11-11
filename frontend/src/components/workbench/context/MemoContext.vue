<script setup lang="ts">
import { computed } from 'vue'
import type { MemoPayload, MindmapNode } from '../../../types/scenes'

const props = defineProps<{ payload: MemoPayload }>()

const nodeClasses = ['mint-node', 'peach-node', 'lilac-node']

function isNode(value: unknown): value is MindmapNode {
  return typeof value === 'object' && value !== null && typeof (value as MindmapNode).name === 'string'
}

function childrenOf(node: MindmapNode): MindmapNode[] {
  return (node.children ?? []).filter(isNode)
}

const root = computed(() => props.payload.mindmap?.name ?? props.payload.title)
const branches = computed<MindmapNode[]>(() => {
  const nodes = (props.payload.mindmap?.children ?? []).filter(isNode)
  if (nodes.length) return nodes.slice(0, 3)
  return props.payload.bullets.slice(0, 3).map(bullet => ({ name: bullet, children: [] }))
})

function nodeClass(index: number) {
  return nodeClasses[index % nodeClasses.length]
}
</script>
<template>
  <div class="memo-context">
    <div class="mindmap">
      <div class="map-root">{{ root }}</div>
      <div class="map-branches">
        <div v-for="(branch, index) in branches" :key="`${index}-${branch.name}`" class="map-branch"><span
            :class="['branch-node', nodeClass(index)]">{{ branch.name }}</span><template
            v-for="(child, childIndex) in childrenOf(branch).slice(0, 2)"
            :key="`${childIndex}-${child.name}`"><i></i><span>{{ child.name }}</span></template></div>
      </div>
      <p v-if="!branches.length" class="mindmap-empty">未生成主题脉络。</p>
    </div>
    <div class="tag-section"><span class="tiny-label">行动事项</span>
      <div class="tag-cloud"><span v-for="(action, index) in payload.actions" :key="`${index}-${action.title}`">{{ action.title }}</span></div>
      <p v-if="!payload.actions.length" class="mindmap-empty">未提取到行动事项。</p>
    </div>
  </div>
</template>
<style>
.mindmap {
    margin-top: 19px;
    padding: 15px 8px 18px;
    background: #fbfcfb;
    border: 1px solid #edf1ed;
    border-radius: 8px;
}

.map-root {
    background: #eaf4ec;
    color: #578364;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    border-radius: 6px;
    padding: 10px;
    margin: 0 auto 16px;
    width: 124px;
    position: relative;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.map-root:after {
    content: '';
    height: 15px;
    border-left: 1px solid #dce7de;
    position: absolute;
    left: 50%;
    top: 100%;
}

.map-branches {
    display: flex;
    gap: 5px;
    justify-content: space-around;
}

.map-branch {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 7px;
    position: relative;
    min-width: 70px;
}

.map-branch:before {
    content: '';
    height: 8px;
    border-left: 1px solid #e0e8e0;
    position: absolute;
    top: -8px;
}

.branch-node,
.map-branch>span:not(.branch-node) {
    font-size: 9px;
    padding: 7px 5px;
    border-radius: 4px;
    text-align: center;
    width: 100%;
    color: #77847a;
    background: #fff;
    border: 1px solid #eff2ef;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.branch-node {
    font-weight: 600;
}

.mint-node {
    background: #eff7f0;
    color: #5f9168;
    border-color: #e4f0e5;
}

.peach-node {
    background: #fbf3ec;
    color: #ac886e;
    border-color: #f4e9df;
}

.lilac-node {
    background: #f2f0f8;
    color: #8679a8;
    border-color: #eae7f2;
}

.map-branch i {
    height: 7px;
    border-left: 1px solid #e0e8e0;
    margin-top: -6px;
    margin-bottom: -6px;
}

.mindmap-empty {
    font-size: 10px;
    color: #9aa59d;
    text-align: center;
    margin: 8px 0 0;
}

.tag-section {
    margin-top: 18px;
}

.tag-section .tiny-label {
    font-size: 13px;
}

.tag-cloud {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.tag-cloud span {
    font-size: 10px;
    color: #7a8c7d;
    background: #f1f6f1;
    border-radius: 4px;
    padding: 5px 7px;
}
</style>

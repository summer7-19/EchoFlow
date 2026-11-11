<script setup lang="ts">
import type { MemoPayload } from '../../types/scenes'

defineProps<{
  payload: MemoPayload
  checked: boolean[]
}>()
const emit = defineEmits<{
  (event: 'toggleTodo', index: number, value: boolean): void
}>()

function formatDue(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}
</script><template>
    <div class="scene-content alternative-scene memo-scene">
        <div class="memo-lead"><span class="tiny-label">KNOWLEDGE MEMO</span>
            <h3>{{ payload.title }}</h3>
            <p>{{ payload.summary }}</p>
        </div>
        <div class="memo-section">
            <h4><span>01</span> 讨论要点</h4>
            <ul v-if="payload.bullets.length" class="memo-bullets">
                <li v-for="(bullet, index) in payload.bullets" :key="`${index}-${bullet}`">{{ bullet }}</li>
            </ul>
            <p v-else>未提取到讨论要点。</p>
        </div>
        <div class="memo-section">
            <h4><span>02</span> 行动事项 <small>{{ payload.actions.length }} 项</small></h4>
            <template v-if="payload.actions.length">
                <label v-for="(action, index) in payload.actions" :key="`${index}-${action.title}`" class="todo-row"><input
                        type="checkbox" :checked="checked[index]"
                        @change="emit('toggleTodo', index, ($event.target as HTMLInputElement).checked)" /><span>{{ action.title }}</span><small>{{ formatDue(action.dueAt) }}</small></label>
            </template>
            <p v-else>未提取到行动事项。</p>
        </div>
    </div>
</template>
<style>
.memo-lead {
    padding: 8px 0 18px;
    border-bottom: 1px solid #edf0ed;
}

.memo-lead h3 {
    font-size: 19px;
    letter-spacing: -.4px;
    margin: 9px 0;
}

.memo-lead p,
.memo-section>p {
    font-size: 10px;
    color: #77847a;
    line-height: 1.8;
    max-width: 570px;
    margin: 0;
}

.memo-section {
    padding: 16px 0;
    border-bottom: 1px solid #edf0ed;
}

.memo-section h4 {
    font-size: 11px;
    margin: 0 0 9px;
}

.memo-section h4>span {
    font: 10px Manrope, sans-serif;
    color: #70a37c;
    margin-right: 6px;
}

.memo-section h4 small {
    font-size: 8px;
    font-weight: 400;
    color: #9da69f;
    margin-left: 5px;
}

.memo-bullets {
    margin: 0;
    padding-left: 16px;
    color: #77847a;
    font-size: 10px;
    line-height: 1.9;
}

.memo-bullets li::marker {
    color: #83b18e;
}

.todo-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px;
    background: #fafbfa;
    border-radius: 6px;
    margin-top: 7px;
    font-size: 9px;
    color: #66736a;
}

.todo-row input {
    accent-color: #65a477;
}

.todo-row small {
    margin-left: auto;
    font-size: 8px;
    color: #9ca59e;
}
</style>

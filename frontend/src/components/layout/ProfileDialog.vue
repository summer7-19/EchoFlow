<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'
import { ref } from 'vue'
import { changePassword, updateProfile } from '../../api/auth'
import type { AuthUser } from '../../api/client'

const props = defineProps<{ mode: 'avatar' | 'password'; user?: AuthUser }>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'user-updated', user: AuthUser): void
}>()

const avatarUrl = ref(props.user?.avatarUrl || '')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const saving = ref(false)

function handleAvatarFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = '图片大小不能超过 5MB'
    input.value = ''
    return
  }

  error.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    avatarUrl.value = typeof reader.result === 'string' ? reader.result : ''
  }
  reader.readAsDataURL(file)
}

async function saveAvatar() {
  error.value = ''
  saving.value = true
  try {
    const result = await updateProfile({ avatarUrl: avatarUrl.value.trim() || null })
    emit('user-updated', result.user)
    emit('close')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '头像更新失败'
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致'
    return
  }

  saving.value = true
  try {
    await changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    emit('close')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '密码修改失败'
  } finally {
    saving.value = false
  }
}

function submit() {
  if (props.mode === 'avatar') void saveAvatar()
  else void savePassword()
}
</script>
<template>
  <div class="profile-dialog-backdrop" @click.self="emit('close')">
    <section class="profile-dialog"><button class="dialog-close" @click="emit('close')">×</button>
      <h2>{{ mode === 'avatar' ? '修改头像' : '修改密码' }}</h2>
      <form @submit.prevent="submit">
        <template v-if="mode === 'avatar'">
          <label class="avatar-upload">头像图片文件<input type="file" accept="image/*" @change="handleAvatarFile" /><span
              class="upload-button"><ImagePlus :size="16" /> 选择图片</span></label>
          <small>支持 JPG、PNG、GIF，最大 5MB。</small>
          <img v-if="avatarUrl" class="avatar-preview" :src="avatarUrl" alt="头像预览"
            @error="error = '无法加载该图片，请检查链接'" />
        </template>
        <template v-else>
          <label>当前密码<input v-model="currentPassword" type="password" minlength="8" required /></label>
          <label>新密码<input v-model="newPassword" type="password" minlength="8" required /></label>
          <label>确认新密码<input v-model="confirmPassword" type="password" minlength="8" required /></label>
        </template>
        <p v-if="error" class="auth-error">{{ error }}</p>
        <button class="auth-submit" :disabled="saving">{{ saving ? '保存中…' : '保存修改' }}</button>
      </form>
    </section>
  </div>
</template>
<style>
.profile-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 20px;
    background: #18231d66;
}

.profile-dialog {
    position: relative;
    width: min(100%, 420px);
    padding: 28px;
    border: 1px solid #e6ece6;
    border-radius: 14px;
    background: white;
    box-shadow: 0 22px 70px #18231d33;
}

.profile-dialog h2 {
    margin: 0 0 22px;
    color: #26372d;
    font-size: 20px;
}

.profile-dialog form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.profile-dialog label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: #647268;
    font-size: 13px;
}

.profile-dialog input {
    height: 42px;
    padding: 0 11px;
    border: 1px solid #dfe7df;
    border-radius: 7px;
    outline: none;
}

.profile-dialog label small {
    color: #929d95;
}

.dialog-close {
    position: absolute;
    top: 12px;
    right: 15px;
    color: #7a877e;
    font-size: 24px;
}

.avatar-upload {
    position: relative;
    display: block;
}

.avatar-upload input[type='file'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    pointer-events: auto;
    cursor: pointer;
}

.upload-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    padding: 9px 13px;
    border: 1px solid #dce8dd;
    border-radius: 7px;
    background: #f5faf5;
    color: #568563;
    cursor: pointer;
    font-size: 12px;
}

.upload-button:hover {
    background: #eaf4eb;
}

.avatar-preview {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
}
</style>

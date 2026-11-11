<script setup lang="ts">
import { computed } from 'vue'
import { AudioLines, Sparkles, Waves } from 'lucide-vue-next'

type AuthMode = 'login' | 'register' | 'forgot'

defineProps<{
  captchaImage: string
  error?: string
  loading?: boolean
  notice?: string
}>()
const emit = defineEmits<{
  (event: 'submit'): void
  (event: 'request-code'): void
  (event: 'refresh-captcha'): void
}>()

const mode = defineModel<AuthMode>('mode', { required: true })
const email = defineModel<string>('email', { default: '' })
const account = defineModel<string>('account', { default: '' })
const password = defineModel<string>('password', { default: '' })
const displayName = defineModel<string>('displayName', { default: '' })
const code = defineModel<string>('code', { default: '' })
const captchaCode = defineModel<string>('captchaCode', { default: '' })

const COPY: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
  login: {
    title: '欢迎回来',
    subtitle: '登录后继续整理那些重要的声音。',
    submit: '登录工作台',
  },
  register: {
    title: '开启你的 EchoFlow',
    subtitle: '创建账户，让每一段声音都有迹可循。',
    submit: '创建账户',
  },
  forgot: {
    title: '重置登录密码',
    subtitle: '通过邮箱验证码验证身份并设置新密码。',
    submit: '确认重置密码',
  },
}

const copy = computed(() => COPY[mode.value])

function switchMode(next: AuthMode) {
  mode.value = next
}
</script>
<template>
    <div class="auth-overlay">
        <div class="auth-card">
            <div class="auth-brand"><span class="brand-mark">
                    <AudioLines :size="19" />
                </span><span class="brand-name">echo<span>flow</span></span><span class="brand-cn">声流时空</span></div>
            <div class="auth-intro"><span class="tiny-label">YOUR VOICE, IN FLOW</span>
                <h1>{{ copy.title }}</h1>
                <p>{{ copy.subtitle }}</p>
            </div>
            <form class="auth-form" @submit.prevent="emit('submit')">
                <label v-if="mode === 'register'">用户名
                    <input v-model="displayName" type="text" placeholder="请输入用户名" maxlength="80" required />
                </label>
                <label v-if="mode === 'login'">邮箱或用户名
                    <input v-model="account" type="text" placeholder="邮箱或用户名" required />
                </label>
                <label v-else>邮箱地址
                    <input v-model="email" type="email" placeholder="name@example.com" required />
                </label>
                <label v-if="mode !== 'forgot'">密码
                    <input v-model="password" type="password" placeholder="至少 8 位字符" minlength="8" required />
                </label>
                <label v-if="mode === 'login'" class="captcha-label">图形验证码
                    <div class="captcha-row">
                        <img :src="captchaImage" alt="图形验证码，点击刷新" @click="emit('refresh-captcha')" />
                        <input v-model="captchaCode" type="text" maxlength="5" placeholder="输入验证码" required />
                    </div>
                </label>
                <label v-if="mode === 'forgot'">邮箱验证码
                    <div class="code-row">
                        <input v-model="code" inputmode="numeric" maxlength="6" placeholder="6 位验证码" required />
                        <button type="button" :disabled="loading" @click="emit('request-code')">发送验证码</button>
                    </div>
                </label>
                <label v-if="mode === 'forgot'">新密码
                    <input v-model="password" type="password" minlength="8" placeholder="至少 8 位字符" required />
                </label>
                <button class="auth-submit" type="submit" :disabled="loading">{{ loading ? '正在处理…' : copy.submit }}
                    <span>→</span></button>
            </form>
            <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
            <p v-if="notice" class="auth-notice">{{ notice }}</p>
            <div v-if="mode === 'login'" class="auth-switch">还没有账户？
                <button type="button" @click="switchMode('register')">立即注册</button><span
                    class="auth-switch-divider">·</span><button type="button"
                    @click="switchMode('forgot')">忘记密码</button>
            </div>
            <div v-else class="auth-switch">{{ mode === 'register' ? '已经有账户？' : '想起密码了？' }}
                <button type="button" @click="switchMode('login')">返回登录</button>
            </div>
            <div class="auth-safe">
                <Sparkles :size="13" /> 你的录音与个人数据均经过加密保护
            </div>
        </div>
        <div class="auth-aside">
            <div class="auth-art">
                <div class="art-orbit orbit-one"></div>
                <div class="art-orbit orbit-two"></div>
                <div class="art-center">
                    <AudioLines :size="48" />
                </div><span class="art-note note-one">想法 · 线索 · 行动</span><span class="art-note note-two">录音片段 · 01:24
                    <Waves :size="14" />
                </span>
            </div>
            <p>把稍纵即逝的声音，<br />变成清晰可循的下一步。</p>
        </div>
    </div>
</template>
<style>
.auth-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: #f6f8f5;
    display: grid;
    grid-template-columns: minmax(400px, 520px) minmax(400px, 1fr);
    align-items: center;
    justify-content: center;
    padding: 5vh 8vw;
}

.auth-card {
    max-width: 410px;
    width: 100%;
    justify-self: center;
}

.auth-brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.auth-brand .brand-cn {
    display: inline;
    border-left: 1px solid #dce4dd;
    padding-left: 11px;
}

.auth-intro {
    margin: 66px 0 28px;
}

.auth-intro h1 {
    font-size: 32px;
    margin: 11px 0 8px;
    letter-spacing: -1px;
}

.auth-intro p {
    font-size: 14px;
    color: #89958c;
    margin: 0;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 17px;
}

.auth-form label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: #647268;
}

.auth-form input {
    height: 44px;
    border: 1px solid #e1e8e1;
    border-radius: 7px;
    background: #fff;
    padding: 0 12px;
    font: 13px 'Noto Sans SC', sans-serif;
    outline: none;
}

.auth-form input:focus {
    border-color: #83b38d;
    box-shadow: 0 0 0 3px #eaf4ec;
}

.auth-submit span {
    margin-left: 9px;
}

.auth-switch {
    text-align: center;
    color: #89948c;
    font-size: 11px;
    margin-top: 18px;
}

.auth-switch button {
    color: #548b62;
    font-size: 11px;
    margin-left: 4px;
}

.code-row {
    display: flex;
    gap: 8px;
}

.code-row input {
    flex: 1;
    min-width: 0;
}

.code-row button {
    padding: 0 12px;
    border: 1px solid #dce6dd;
    border-radius: 7px;
    color: #477b56;
    white-space: nowrap;
}

.captcha-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.captcha-row img {
    width: 132px;
    height: 45px;
    border: 1px solid #dfe8df;
    border-radius: 7px;
    cursor: pointer;
    object-fit: cover;
}

.captcha-row input {
    flex: 1;
    min-width: 0;
}

.auth-safe {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #a0aaa2;
    font-size: 10px;
    margin-top: 45px;
}

.auth-safe svg {
    color: #77a981;
}

.auth-aside {
    height: min(620px, 76vh);
    border-radius: 24px;
    background: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.auth-art {
    width: 390px;
    height: 350px;
    position: relative;
    display: grid;
    place-items: center;
    perspective: 900px;
    transform-style: preserve-3d;
}

.art-orbit {
    position: absolute;
    border: 1px solid #a9c9ad;
    border-radius: 50%;
    transform-origin: 50% 50%;
    transform-style: preserve-3d;
    will-change: transform;
    box-shadow: inset 0 0 14px #76a67f12, 0 0 12px #76a67f0d;
}

.orbit-one {
    width: 360px;
    height: 200px;
    border-color: #9fc5a6;
    border-width: 1px 2px 1px 1px;
    animation: auth-orbit-one 9s linear infinite;
}

.orbit-two {
    width: 400px;
    height: 360px;
    border-color: #bcd2bf;
    border-style: dashed;
    border-width: 1px 1px 2px;
    animation: auth-orbit-two 13s linear infinite reverse;
}

.art-center {
    height: 96px;
    width: 96px;
    border-radius: 28px;
    background: #3d7953;
    color: white;
    display: grid;
    place-items: center;
    box-shadow: 0 15px 35px #3c795344;
    position: relative;
    animation: auth-center-breathe 2.4s ease-in-out infinite;
    z-index: 2;
    transform: translateZ(22px);
}

.art-center svg {
    animation: auth-waveform 1.15s ease-in-out infinite;
    transform-origin: 50% 50%;
}

.art-center::after {
    content: '';
    position: absolute;
    inset: 13px;
    border: 1px solid #ffffff55;
    border-radius: 21px;
    animation: auth-wave-ring 1.8s ease-out infinite;
}

@keyframes auth-orbit-one {
    0% {
        transform: rotateX(61deg) rotateY(-18deg) rotateZ(0deg);
    }

    25% {
        transform: rotateX(61deg) rotateY(18deg) rotateZ(90deg);
    }

    50% {
        transform: rotateX(61deg) rotateY(-18deg) rotateZ(180deg);
    }

    75% {
        transform: rotateX(61deg) rotateY(18deg) rotateZ(270deg);
    }

    100% {
        transform: rotateX(61deg) rotateY(-18deg) rotateZ(360deg);
    }
}

@keyframes auth-orbit-two {
    0% {
        transform: rotateY(82deg) rotateX(22deg) rotateZ(0deg);
    }

    25% {
        transform: rotateY(82deg) rotateX(-22deg) rotateZ(90deg);
    }

    50% {
        transform: rotateY(82deg) rotateX(22deg) rotateZ(180deg);
    }

    75% {
        transform: rotateY(82deg) rotateX(-22deg) rotateZ(270deg);
    }

    100% {
        transform: rotateY(82deg) rotateX(22deg) rotateZ(360deg);
    }
}

@keyframes auth-waveform {

    0%,
    100% {
        transform: scaleY(.72) scaleX(.92);
    }

    25% {
        transform: scaleY(1.12) scaleX(1.04);
    }

    50% {
        transform: scaleY(.82) scaleX(.96);
    }

    75% {
        transform: scaleY(1.2) scaleX(1.02);
    }
}

@keyframes auth-wave-ring {
    0% {
        opacity: .65;
        transform: scale(.72);
    }

    100% {
        opacity: 0;
        transform: scale(1.18);
    }
}

@keyframes auth-center-breathe {

    0%,
    100% {
        box-shadow: 0 15px 35px #3c795344;
    }

    50% {
        box-shadow: 0 18px 42px #3c795366;
    }
}

@media (prefers-reduced-motion: reduce) {

    .art-orbit,
    .art-center,
    .art-center svg,
    .art-center::after {
        animation: none;
    }
}

.art-note {
    position: absolute;
    background: #ffffffcc;
    border: 1px solid #e4ece4;
    padding: 9px 13px;
    border-radius: 8px;
    font-size: 10px;
    color: #66806b;
    box-shadow: 0 5px 15px #35513b0d;
}

.note-one {
    top: 36px;
    right: 4px;
}

.note-two {
    bottom: 31px;
    left: 0;
    display: flex;
    align-items: center;
    gap: 7px;
}

.auth-aside>p {
    font-size: 17px;
    line-height: 1.8;
    text-align: center;
    color: #607365;
    margin-top: 25px;
}

@media(max-width:900px) {
    .auth-overlay {
        padding: 4vh 5vw;
        grid-template-columns: 1fr;
    }

    .auth-aside {
        display: none;
    }

    .auth-card {
        max-width: 430px;
    }

    .auth-intro {
        margin-top: 55px;
    }
}

@media(max-width:720px) {
    .auth-overlay {
        padding: 20px;
    }

    .auth-intro h1 {
        font-size: 27px;
    }

    .auth-safe {
        margin-top: 30px;
    }
}
</style>

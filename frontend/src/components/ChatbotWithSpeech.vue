<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
// @ts-ignore: PNG import for mascot image
import lionMascot from '@/assets/lionmascot.png'

const API_BASE = import.meta.env.VITE_API_URL || '';

interface ChatMessage {
  sender: 'user' | 'bot'
  text: string
}

const emit = defineEmits<{ 
  (e: 'add-task', task: string): void
  (e: 'remove-task', taskName: string): void
}>()

const chat = ref<ChatMessage[]>([
  { sender: 'bot', text: "Hi! I'm Leo the Lion. You can speak to me or type your tasks. Try saying 'add task' followed by what you need to do!" }
])
const taskInput = ref('')
const recognizing = ref(false)
let recognition: any = null

const chatContainer = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// call the backend claude endpoint
async function getClaudeReply(userText: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText })
    });
    const data = await response.json();
    console.log("Claude API response received in frontend:", data); 

    // Extract the text content from the Claude response structure
    // It's nested under 'content' array, then the first element, then 'text' property
    if (data && typeof data.reply === 'string') { // Check if 'data' has a 'reply' property and it's a string
      return data.reply; // Return the string that contains the JSON action
    } else {
      
      console.error("Failed to parse Claude response from backend (expected 'reply' property):", data);
      return 'Sorry, I could not parse the response from Claude.';
    }

  } catch (err) {
    console.error("Error fetching Claude reply:", err); 
    return 'Sorry, there was an error connecting to the AI.';
  }
}

// Update sendMessage to use Claude for general chat
async function sendMessage(text: string) {
  if (!text.trim()) return;
  chat.value.push({ sender: 'user', text });
  scrollToBottom();

  chat.value.push({ sender: 'bot', text: 'Thinking...' });
  scrollToBottom();
  const aiReply = await getClaudeReply(text);
  chat.value.pop();

  // Try to parse as JSON for task actions
  let parsed;
  try {
    parsed = JSON.parse(aiReply);
    if (parsed.action === 'add_task' && parsed.task) {
      emit('add-task', parsed.task);
      chat.value.push({ sender: 'bot', text: `Task added: ${parsed.task}` });
      scrollToBottom();
      return;
    } else if (parsed.action === 'remove_task' && parsed.task) {
      emit('remove-task', parsed.task);
      chat.value.push({ sender: 'bot', text: `Task removed: ${parsed.task}` });
      scrollToBottom();
      return;
    }
  } catch (e) {
    // Not a JSON, just show as normal reply
  }
  chat.value.push({ sender: 'bot', text: aiReply });
  scrollToBottom();
}

function submitTask() {
  if (taskInput.value.trim()) {
    sendMessage(taskInput.value.trim())
    taskInput.value = ''
  }
}

function startSpeech() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Speech recognition not supported in this browser. Please use Chrome or Edge.')
    return
  }
  if (!recognition) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      sendMessage(transcript)
      taskInput.value = ''
      recognizing.value = false
    }
    recognition.onerror = () => {
      recognizing.value = false
    }
    recognition.onend = () => {
      recognizing.value = false
    }
  }
  recognizing.value = true
  recognition.start()
}
</script>

<template>
  <div class="flex items-start w-full max-w-xl">
    <!-- Lion Mascot (Desktop Only) -->
    <img
      :src="lionMascot"
      alt="Lion mascot assistant"
      class="hidden md:block w-20 h-20 object-contain mr-4 mt-6 drop-shadow-lg select-none"
      draggable="false"
    />
    
    <!-- Main Chat Interface -->
    <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 h-[30rem] w-full transform transition-all duration-300 hover:shadow-xl">
      <h2 class="text-xl font-semibold mb-2 animate-fade-in">Voice Assistant</h2>
      
      <!-- Chat Messages Container -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto space-y-2 px-1" style="scroll-behavior: smooth;">
        <div v-for="(msg, idx) in chat" :key="idx" class="flex animate-message-in" :class="msg.sender === 'user' ? 'justify-end' : 'justify-start'">
          <div :class="[
            'px-4 py-2 rounded-lg max-w-[80%] whitespace-pre-line text-base transform transition-all duration-300',
            msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none hover:scale-105' : 'bg-gray-100 text-gray-800 rounded-bl-none hover:scale-105'
          ]">
            {{ msg.text }}
          </div>
        </div>
      </div>

      <!-- Speech Recognition Button -->
      <div class="flex flex-col items-center gap-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200 transform transition-all duration-300 hover:bg-blue-100 hover:border-blue-300">
        <button 
          @click="startSpeech" 
          :disabled="recognizing"
          class="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 flex items-center justify-center text-white text-2xl shadow-lg transition-all duration-300 transform hover:scale-110 disabled:transform-none focus:outline-none focus:ring-4 focus:ring-red-300"
          :class="{ 'animate-pulse': recognizing }"
        >
          <span v-if="!recognizing">🎤</span>
          <span v-else class="text-3xl">🔴</span>
        </button>
        <div class="text-center">
          <p class="text-base font-semibold text-gray-800 transition-colors duration-300">
            {{ recognizing ? 'Listening...' : 'Tap to Speak' }}
          </p>
          <p class="text-xs text-gray-600 mt-1 transition-colors duration-300">
            {{ recognizing ? 'Speak clearly now' : 'e.g. Say "add task" followed by what you need to do' }}
          </p>
        </div>
      </div>
      
      <!-- Text Input Form -->
      <form @submit.prevent="submitTask" class="flex gap-2 pt-2">
        <Input v-model="taskInput" placeholder="Or type here..." class="flex-1 text-base transition-all duration-300 focus:ring-2 focus:ring-blue-300" @keydown.enter.exact.prevent="submitTask" />
        <Button type="submit" class="text-base px-4 transition-all duration-300 hover:scale-105">Send</Button>
      </form>
      <p class="text-sm text-muted-foreground text-center">💡 Tip: Speaking is often easier than typing!</p>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 3s ease-in-out infinite;
}

.animate-message-in {
  animation: message-in 0.5s ease-out forwards;
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out forwards;
}

/* Smooth scrolling for chat container */
.overflow-y-auto {
  scroll-behavior: smooth;
}

/* Custom focus styles */
button:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
}
</style> 
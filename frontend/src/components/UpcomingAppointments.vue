<script lang="ts">
import { onMounted, ref,computed } from 'vue'
import { format } from 'date-fns'

const events = ref<any[]>([])

export default {
  setup() {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const events = ref<any[]>([])

    function isToday(date: Date) {
    const today = new Date()
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    )
    }

    const todayEvents = computed(() =>
    events.value.filter(event => (isToday(new Date(event.start)) && (event.category == "Appointments")))
    )

    async function retrieveEvents() {
      const email = localStorage.getItem("email");

      const response = await fetch(`${API_BASE}/api/calendar/all?email=${email}`, {
        method: 'GET',
        headers: {
          'Content-type': 'application/json'
        }
      })
      const json = await response.json()
      const formattedEvents = []

      for (const dept of json) {
        const e: any = {}
        const start = new Date(dept.start)
        const end = new Date(dept.end)

        e.id = parseInt(dept.event_id)
        e.title = dept.title
        e.start = start
        e.end = end
        e.formattedDate = start.toLocaleString() + ' - ' + end.toLocaleString()
        e.location = dept.location
        e.description = dept.description
        e.category = dept.category

        formattedEvents.push(e)
      }

      events.value = formattedEvents
    }

    onMounted(() => {
      retrieveEvents()
    })

    return {
      events,
      todayEvents,
    }
  }
}

</script>



<template>
  <div class="w-full max-w-5xl bg-white rounded-xl shadow-lg p-8 mb-8">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Today's Appointments</h2>

    <div v-if="todayEvents.length === 0">No appointments today.</div>

    <div
      v-for="event in todayEvents"
      :key="event.id"
      class="w-full max-w-5xl bg-gray-50 rounded-xl p-8 mb-3 event-card"
    >
      <p><strong>Title:</strong> {{ event.title }}</p>
      <p><strong>Date and time:</strong> {{ event.start.toLocaleString() }}</p>
      <p v-if="event.location"><strong>Location:</strong> {{ event.location }}</p>
      <p v-if="event.description"><strong>Description:</strong> {{ event.description }}</p>
    </div>
  </div>
</template>







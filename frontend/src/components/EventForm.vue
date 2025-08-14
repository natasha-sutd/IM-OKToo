<script setup lang="ts">
import EventTitle from './CreateEvent/EventTitle.vue'
import EventDateTimeRange from './CreateEvent/EventDateTimeRange.vue'
import EventElderly from './CreateEvent/EventElderly.vue'
import EventLocation from './CreateEvent/EventLocation.vue'
import EventDescription from './CreateEvent/EventDescription.vue'
import EventRecurrence from './CreateEvent/EventRecurrence.vue'
import EventCategory from './CreateEvent/EventCategory.vue'
import EventGuest from './CreateEvent/EventGuest.vue'

import { Button } from "./ui/button"
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useRouter } from 'vue-router'

const API_BASE = import.meta.env.VITE_API_URL || '';
const router = useRouter()

const d = new Date()
let year = d.getFullYear();

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const formSchema = toTypedSchema(z.object({
  title: z.string(),
  category: z.string(),
  elderly: z.string(),
  startDate: z.object({
    era: z.literal("AD"),
    year: z.coerce.number().int().min(year),
    month: z.coerce.number().int(),
    day: z.coerce.number().int(),
  }).refine(
    ({ year, month, day }) => {
      const inputDate = new Date(year, month - 1, day);
      return inputDate >= getToday();
    },
    { message: "Start date cannot be in the past" }
  ),
  startTime: z.string(),
  endDate: z.object({
    era: z.literal("AD"),
    year: z.coerce.number().int().min(year),
    month: z.coerce.number().int(),
    day: z.coerce.number().int(),
  }).refine(
    ({ year, month, day }) => {
      const inputDate = new Date(year, month - 1, day);
      return inputDate >= getToday();
    },
    { message: "End date cannot be in the past" }
  ),
  endTime: z.string(),
  guests: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  recurrence: z.string().optional(),
}).superRefine((data, ctx) => {
  const start = new Date(data.startDate.year, data.startDate.month - 1, data.startDate.day)
  const end = new Date(data.endDate.year, data.endDate.month - 1, data.endDate.day)
  const startTime = data.startTime
  const endTime = data.endTime
  const guests = data.guests

  if (!data.startDate || !data.endDate) return

  // 1. End date must not be before start date
  if (end < start) {
    ctx.addIssue({
      code: "custom",
      path: ['endDate'],
      message: 'End date must not be before start date',
    })
  }

  // 2. If same day, end time must not be before start time
  if (
    start.toDateString() === end.toDateString() &&
    startTime &&
    endTime &&
    endTime <= startTime
  ) {
    ctx.addIssue({
      code: "custom",
      path: ['endDate'],
      message: 'End time must not be equal or before start time',
    })
  }

  // 3. Check that the emails in guests are valid if provided
  if (guests && guests.trim().length > 0) {
    const emails = guests.split(',').map(e => e.trim());
    const invalids = emails.filter(email => !z.string().email().safeParse(email).success);

    if (invalids.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["guests"],
        message: 'Emails provided are invalid',
      })
    }
  }

}))

const form = useForm({
  validationSchema: formSchema,
})

const onSubmit = form.handleSubmit(async (values) => {
  console.log('onSubmit called', values);
  
  const email = localStorage.getItem('email')
  const caretaker = localStorage.getItem('username')
  
  const payload = {
    ...values,
    email,
    caretaker
  }
  const response = await fetch(`${API_BASE}/api/calendar/add`,
  {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
          'Content-type': 'application/json'
      }              
  });

  if (response.ok) {
    window.location.reload();
  }
  else
  {
    alert("Event creation had failed!");
  }

})

</script>

<template>
    <div class="w-full max-w-5xl bg-white rounded-xl shadow-lg p-8">
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Create Event</h2>
        <form @submit.prevent="onSubmit" class="space-y-6">
        <EventTitle/>
        <EventCategory/>
        <EventElderly/>
        <EventDateTimeRange/>
        <EventGuest/>
        <EventLocation/>
        <EventDescription/>
        <EventRecurrence/>

        <Button type="submit" class="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition">
            Create Event
        </Button>
        </form>
    </div>
</template>
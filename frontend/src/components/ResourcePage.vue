<template>
  <div class="resource-header">
    <img src="@/assets/resource_lion.png" alt="Resource Lion Mascot" class="lion-mascot" />
    <div class="header-text">
      <h1>Resources & Support</h1>
      <p>Find the latest help, news, and ways to contact us!</p>
    </div>
  </div>

  <div class="card-list">
    <!-- Link cards + fetched titles -->
    <div class="resource-card" v-for="(link, i) in links" :key="'link-' + i">
      <h2>{{ link.title }}</h2>
      <a :href="link.url" target="_blank" rel="noopener">Visit</a>

      <template v-if="link.loading">
        <p>Loading titles…</p>
      </template>
      <template v-else-if="link.titles.length">
        <ul>
          <li v-for="(t, j) in link.titles" :key="`t-${i}-${j}`">{{ t }}</li>
        </ul>
      </template>
      <template v-else>
        <p>No titles found.</p>
      </template>
    </div>

    <!-- Static news -->
    <div class="resource-card" v-for="(news, i) in newsList" :key="'news-' + i">
      <h2>News & Updates</h2>
      <p>{{ news }}</p>
    </div>

    <!-- Contact -->
    <div class="resource-card contact-card" key="contact">
      <h2>Contact Us</h2>
      <p>Facebook: <a href="https://www.facebook.com/lionsbefrienders/" target="_blank" rel="noopener">Facebook</a></p>
      <p>Phone: <a href="tel:+6512345678">+65 12345678</a></p>
      <p>Or use our <a href="https://www.lionsbefrienders.org.sg/enquiry/" target="_blank" rel="noopener">contact form</a>.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || '';

type LinkItem = {
  title: string
  url: string
  titles: string[]
  loading: boolean
}

// Use ref and reactive array
const links = ref<LinkItem[]>([
  { title: 'Government Resources', url: 'https://www.moh.gov.sg/managing-expenses/keeping-healthcare-affordable/help-for-caregiver', titles: [], loading: true },
  { title: 'Latest Events', url: 'https://www.lionsbefrienders.org.sg/workshops-and-trainings/', titles: [], loading: true },
  { title: 'Mental Health Resources', url: 'https://www.lionsbefrienders.org.sg/refer-a-senior/', titles: [], loading: true },
  { title: 'CNA news on caregivers', url: 'https://www.channelnewsasia.com/topic/caregiver', titles: [], loading: true },
])

const newsList = ref([
  'Community event: IM-OKTOO GATHERING',
])

async function extractTitlesUniversal(url: string): Promise<string[]> {
  try {
    const api = `${API_BASE}/api/scrape-titles?url=${encodeURIComponent(url)}`
    const res = await fetch(api)
    if (!res.ok) throw new Error(`Backend error: ${res.status}`)
    const { titles } = await res.json()
    return titles ?? []
  } catch (err) {
    console.error('Failed to extract titles:', err)
    return []
  }
}

onMounted(async () => {
  const mascot = document.querySelector('.lion-mascot')
  if (mascot) mascot.classList.add('bounce-in')

  // Fetch all titles and replace the whole array to trigger reactivity
  const updatedLinks = await Promise.all(
    links.value.map(async (l) => {
      const titles = await extractTitlesUniversal(l.url)
      return { ...l, titles, loading: false }
    })
  )
  links.value = updatedLinks
})
</script>

<style scoped>
/* Your styles remain unchanged */
.resource-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
  animation: fadeInDown 1s;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}
.lion-mascot {
  width: 120px;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  background: #fffbe6;
  animation: mascotWiggle 2s infinite alternate;
}
.header-text h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.2rem;
}
.header-text p {
  color: #666;
  font-size: 1.1rem;
}
.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
  max-width: 1100px;
  margin: 0 auto;
}
.resource-card {
  background: #ffffffce;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 1.5rem 2rem;
  min-width: 220px;
  max-width: 280px;
  flex: 1 1 240px;
  transition: transform 0.3s, box-shadow 0.3s;
  animation: fadeInUp 0.8s;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.resource-card h2 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}
.resource-card a {
  color: #006aff;
  text-decoration: none;
  font-weight: 500;
  margin-top: 0.5rem;
}
.resource-card a:hover {
  text-decoration: underline;
}
.resource-card:hover {
  transform: translateY(-8px) scale(1.03) rotate(-1deg);
  box-shadow: 0 8px 24px rgba(0,0,0,0.13);
  background: rgb(145, 203, 234);
}
.contact-card {
  background: #ffffff;
  border: 1.5px solid #91d5ff;
}
.back-btn {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  border: none;
  background: #cffff5;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.back-btn:hover {
  background: #0fb3ff;
}
@media (max-width: 900px) {
  .resource-header {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  .lion-mascot {
    margin-bottom: 1rem;
  }
  .card-list {
    gap: 1rem;
  }
}
@media (max-width: 600px) {
  .card-list {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .resource-card {
    min-width: 0;
    width: 90vw;
    max-width: 98vw;
    padding: 1rem;
  }
}
/* Animations */
@keyframes mascotWiggle {
  0% { transform: rotate(-3deg) scale(1); }
  100% { transform: rotate(3deg) scale(1.05); }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-40px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

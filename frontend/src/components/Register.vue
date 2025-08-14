<template>
    <div class="register-container">
        <!-- Left side with image -->
        <div class="image-section">
            <div class="image-wrapper">
                <img src="../lib/Imgs/login.png" alt="Happy couple" class="profile-image" />
                <div class="background-circle circle-1"></div>
                <div class="background-circle circle-2"></div>
            </div>
        </div>

        <!-- Right side with registration form -->
        <div class="form-section">
            <div class="form-wrapper">
                <h1 class="title">Register</h1>

                <form @submit.prevent="handleRegister" class="register-form">
                    <!-- Username Input -->
                    <div class="input-group">
                        <label for="username" class="input-label">
                            Username <span class="required">*</span>
                        </label>
                        <input id="username" v-model="registerForm.username" type="text" class="input-field"
                            :class="{ 'error': errors.username }" placeholder="Enter your username" />
                        <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
                    </div>

                    <!-- First Name Input -->
                    <div class="input-group">
                        <label for="firstName" class="input-label">
                            First Name <span class="required">*</span>
                        </label>
                        <input id="firstName" v-model="registerForm.firstName" type="text" class="input-field"
                            :class="{ 'error': errors.firstName }" placeholder="Enter your first name" />
                        <span v-if="errors.firstName" class="error-message">{{ errors.firstName }}</span>
                    </div>

                    <!-- Email Input -->
                    <div class="input-group">
                        <label for="email" class="input-label">
                            Email Address <span class="required">*</span>
                        </label>
                        <input id="email" v-model="registerForm.email" type="email" class="input-field"
                            :class="{ 'error': errors.email }" placeholder="Enter your email address"
                            :readonly="isGoogleRegistration" />
                        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
                    </div>

                    <!-- Password Input (only for regular registration) -->
                    <div v-if="!isGoogleRegistration" class="input-group">
                        <label for="password" class="input-label">
                            Password <span class="required">*</span>
                        </label>
                        <input id="password" v-model="registerForm.password" type="password" class="input-field"
                            :class="{ 'error': errors.password }" placeholder="Create a password" />
                        <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
                    </div>

                    <!-- Confirm Password Input (only for regular registration) -->
                    <div v-if="!isGoogleRegistration" class="input-group">
                        <label for="confirmPassword" class="input-label">
                            Confirm Password <span class="required">*</span>
                        </label>
                        <input id="confirmPassword" v-model="registerForm.confirmPassword" type="password"
                            class="input-field" :class="{ 'error': errors.confirmPassword }"
                            placeholder="Confirm your password" />
                        <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
                    </div>

                    <!-- Google Registration Info -->
                    <div v-if="isGoogleRegistration" class="google-info">
                        <p class="info-text">
                            Complete your registration with your Google account details.
                        </p>
                    </div>

                    <!-- Register Button -->
                    <button type="submit" class="register-button" :disabled="isLoading">
                        {{ isLoading ? 'Creating Account...' : 'Create Account' }}
                    </button>

                
                </form>

                <!-- Footer links -->
                <div class="form-footer">
                    <div class="login-link">
                        Already have an account? <router-link to="/" class="login-button-link">Login</router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export default {
    name: 'RegisterPage',
    setup() {
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const router = useRouter()
        const route = useRoute()

        // Check if this is a Google registration flow
        const isGoogleRegistration = ref(false)
        const googleUserInfo = ref(null)

        // Reactive form data
        const registerForm = reactive({
            username: '',
            firstName: '',
            email: '',
            password: '',
            confirmPassword: ''
        })

        // Form validation errors
        const errors = ref({})

        // Loading state
        const isLoading = ref(false)
        const isGoogleReady = ref(false)

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        // Check if coming from Google auth
        onMounted(() => {
            const googleData = route.query.googleData
            if (googleData) {
                try {
                    googleUserInfo.value = JSON.parse(decodeURIComponent(googleData))
                    isGoogleRegistration.value = true
                    registerForm.email = googleUserInfo.value.email
                    registerForm.firstName = googleUserInfo.value.given_name || googleUserInfo.value.name
                } catch (error) {
                    console.error('Error parsing Google data:', error)
                }
            }

            if (!isGoogleRegistration.value) {
                loadGoogleScript()
            }
        })

        // Validation function
        const validateForm = () => {
            const newErrors = {}

            // Username validation
            if (!registerForm.username.trim()) {
                newErrors.username = 'Username is required'
            } else if (registerForm.username.length < 3) {
                newErrors.username = 'Username must be at least 3 characters'
            } else if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
                newErrors.username = 'Username can only contain letters, numbers, and underscores'
            }

            // First name validation
            if (!registerForm.firstName.trim()) {
                newErrors.firstName = 'First name is required'
            }

            // Email validation
            if (!registerForm.email.trim()) {
                newErrors.email = 'Email is required'
            } else if (!emailRegex.test(registerForm.email)) {
                newErrors.email = 'Please enter a valid email address'
            }

            // Password validation (only for regular registration)
            if (!isGoogleRegistration.value) {
                if (!registerForm.password.trim()) {
                    newErrors.password = 'Password is required'
                } else if (registerForm.password.length < 6) {
                    newErrors.password = 'Password must be at least 6 characters'
                }

                // Confirm password validation
                if (!registerForm.confirmPassword.trim()) {
                    newErrors.confirmPassword = 'Please confirm your password'
                } else if (registerForm.password !== registerForm.confirmPassword) {
                    newErrors.confirmPassword = 'Passwords do not match'
                }
            }

            errors.value = newErrors
            return Object.keys(newErrors).length === 0
        }

        // Handle form submission
        const handleRegister = async () => {
            errors.value = {}

            if (!validateForm()) {
                return
            }

            isLoading.value = true

            try {
                const response = await fetch(`${API_BASE}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: registerForm.username,
                        firstName: registerForm.firstName,
                        email: registerForm.email,
                        password: registerForm.password,
                        isGoogleUser: isGoogleRegistration.value,
                        googleData: googleUserInfo.value
                    })
                })

                const data = await response.json()

                if (data.success) {
                    console.log("User registered successfully!")

                    // Auto login after successful registration
                    localStorage.setItem('username', registerForm.username)
                    localStorage.setItem('isAuthenticated', 'true')
                    if (isGoogleRegistration.value) {
                        localStorage.setItem('googleAuth', 'true')
                        localStorage.setItem('email', googleUserInfo.value.email)
                    } 

                    await router.replace('/home')
                } else {
                    isLoading.value = false
                    // Handle specific error messages
                    if (data.field) {
                        errors.value[data.field] = data.message
                    } else {
                        errors.value.general = data.message || "Registration failed"
                    }
                }
            } catch (error) {
                isLoading.value = false
                console.error('Registration error:', error)
                errors.value.general = "Registration failed. Please try again."
            }
        }

        // Google Script Loading (for regular registration)
        const loadGoogleScript = () => {
            if (document.getElementById('google-script')) {
                initializeGoogle()
                return
            }

            const script = document.createElement('script')
            script.id = 'google-script'
            script.src = 'https://accounts.google.com/gsi/client'
            script.onload = initializeGoogle
            document.head.appendChild(script)
        }

        const initializeGoogle = async () => {
            if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                        callback: handleGoogleResponse,
                        error_callback: (error) => {
                            console.error('Google Init Error:', error)
                        }
                    })
                    isGoogleReady.value = true
                    await nextTick()
                    renderGoogleButton()
                } catch (error) {
                    console.error('Failed to initialize Google Auth:', error)
                }
            }
        }

        const handleGoogleResponse = async (response) => {
            try {
                const userInfo = decodeJWT(response.credential)

                // Redirect to registration page with Google data
                const googleData = encodeURIComponent(JSON.stringify(userInfo))
                await router.push(`/register?googleData=${googleData}`)

            } catch (error) {
                console.error('Error handling Google response:', error)
                alert('Google Sign-Up failed. Please try again.')
            }
        }

        const signUpWithGoogle = () => {
            if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                try {
                    window.google.accounts.id.prompt()
                } catch (error) {
                    console.error('Error prompting Google sign-up:', error)
                    alert('Google Sign-Up is not available. Please use regular registration.')
                }
            }
        }

        const renderGoogleButton = () => {
            if (window.google && isGoogleReady.value) {
                const buttonDiv = document.getElementById('google-signup-button')
                if (buttonDiv) {
                    try {
                        window.google.accounts.id.renderButton(buttonDiv, {
                            theme: 'outline',
                            size: 'large',
                            width: '100%',
                            text: 'signup_with'
                        })
                    } catch (error) {
                        console.error('Error rendering Google button:', error)
                    }
                }
            }
        }

        const decodeJWT = (token) => {
            try {
                const parts = token.split('.')
                const payload = parts[1]
                const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
                return JSON.parse(decoded)
            } catch (error) {
                throw error
            }
        }

        return {
            registerForm,
            errors,
            isLoading,
            isGoogleReady,
            isGoogleRegistration,
            handleRegister,
            signUpWithGoogle
        }
    }
}
</script>

<style scoped>
.register-container {
    display: flex;
    min-height: 100vh;
    background-image: url(../lib/Imgs/hdb.jpg);
}

/* Left side - Image section */
.image-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
}

.image-wrapper {
    position: relative;
    width: 300px;
    height: 300px;
}

.profile-image {
    border-radius: 20%;
    object-fit: cover;
    position: relative;
    z-index: 3;
}

.background-circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.3;
}

.circle-1 {
    width: 150px;
    height: 150px;
    background: #a8e6cf;
    top: -20px;
    left: -30px;
    z-index: 1;
}

.circle-2 {
    width: 100px;
    height: 100px;
    background: #ffd93d;
    bottom: -10px;
    right: -20px;
    z-index: 2;
}

.form-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-image: url(../lib/Imgs/hdb.jpg);
}

.form-wrapper {
    width: 100%;
    max-width: 400px;
    background: white;
    padding: 40px;
    border-radius: 5%;
    max-height: 90vh;
    overflow-y: auto;
}

.title {
    font-size: 2.5rem;
    color: #4a90e2;
    margin-bottom: 2rem;
    font-weight: 300;
    text-align: left;
}

.register-form {
    space-y: 1.5rem;
}

.input-group {
    margin-bottom: 1.5rem;
}

.input-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: #333;
    font-weight: 500;
}

.required {
    color: #e74c3c;
}

.input-field {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
    background: white;
}

.input-field:focus {
    outline: none;
    border-color: #4a90e2;
}

.input-field.error {
    border-color: #e74c3c;
}

.input-field:read-only {
    background-color: #f8f9fa;
    cursor: not-allowed;
}

.error-message {
    color: #e74c3c;
    font-size: 0.8rem;
    margin-top: 0.25rem;
    display: block;
}

.google-info {
    background: #e8f4fd;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.info-text {
    color: #4a90e2;
    font-size: 0.9rem;
    margin: 0;
}

.register-button {
    width: auto;
    padding: 0.75rem 2rem;
    background: white;
    color: #4a90e2;
    border: 2px solid #4a90e2;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    margin: 1.5rem auto;
    display: block;
}

.register-button:hover:not(:disabled) {
    background: #4a90e2;
    color: white;
}

.register-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
    overflow: hidden;
}

.divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e1e8ed;
    z-index: 1;
}

.divider-text {
    background: white;
    padding: 0 1rem;
    color: #666;
    font-size: 0.9rem;
    position: relative;
    z-index: 2;
}

.form-footer {
    text-align: center;
    margin-top: 1rem;
}

.login-link {
    font-size: 0.9rem;
    color: #666;
}

.login-button-link {
    color: #4a90e2;
    text-decoration: none;
    font-weight: 500;
}

.login-button-link:hover {
    text-decoration: underline;
}

.google-button {
    width: 100%;
    padding: 0.75rem 1rem;
    background: white;
    color: #333;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.google-button:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #dadce0;
}

.google-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.google-signin-container {
    width: 100%;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: center;
}

.google-signin-container>div {
    width: 100% !important;
}

</style>
<template>
    <div class="login-container">
        <!-- Left side with image -->
        <div class="image-section">
            <div class="image-wrapper">
                <img src="../lib/Imgs/login.png" alt="Happy couple" class="profile-image" />
                <div class="background-circle circle-1"></div>
                <div class="background-circle circle-2"></div>
            </div>
        </div>

        <!-- Right side with login form -->
        <div class="form-section">
            <div class="form-wrapper">
                <h1 class="title">Login</h1>

                <form @submit.prevent="handleLogin" class="login-form">
                    <!-- Username/Email Input -->
                    <div class="input-group">
                        <label for="username" class="input-label">
                            Username or email address <span class="required">*</span>
                        </label>
                        <input id="username" v-model="loginForm.username" type="text" class="input-field"
                            :class="{ 'error': errors.username }" placeholder="" />
                        <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
                    </div>

                    <!-- Password Input -->
                    <div class="input-group">
                        <label for="password" class="input-label">
                            Password <span class="required">*</span>
                        </label>
                        <input id="password" v-model="loginForm.password" type="password" class="input-field"
                            :class="{ 'error': errors.password }" placeholder="" />
                        <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
                    </div>

                    <!-- Remember me checkbox -->
                    <div class="checkbox-group">
                        <input id="remember" v-model="loginForm.rememberMe" type="checkbox" class="checkbox" />
                        <label for="remember" class="checkbox-label">Remember me</label>
                    </div>

                    <!-- Login Button -->
                    <button type="submit" class="login-button" :disabled="isLoading">
                        {{ isLoading ? 'Logging in...' : 'Log in' }}
                    </button>

                    <div class="divider">
                        <span class="divider-text"> or </span>
                    </div>

                    <!-- Google Sign-In Button Container -->
                    <div v-if="isGoogleReady" id="google-signin-button" class="google-signin-container"></div>

                    <!-- Fallback Google Button -->
                    <button v-else type="button" @click="signInWithGoogle" class="google-button"
                        :disabled="!isGoogleReady">
                        {{ isGoogleReady ? 'Continue with Google' : 'Google Sign-In Unavailable' }}
                    </button>

                </form>

                <!-- Footer links -->
                <div class="form-footer">
                    <a href="#" class="forgot-password">Lost Password?</a>
                    <div class="register-link">
                        New to IM-OKToo? <a href="/register" class="register-button">Register</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

export default {
    name: 'LoginPage',
    setup() {
        // Initialize router
        const router = useRouter()

        // Reactive form data
        const loginForm = reactive({
            username: '',
            password: '',
            rememberMe: false
        })

        localStorage.setItem('isAuthenticated', 'false');

        // Form validation errors
        const errors = ref({})

        // Loading state
        const isLoading = ref(false)
        const isGoogleReady = ref(false)

        // Validation function
        const validateForm = () => {
            const newErrors = {}

            if (!loginForm.username.trim()) {
                newErrors.username = 'Username or email is required'
            }

            if (!loginForm.password.trim()) {
                newErrors.password = 'Password is required'
            } else if (loginForm.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters'
            }

            errors.value = newErrors
            return Object.keys(newErrors).length === 0
        }

        // Handle form submission
        const handleLogin = async () => {
            errors.value = {};

            if (!validateForm()) {
                return
            }

            isLoading.value = true

            try {
                // use the new API that i just created
                console.log("validating the user")

                const response = await fetch('https://api-gateway-latest-d2sg.onrender.com/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: loginForm.username,
                        password: loginForm.password
                    })
                })

                const data = await response.json();

                if (data.success) {
                    console.log("user exists and has logged in!");
                    localStorage.setItem('username', loginForm.username);
                    localStorage.setItem('isAuthenticated', 'true');

                    await router.replace('/home')
                } else {
                    isLoading.value = false
                    errors.value.password = data.message || "Invalid username or password";
                    localStorage.setItem('isAuthenticated', 'false');
                }
            }
            catch (error) {
                isLoading.value = false
                console.error('Login error:', error);
                localStorage.setItem('isAuthenticated', 'false');
                errors.value.password = "Please ensure that your Password and Username is correct!.";


            }

        }

        const loadGoogleScript = () => {
            // this is to check if the script first exist
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
            console.log('Current origin:', window.location.origin)
            console.log('Current URL:', window.location.href)

            if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                        callback: handleGoogleResponse,
                        error_callback: (error) => {
                            console.error('Google Init Error:', error)
                        }
                    })
                    console.log('Google Auth initialized')
                    isGoogleReady.value = true
                    // Wait for DOM to update, then render button
                    await nextTick()
                    renderGoogleButton()

                } catch (error) {
                    console.error('Failed to initialize Google Auth:', error)
                }
            } else {
                console.warn('Google client ID not found or Google script not loaded')
            }
        }

        const handleGoogleResponse = async (response) => {
            try {
                // Decode the JWT token to get user info
                const user_id = decodeJWT(response.credential)

                const checkResponse = await fetch("https://api-gateway-latest-d2sg.onrender.com/check-google-user", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user_id.email,
                        google_id: user_id.sub
                    })
                })

                const checkData = await checkResponse.json()

                if (checkData.exists) {
                    localStorage.setItem('isAuthenticated', 'true')
                    localStorage.setItem('username', checkData.username)
                    localStorage.setItem('email', user_id.email)
                    localStorage.setItem('googleAuth', 'true')

                    await fetch('https://api-gateway-latest-d2sg.onrender.com/update-last-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: checkData.username })
                    })

                    await router.replace('/home')
                } else {
                    const googleData = encodeURIComponent(JSON.stringify(user_id))
                    await router.push(`/register?googleData=${googleData}`)
                }

            } catch (error) {
                console.error('Error handling Google response:', error)
                alert('Google Sign-In failed. Please try again.')
            }
        }

        const signInWithGoogle = () => {
            if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                try {
                    // First try to prompt
                    window.google.accounts.id.prompt((notification) => {
                        console.log('Prompt notification:', notification)
                        if (notification.isNotDisplayed()) {
                            console.log('Reason not displayed:', notification.getNotDisplayedReason())
                        }
                        if (notification.isSkippedMoment()) {
                            console.log('Reason skipped:', notification.getSkippedReason())
                        }
                        if (notification.isDismissedMoment()) {
                            console.log('Reason dismissed:', notification.getDismissedReason())
                        }
                    })
                } catch (error) {
                    console.error('Error prompting Google sign-in:', error)
                    alert('Google Sign-In is not available. Please use regular login.')
                }
            } else {
                alert('Google Sign-In is not configured. Please use regular login.')
            }
        }

        const renderGoogleButton = () => {
            if (window.google && isGoogleReady.value) {
                const buttonDiv = document.getElementById('google-signin-button')
                if (buttonDiv) {
                    try {
                        window.google.accounts.id.renderButton(buttonDiv, {
                            theme: 'outline',
                            size: 'large',
                            width: '100%'
                        })
                    } catch (error) {
                        console.error('Error rendering Google button:', error)
                    }
                } else {
                    console.error('Google button container not found')
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

        onMounted(() => {
            loadGoogleScript()
        })

        return {
            loginForm,
            errors,
            isLoading,
            isGoogleReady,
            handleLogin,
            signInWithGoogle
        }
    }
}
</script>

<style scoped>
.login-container {
    display: flex;
    /* background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); */
    background-image: url(../lib/Imgs/hdb.jpg);
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    min-height: 100dvh;
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
}

.form-wrapper {
    width: 100%;
    max-width: 400px;
    background: white;
    padding: 50px;
    border-radius: 5%;
}

.title {
    font-size: 2.5rem;
    color: #4a90e2;
    margin-bottom: 2rem;
    font-weight: 300;
    text-align: left;
}

.login-form {
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

.error-message {
    color: #e74c3c;
    font-size: 0.8rem;
    margin-top: 0.25rem;
    display: block;
}

.checkbox-group {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1rem 0;
}

.checkbox {
    margin-right: 0.5rem;
}

.checkbox-label {
    font-size: 0.9rem;
    color: #666;
    cursor: pointer;
}

.login-button {
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

.login-button:hover:not(:disabled) {
    background: #4a90e2;
    color: white;
}

.login-button:disabled {
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
    text-align: right;
}

.forgot-password {
    color: #4a90e2;
    text-decoration: none;
    font-size: 0.9rem;
    display: block;
    margin-bottom: 1rem;
}

.forgot-password:hover {
    text-decoration: underline;
}

.register-link {
    font-size: 0.9rem;
    color: #666;
}

.register-button {
    color: #4a90e2;
    text-decoration: none;
    font-weight: 500;
}

.register-button:hover {
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

/* Google Sign-In Button Container */
.google-signin-container {
    width: 100%;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: center;
}

/* Override Google button styles */
.google-signin-container>div {
    width: 100% !important;
}
</style>
import { auth, provider } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

const authSection = document.getElementById('auth-section');

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        authSection.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="${user.photoURL}" alt="Profile" class="w-8 h-8 rounded-full">
                <button id="logout-btn" class="text-sm font-medium hover:underline">Sign Out</button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    } else {
        authSection.innerHTML = `<button id="login-btn" class="bg-blue-600 text-white px-4 py-2 rounded">Sign In</button>`;
        document.getElementById('login-btn').addEventListener('click', () => {
            signInWithPopup(auth, provider).catch(error => console.error("Login failed", error));
        });
    }
});

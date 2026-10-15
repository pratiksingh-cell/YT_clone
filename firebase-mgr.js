import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your exact Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8GyIPrShWyOSm_OX5zfMFJYAjiANFVXo",
  authDomain: "dev-backend-cae4a.firebaseapp.com",
  projectId: "dev-backend-cae4a",
  storageBucket: "dev-backend-cae4a.firebasestorage.app",
  messagingSenderId: "100161214581",
  appId: "1:100161214581:web:4dceaced143c2647e0803c"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Shared state for subsequent chunks
export const AppState = {
  user: null,
  profile: null,
  activeWorld: null
};

// UI Elements
const screenAuth = document.getElementById("screen-auth");
const screenProfile = document.getElementById("screen-profile");
const screenMenu = document.getElementById("screen-menu");
const screenWorlds = document.getElementById("screen-worlds");
const authError = document.getElementById("auth-error");
const statusToast = document.getElementById("status-toast");

export function showToast(msg, duration = 2200) {
  statusToast.textContent = msg;
  statusToast.classList.remove("hidden");
  setTimeout(() => statusToast.classList.add("hidden"), duration);
}

export function showScreen(screenEl) {
  [screenAuth, screenProfile, screenMenu, screenWorlds].forEach(s => s.classList.add("hidden"));
  screenEl.classList.remove("hidden");
}

// 1. Google Login Button
document.getElementById("btn-google-login").addEventListener("click", async () => {
  authError.textContent = "";
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    authError.textContent = "Login error: " + err.message;
  }
});

// 2. Listen for Auth State & Check Profile
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    AppState.user = null;
    AppState.profile = null;
    showScreen(screenAuth);
    return;
  }

  AppState.user = user;
  showToast("Checking cloud profile...");

  try {
    const profileRef = doc(db, "users", user.uid);
    const snap = await getDoc(profileRef);

    if (snap.exists()) {
      AppState.profile = snap.data();
      enterMainMenu();
    } else {
      // Pre-fill suggested name from Google Account
      document.getElementById("input-username").value = (user.displayName || "Crafter").replace(/\s+/g, "_").slice(0, 16);
      showScreen(screenProfile);
    }
  } catch (err) {
    authError.textContent = "Firestore error (check rules): " + err.message;
  }
});

// 3. Save Profile to Firestore
document.getElementById("btn-save-profile").addEventListener("click", async () => {
  const username = document.getElementById("input-username").value.trim();
  const skin = document.getElementById("select-skin").value;

  if (username.length < 3) {
    alert("Username must be at least 3 characters!");
    return;
  }

  showToast("Saving profile...");
  const profileData = {
    uid: AppState.user.uid,
    username: username,
    skin: skin,
    email: AppState.user.email || "",
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "users", AppState.user.uid), profileData, { merge: true });
  AppState.profile = profileData;
  showToast("Profile saved!");
  enterMainMenu();
});

function enterMainMenu() {
  document.getElementById("welcome-splash").textContent = `Welcome, ${AppState.profile.username}!`;
  document.getElementById("footer-user").textContent = `Crafter: ${AppState.profile.username} (${AppState.profile.skin})`;
  showScreen(screenMenu);
}

// 4. Main Menu Actions
document.getElementById("btn-edit-profile").addEventListener("click", () => {
  document.getElementById("input-username").value = AppState.profile.username;
  document.getElementById("select-skin").value = AppState.profile.skin;
  showScreen(screenProfile);
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

document.getElementById("btn-singleplayer").addEventListener("click", () => {
  window.dispatchEvent(new CustomEvent("open-worlds-screen"));
  showToast("Ready for Chunk 2: World Manager!");
});

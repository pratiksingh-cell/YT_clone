import { db, auth } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

const form = document.getElementById('upload-form');
const statusMsg = document.getElementById('status-msg');

let currentUser = null;
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
        alert("You must be logged in to use the Studio Dashboard.");
        window.location.href = "index.html";
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('title').value;
    const url = document.getElementById('video-url').value;
    const channel = document.getElementById('channel').value;

    try {
        await addDoc(collection(db, "videos"), {
            title: title,
            embedUrl: url,
            channelName: channel,
            userId: currentUser.uid,
            timestamp: Date.now()
        });
        
        statusMsg.classList.remove('hidden');
        form.reset();
        setTimeout(() => statusMsg.classList.add('hidden'), 3000);
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Failed to publish video. Check console for details.");
    }
});

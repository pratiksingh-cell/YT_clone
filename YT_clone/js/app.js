import { db } from './firebase-config.js';
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const videoGrid = document.getElementById('video-grid');

async function loadVideos() {
    try {
        const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        videoGrid.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const video = doc.data();
            const card = document.createElement('div');
            card.className = "bg-white rounded-lg shadow overflow-hidden";
            card.innerHTML = `
                <div class="aspect-video">
                    <iframe width="100%" height="100%" src="${video.embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-lg leading-tight mb-1">${video.title}</h3>
                    <p class="text-sm text-gray-600">${video.channelName}</p>
                    <p class="text-xs text-gray-500 mt-1">${new Date(video.timestamp).toLocaleDateString()}</p>
                </div>
            `;
            videoGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading videos: ", error);
        videoGrid.innerHTML = '<p class="text-red-500">Could not load videos. Ensure Firebase Config is correct and Firestore is in Test Mode.</p>';
    }
}

loadVideos();

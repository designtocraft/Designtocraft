
        /* --- CONFIGURATION --- */
        const BLOG_URL = "bdshopapi.blogspot.com";
        const API_KEY = "AIzaSyAK0TJIvzEluhx-82Amzoxo7HfSN3rbIzg";

        let currentWords = [], currentIndex = 0, mistakes = 0, isStarted = false, timeLeft = 60, timer = null;
        const unijoyMap = {"ব":"J", "ক":"K", "ল":"L", "অ":"F", "া":"F", "ি":"D", "ু":"S", "ৃ":"A", "স":"N", "ম":"M", "গ":"O", "হ":"I"};

        /* --- PROFILE SYSTEM --- */
        function checkProfile() {
            const profile = JSON.parse(localStorage.getItem('tm_profile'));
            if (!profile) {
                document.getElementById('profileOverlay').classList.remove('hidden');
            } else {
                document.getElementById('userDisplayName').innerText = profile.name;
                document.getElementById('bestWpm').innerText = profile.bestWpm || 0;
                fetchBloggerData();
            }
        }

        function saveProfile() {
            const name = document.getElementById('userNameInput').value;
            const phone = document.getElementById('userPhoneInput').value;
            if (name && phone) {
                localStorage.setItem('tm_profile', JSON.stringify({ name, phone, bestWpm: 0 }));
                document.getElementById('profileOverlay').classList.add('hidden');
                checkProfile();
            } else { alert("সব তথ্য পূরণ করুন!"); }
        }

        /* --- THEME SYSTEM --- */
        function toggleTheme() {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('tm_theme', isDark ? 'dark' : 'light');
        }

        /* --- BLOGGER SYNC --- */
        async function fetchBloggerData() {
            try {
                const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/byurl?url=http://${BLOG_URL}&key=${API_KEY}`);
                const blog = await res.json();
                const [bn, en] = await Promise.all([
                    fetch(`https://www.googleapis.com/blogger/v3/blogs/${blog.id}/posts?labels=Golpo&key=${API_KEY}`).then(r => r.json()),
                    fetch(`https://www.googleapis.com/blogger/v3/blogs/${blog.id}/posts?labels=Story&key=${API_KEY}`).then(r => r.json())
                ]);
                
                if (bn.items) localStorage.setItem('tm_stories_bn', JSON.stringify(bn.items.map(p => ({title: p.title, content: p.content.replace(/<[^>]*>/g, '').trim()} ))));
                if (en.items) localStorage.setItem('tm_stories_en', JSON.stringify(en.items.map(p => ({title: p.title, content: p.content.replace(/<[^>]*>/g, '').trim()} ))));
                initApp();
            } catch (e) { initApp(); }
        }

        function initApp() {
            const lang = document.getElementById('langMode').value;
            let stories = JSON.parse(localStorage.getItem('tm_stories_' + lang)) || [{title: "Default", content: "টাইপিং অনুশীলন করুন।"}];
            
            document.getElementById('storyList').innerHTML = stories.map((s, i) => `
                <div onclick="loadStory(${i})" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:border-indigo-500 border border-transparent transition">
                    <p class="font-bold text-xs">${s.title}</p>
                </div>
            `).join('');
            loadStory(0);
            updateVisualKb(lang);
        }

        function loadStory(idx) {
            const lang = document.getElementById('langMode').value;
            const stories = JSON.parse(localStorage.getItem('tm_stories_' + lang));
            currentWords = stories[idx].content.split(/\s+/);
            currentIndex = 0; mistakes = 0; timeLeft = 60; isStarted = false;
            clearInterval(timer);
            document.getElementById('inputArea').value = "";
            document.getElementById('timer').innerText = "01:00";
            renderText();
        }

        function renderText() {
            const display = document.getElementById('textDisplay');
            display.innerHTML = currentWords.map((w, i) => `<span class="word" id="w-${i}">${w}</span>`).join('');
            document.getElementById('w-0').classList.add('current');
            hintNextKey();
        }

        function hintNextKey() {
            const lang = document.getElementById('langMode').value;
            document.querySelectorAll('.kb-key').forEach(k => k.classList.remove('hint-key'));
            if(lang === 'bn' && currentWords[currentIndex]) {
                const char = currentWords[currentIndex][0];
                const key = unijoyMap[char];
                if(key) {
                    document.querySelectorAll('.kb-key').forEach(k => {
                        if(k.innerText.includes(key)) k.classList.add('hint-key');
                    });
                }
            }
        }

        /* --- TYPING LOGIC --- */
        document.getElementById('inputArea').addEventListener('input', (e) => {
            if(!isStarted) { isStarted = true; timer = setInterval(countDown, 1000); }
            
            document.getElementById('typeSound').currentTime = 0;
            document.getElementById('typeSound').play();

            if (e.target.value.endsWith(' ')) {
                const typed = e.target.value.trim();
                const target = currentWords[currentIndex];
                const span = document.getElementById(`w-${currentIndex}`);

                if (typed === target) { span.className = "word correct"; } 
                else { 
                    span.className = "word incorrect"; mistakes++;
                    document.getElementById('errorSound').play();
                }

                e.target.value = "";
                currentIndex++;
                updateStats();
                if (currentIndex < currentWords.length) {
                    document.getElementById(`w-${currentIndex}`).className = "word current";
                    document.getElementById(`w-${currentIndex}`).scrollIntoView({behavior:'smooth', block:'center'});
                    hintNextKey();
                } else { endGame(); }
            }
        });

        function countDown() {
            if(timeLeft > 0) {
                timeLeft--;
                document.getElementById('timer').innerText = `00:${timeLeft.toString().padStart(2, '0')}`;
            } else { endGame(); }
        }

        function updateStats() {
            const elapsed = (60 - timeLeft) / 60 || 0.01;
            const wpm = Math.round(currentIndex / elapsed);
            const acc = Math.round(((currentIndex - mistakes) / currentIndex) * 100) || 100;
            document.getElementById('wpm').innerText = wpm;
            document.getElementById('accuracy').innerText = acc + "%";
            document.getElementById('wordCounter').innerText = `${currentIndex}/${currentWords.length} WORDS`;
        }

        function endGame() {
            clearInterval(timer);
            const finalWpm = parseInt(document.getElementById('wpm').innerText);
            let profile = JSON.parse(localStorage.getItem('tm_profile'));
            if(finalWpm > profile.bestWpm) {
                profile.bestWpm = finalWpm;
                localStorage.setItem('tm_profile', JSON.stringify(profile));
                alert("New Personal Best! 🏆 Speed: " + finalWpm + " WPM");
            } else {
                alert("সময় শেষ! গতি: " + finalWpm + " WPM");
            }
            checkProfile();
        }

        function updateVisualKb(lang) {
            const kb = document.getElementById('visualKb');
            const keys = lang === 'bn' ? 
                ['J:ব', 'K:ক', 'L:ল', 'F:অ', 'G:্', 'D:ি', 'S:ু', 'A:ৃ', 'N:স', 'M:ম'] :
                ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
            kb.innerHTML = keys.map(k => `<div class="kb-key"><span>${k.split(':')[1] || k}</span><span class="opacity-40 text-[8px]">${k.split(':')[0]}</span></div>`).join('');
        }

        function openModal() { document.getElementById('storyModal').style.display='flex'; }
        function closeModal() { document.getElementById('storyModal').style.display='none'; }
        function saveCustomStory() {
            const title = document.getElementById('newTitle').value, content = document.getElementById('newContent').value, lang = document.getElementById('langMode').value;
            if(!title || !content) return;
            let stories = JSON.parse(localStorage.getItem('tm_stories_' + lang)) || [];
            stories.push({title, content});
            localStorage.setItem('tm_stories_' + lang, JSON.stringify(stories));
            closeModal(); initApp();
        }

        window.onload = () => {
            if(localStorage.getItem('tm_theme') === 'dark') document.body.classList.add('dark');
            checkProfile();
        };

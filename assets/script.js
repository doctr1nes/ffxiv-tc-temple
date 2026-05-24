const lightsGrid = document.getElementById('lightsGrid');
const lightsEmpty = document.getElementById('lightsEmpty');
const recordsBody = document.getElementById('recordsBody');
const recordsEmpty = document.getElementById('recordsEmpty');
const searchInput = document.getElementById('searchInput');
const recordsSearchInput = document.getElementById('recordsSearchInput');
const commentsBody = document.getElementById('commentsBody');
const commentsEmpty = document.getElementById('commentsEmpty');
const commentForm = document.getElementById('commentForm');
const commentPlayer = document.getElementById('commentPlayer');
const commentServer = document.getElementById('commentServer');
const commentContent = document.getElementById('commentContent');
const commentSubmit = document.getElementById('commentSubmit');

let lights = [];
let records = [];
let comments = [];

function parseLights(text) {
  const sections = text
    .trim()
    .split(/\r?\n\r?\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  return sections.map((block) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const title = lines[0] || '';
    const description = lines[1] || '';
    const prayer = lines[2] || '';
    const blessing = lines[3] || '';
    const tagsLine = lines[4] || '';
    const numberMatch = title.match(/^(\d+)\./);
    const id = numberMatch ? Number(numberMatch[1]) : null;
    const name = title.replace(/^\d+\./, '').trim();

    const tags = tagsLine.replace(/^適合：/, '').split(/[、,]/).map((tag) => tag.trim()).filter(Boolean);

    return {
      id,
      name,
      title: name,
      label: title,
      description,
      prayer,
      blessing,
      tags,
    };
  });
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map((v) => v.trim());
}

function parseRecordsFromCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line) => parseCSVLine(line));
  return rows.map((cols) => {
    // Expecting: date, player, server, lamp, content
    const map = {};
    map.date = cols[0] || '';
    map.id = cols[1] || '';
    map.server = cols[2] || '';
    map.lamp = cols[3] || '';
    map.content = cols[4] || '';
    return map;
  });
}

function renderLights(items) {
  lightsGrid.innerHTML = '';
  if (!items.length) {
    lightsEmpty.style.display = 'block';
    return;
  }
  lightsEmpty.style.display = 'none';

  items.forEach((light) => {
    const card = document.createElement('article');
    card.className = 'card light-card';
    card.innerHTML = `
      <div class="light-card__title">
        <div>
          <h3>${light.name}</h3>
          <p class="light-card__meta">${light.description}</p>
        </div>
        <span class="light-card__meta">#${light.id || '—'}</span>
      </div>
      <p>${light.prayer}</p>
      <p>${light.blessing}</p>
      <div class="light-card__tags">
        ${light.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `;
    lightsGrid.appendChild(card);
  });
}

function toChineseNumber(num) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (num === 0) return '零';
  if (num < 10) return digits[num];
  if (num < 20) return `十${num % 10 === 0 ? '' : digits[num % 10]}`;
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${digits[tens]}十${ones === 0 ? '' : digits[ones]}`;
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    let result = `${digits[hundreds]}百`;
    if (remainder === 0) return result;
    if (remainder < 10) {
      result += `零${digits[remainder]}`;
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      if (tens === 0) {
        result += `零${digits[ones]}`;
      } else {
        result += `${digits[tens]}十${ones === 0 ? '' : digits[ones]}`;
      }
    }
    return result;
  }
  return String(num);
}

function getLampLabel(lampId) {
  if (!lampId) {
    return '';
  }

  const value = String(lampId).trim();

  if (value.includes('/')) {
    return value
      .split('/')
      .map((part) => getLampLabel(part.trim()))
      .filter(Boolean)
      .join('<br>');
  }

  const countMatch = value.match(/^(\d+)\*(\d+)$/);
  if (countMatch) {
    const id = countMatch[1];
    const count = Number(countMatch[2]);
    const match = lights.find((light) => String(light.id) === id);
    const label = match ? match.name : id;
    return `${label}${toChineseNumber(count)}盞`;
  }

  const match = lights.find((light) => String(light.id) === value);
  return match ? match.name : value;
}

function renderRecords(records) {
  recordsBody.innerHTML = '';
  if (!records.length) {
    recordsEmpty.style.display = 'block';
    return;
  }
  recordsEmpty.style.display = 'none';

  records.forEach((record) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.date || ''}</td>
      <td>${record.id}</td>
      <td>${record.server}</td>
      <td>${getLampLabel(record.lamp)}</td>
      <td>${record.content}</td>
    `;
    recordsBody.appendChild(row);
  });
}

// --- Comments handling ---
// Replace the DEPLOYMENT_ID below with your Web App deployment ID after you deploy the Apps Script.
const DEPLOYMENT_ID = 'AKfycbz8PRvfXCUzKy8X3xWyBmKqMGWCpYcPIMSBl7kFSPeaRmcpBE1wOUA9XuVyhhBex6oY';
const COMMENTS_GET_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec?action=getComments`;
const COMMENTS_POST_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;

function formatCommentDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function parseCommentsFromJSON(data) {
  // Expecting an array of objects: {date, id, server, content}
  if (!Array.isArray(data)) return [];
  return data.map((r) => ({
    date: formatCommentDate(r.date || r.datetime || r.timestamp || ''),
    id: r.id || r.player || r.name || '',
    server: r.server || '',
    content: r.content || r.message || r.text || '',
  }));
}

function renderComments(items) {
  if (!commentsBody) return;
  commentsBody.innerHTML = '';
  if (!items || !items.length) {
    if (commentsEmpty) commentsEmpty.style.display = 'block';
    return;
  }
  if (commentsEmpty) commentsEmpty.style.display = 'none';

  items.forEach((c) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${c.date || ''}</td>
      <td>${escapeHtml(c.id || '')}</td>
      <td>${escapeHtml(c.server || '')}</td>
      <td>${escapeHtml(c.content || '')}</td>
    `;
    commentsBody.appendChild(row);
  });
}

async function loadComments() {
  try {
    const res = await fetch(COMMENTS_GET_URL);
    const json = await res.json();
    comments = parseCommentsFromJSON(json);
    renderComments(comments);
  } catch (err) {
    console.warn('載入留言失敗', err);
    if (commentsEmpty) commentsEmpty.textContent = '無法載入留言，請確認 Google Apps Script 是否正確公開。';
    if (commentsEmpty) commentsEmpty.style.display = 'block';
  }
}

async function submitComment(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!commentPlayer || !commentServer || !commentContent) return;
  const id = commentPlayer.value.trim();
  const server = commentServer.value.trim();
  const content = commentContent.value.trim();
  if (!id || !server || !content) {
    alert('請填寫玩家、伺服器與留言內容。');
    return;
  }

  const payload = new URLSearchParams({ id, server, content });
  commentSubmit.disabled = true;
  try {
    const res = await fetch(COMMENTS_POST_URL, {
      method: 'POST',
      body: payload,
    });
    if (!res.ok) throw new Error('Network response was not ok');
    // optimistic update: add to list with local timestamp
    const now = new Date();
    const local = { date: formatCommentDate(now), id, server, content };
    comments.unshift(local);
    renderComments(comments);
    commentForm.reset();
    // Optionally refresh from server
    setTimeout(loadComments, 800);
  } catch (err) {
    console.error('送出留言失敗', err);
    alert('送出留言失敗，請稍後再試。');
  } finally {
    commentSubmit.disabled = false;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateSearch() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = lights.filter((light) => {
    const haystack = [light.name, light.label, light.description, light.prayer, light.blessing, ...light.tags].join(' ').toLowerCase();
    return haystack.includes(query);
  });
  renderLights(filtered);
}

function updateRecordsSearch() {
  const query = recordsSearchInput.value.trim().toLowerCase();
  const filtered = records.filter((record) => {
    const lampLabel = getLampLabel(record.lamp);
    const haystack = [record.date, record.id, record.server, record.lamp, lampLabel, record.content].join(' ').toLowerCase();
    return haystack.includes(query);
  });
  renderRecords(filtered);
}

async function loadData() {
  try {
    const [lightRes, recordRes] = await Promise.all([
      fetch('data/light.txt'),
      fetch('https://docs.google.com/spreadsheets/d/1Mo7UW4S9F4BKNWinJGCu-H9nUz6bfXkQU_s8EtyMDOQ/export?format=csv&gid=0'),
      // fetch('https://docs.google.com/spreadsheets/d/1shMN2B9CeTE4E6iT-_8W9m6oEIkAueVHHj5IUvaOPms/export?format=csv&gid=0'), // Debug
    ]);

    const [lightText, recordText] = await Promise.all([lightRes.text(), recordRes.text()]);
    lights = parseLights(lightText);
    records = parseRecordsFromCSV(recordText);
    renderLights(lights);
    renderRecords(records);
  } catch (error) {
    lightsEmpty.textContent = '無法載入資料，請確認 light.txt 是否存在且格式正確，或 Google Sheet 是否公開。';
    lightsEmpty.style.display = 'block';
    recordsEmpty.textContent = '無法載入紀錄，請確認 Google Sheet 是否公開或網址是否正確。';
    recordsEmpty.style.display = 'block';
    console.error(error);
  }
}

searchInput.addEventListener('input', updateSearch);
recordsSearchInput.addEventListener('input', updateRecordsSearch);

function initHeroCarousel() {
  const hero = document.querySelector('.hero');
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.querySelector('.carousel-btn--prev');
  const nextBtn = document.querySelector('.carousel-btn--next');
  
  if (!hero || !dotsContainer) return;
  
  const images = ['ffxiv01.png', 'ffxiv02.png', 'ffxiv03.png', 'ffxiv04.png'];
  let currentIndex = 0;
  let autoPlayInterval;
  
  // Create dots
  images.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `圖片 ${idx + 1}`);
    dot.addEventListener('click', () => goToSlide(idx));
    dotsContainer.appendChild(dot);
  });
  
  function updateBackground() {
    hero.style.backgroundImage = `url('assets/${images[currentIndex]}')`;
    document.querySelectorAll('.carousel-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });
  }
  
  function goToSlide(idx) {
    currentIndex = idx % images.length;
    updateBackground();
    resetAutoPlay();
  }
  
  function nextSlide() {
    currentIndex = (currentIndex + 1) % images.length;
    updateBackground();
  }
  
  function prevSlide() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateBackground();
  }
  
  function startAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
    }
    autoPlayInterval = setInterval(nextSlide, 5000);
  }
  
  function resetAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
    }
    startAutoPlay();
  }
  
  function pauseAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
  }
  
  prevBtn.addEventListener('click', () => {
    prevSlide();
    resetAutoPlay();
  });
  
  nextBtn.addEventListener('click', () => {
    nextSlide();
    resetAutoPlay();
  });
  
  hero.addEventListener('mouseenter', pauseAutoPlay);
  hero.addEventListener('mouseleave', startAutoPlay);
  
  updateBackground();
  startAutoPlay();
}

loadData();
initHeroCarousel();
initTopBarNavigation();
initScrollTopButton();
if (commentForm) commentForm.addEventListener('submit', submitComment);
loadComments();

function initTopBarNavigation() {
  const topBarItems = document.querySelectorAll('.top-bar__item');
  const sections = Array.from(topBarItems)
    .map((item) => {
      const target = item.getAttribute('href');
      return target && document.querySelector(target);
    })
    .filter(Boolean);

  function setActive(item) {
    topBarItems.forEach((btn) => btn.classList.toggle('active', btn === item));
  }

  topBarItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      const targetId = item.getAttribute('href');
      const targetSection = targetId && document.querySelector(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(item);
      }
    });
  });

  function updateActiveOnScroll() {
    const scrollPosition = window.scrollY + window.innerHeight * 0.15;
    let currentActive = topBarItems[0];

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      if (scrollPosition >= top) {
        currentActive = topBarItems[index];
      }
    });

    setActive(currentActive);
  }

  window.addEventListener('scroll', updateActiveOnScroll);
  updateActiveOnScroll();
}

function initScrollTopButton() {
  const floatingButton = document.getElementById('scrollTopButton');

  function updateFloatingButtonVisibility() {
    if (!floatingButton) return;
    if (window.scrollY > 200) {
      floatingButton.classList.remove('hidden');
    } else {
      floatingButton.classList.add('hidden');
    }
  }

  if (floatingButton) {
    floatingButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', updateFloatingButtonVisibility);
  updateFloatingButtonVisibility();
}


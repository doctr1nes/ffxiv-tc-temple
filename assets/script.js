const lightsGrid = document.getElementById('lightsGrid');
const lightsEmpty = document.getElementById('lightsEmpty');
const recordsBody = document.getElementById('recordsBody');
const recordsEmpty = document.getElementById('recordsEmpty');
const searchInput = document.getElementById('searchInput');
const recordsSearchInput = document.getElementById('recordsSearchInput');

let lights = [];
let records = [];

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

function getLampLabel(lampId) {
  const match = lights.find((light) => String(light.id) === String(lampId));
  return match ? match.name : lampId;
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
loadData();

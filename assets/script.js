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

function parseRecords(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const idServer = parts[0] || '';
      const number = parts[1] || '';
      const content = parts.slice(2).join(' ') || '';
      const [id, server] = idServer.split('@');
      return {
        id: id || idServer,
        server: server || '',
        lamp: number,
        content,
      };
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
    const haystack = [record.id, record.server, record.lamp, lampLabel, record.content].join(' ').toLowerCase();
    return haystack.includes(query);
  });
  renderRecords(filtered);
}

async function loadData() {
  try {
    const [lightRes, recordRes] = await Promise.all([
      fetch('../data/light.txt'),
      fetch('../data/data.txt'),
    ]);

    const [lightText, recordText] = await Promise.all([lightRes.text(), recordRes.text()]);
    lights = parseLights(lightText);
    records = parseRecords(recordText);
    renderLights(lights);
    renderRecords(records);
  } catch (error) {
    lightsEmpty.textContent = '無法載入資料，請確認 light.txt 與 data.txt 是否存在且格式正確。';
    lightsEmpty.style.display = 'block';
    recordsEmpty.textContent = '無法載入紀錄，請確認資料檔案是否可讀取。';
    recordsEmpty.style.display = 'block';
    console.error(error);
  }
}

searchInput.addEventListener('input', updateSearch);
recordsSearchInput.addEventListener('input', updateRecordsSearch);
loadData();

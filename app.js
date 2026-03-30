/* ====================================================
   SISTEMA DE COTIZACIONES — app.js
   Maria Gomez / Confección y Tapizados
   ==================================================== */



// ===== UI HELPERS =====
function triggerHaptic() {
  if (navigator.vibrate) {
    try { navigator.vibrate(40); } catch(e) {}
  }
}

// ===== CONSTANTS & STATE =====
const EMPRESA = {
  nombre: 'MARIA GOMEZ',
  ruc: 'R.U.C. E8-94-182  *  D.V.: 01',
  tagline: 'Todo en confección y tapizados de muebles, cenefas, cortinas, papel tapiz e instalaciones',
  celular: '+507 6634-9909',
  email: 'betsygomezr@hotmail.com',
  moneda: 'B/.',
};

// ===== STATE =====
let items = [];
let nextId = 1;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Load persisted data
  loadPersistedData();

  // Default date = today
  const dateInput = document.getElementById('fecha');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Start with 1 empty row if no items
  if (items.length === 0) {
    addItem();
  }

  updateBadge();
  bindEvents();
});

// ===== PERSISTENCE =====
function loadPersistedData() {
  // Invoice Number
  const savedNum = localStorage.getItem('mg_invoice_num');
  const numInput = document.getElementById('numero');

  if (savedNum) {
    numInput.value = savedNum;
  } else {
    numInput.value = '176';
  }
  const savedClients = JSON.parse(localStorage.getItem('mg_clients') || '[]');
  updateClientDatalist(savedClients);
}

function saveInvoiceNumber() {
  const num = document.getElementById('numero').value;
  localStorage.setItem('mg_invoice_num', num);
}

function saveClient(name) {
  if (!name || name.trim() === '' || name === '—') return;

  let clients = JSON.parse(localStorage.getItem('mg_clients') || '[]');
  if (!clients.includes(name)) {
    clients.unshift(name); // Add to front
    clients = clients.slice(0, 15); // Keep last 15
    localStorage.setItem('mg_clients', JSON.stringify(clients));
    updateClientDatalist(clients);
  }
}

function updateClientDatalist(clients) {
  const datalist = document.getElementById('clientes-list');
  if (!datalist) return;
  datalist.innerHTML = '';
  clients.forEach(client => {
    const opt = document.createElement('option');
    opt.value = client;
    datalist.appendChild(opt);
  });
}

// ===== BIND EVENTS =====
function bindEvents() {
  document.getElementById('btn-add-item').addEventListener('click', () => { addItem(); });
  document.getElementById('btn-preview').addEventListener('click', showPreview);
  document.getElementById('btn-pdf').addEventListener('click', downloadPDF);
  document.getElementById('btn-pdf2').addEventListener('click', downloadPDF);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-close2').addEventListener('click', closeModal);
  document.getElementById('btn-nueva').addEventListener('click', newCotizacion);
  document.getElementById('numero').addEventListener('input', () => {
    updateBadge();
    saveInvoiceNumber();
  });

  // Close on backdrop click
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-backdrop')) closeModal();
  });
}

// ===== ADD ITEM =====
function addItem() {
  triggerHaptic();
  const id = nextId++;
  items.push({ id, cant: '', desc: '', precio: '', itbms: '' });

  const container = document.getElementById('items-body');
  const card = document.createElement('div');
  card.className = 'item-row';
  card.dataset.id = id;
  card.innerHTML = `
    <div class="item-col item-cant">
      <label class="item-lbl">Cant.</label>
      <input class="cant-input" type="number" min="0" step="any" placeholder="1" data-id="${id}" data-field="cant" inputmode="decimal" />
    </div>
    <div class="item-col item-desc">
      <label class="item-lbl">Descripción</label>
      <textarea class="desc-input" rows="1" placeholder="Descripción del servicio o producto…" data-id="${id}" data-field="desc"></textarea>
    </div>
    <div class="item-col item-price">
      <label class="item-lbl">Precio/U</label>
      <input class="price-input" type="number" min="0" step="0.01" placeholder="0.00" data-id="${id}" data-field="precio" inputmode="decimal" />
    </div>
    <div class="item-col item-itbms">
      <label class="item-lbl">% ITBMS</label>
      <input class="itbms-input" type="number" min="0" step="any" placeholder="0" data-id="${id}" data-field="itbms" inputmode="decimal" />
    </div>
    <div class="item-col item-total">
      <label class="item-lbl">Total</label>
      <div class="total-cell" id="total-row-${id}">—</div>
    </div>
    <div class="item-col item-del">
      <button class="btn-del" data-id="${id}" title="Eliminar">✕</button>
    </div>
  `;
  container.appendChild(card);

  card.querySelectorAll('input, textarea').forEach(inp => {
    inp.addEventListener('input', () => {
      const item = items.find(i => i.id === +inp.dataset.id);
      if (item) item[inp.dataset.field] = inp.value;

      if (inp.tagName.toLowerCase() === 'textarea') {
        inp.style.height = 'auto';
        inp.style.height = inp.scrollHeight + 'px';
      }

      recalcTotals();
    });
  });
  card.querySelector('.btn-del').addEventListener('click', (e) => {
    deleteItem(+e.target.dataset.id);
  });
}

// ===== DELETE ITEM =====
function deleteItem(id) {
  triggerHaptic();
  if (items.length <= 1) return;
  items = items.filter(i => i.id !== id);
  const card = document.querySelector(`.item-row[data-id="${id}"]`);
  if (card) card.remove();
  recalcTotals();
}

// ===== RECALC =====
function recalcTotals() {
  let subtotal = 0;
  let totalItbms = 0;
  items.forEach(item => {
    const cantText = item.cant === undefined ? '' : String(item.cant).trim();
    const cant = cantText === '' ? 1 : (parseFloat(cantText) || 0);
    const precioText = item.precio === undefined ? '' : String(item.precio).trim();
    const precio = precioText === '' ? 0 : (parseFloat(precioText) || 0);
    const itbmsText = item.itbms === undefined ? '' : String(item.itbms).trim();
    const itbmsPct = itbmsText === '' ? 0 : (parseFloat(itbmsText) || 0);

    const rowBase = cant * precio;
    const rowItbms = rowBase * (itbmsPct / 100);
    const rowTotal = rowBase + rowItbms;

    subtotal += rowBase;
    totalItbms += rowItbms;

    const cell = document.getElementById(`total-row-${item.id}`);
    if (cell) {
      cell.textContent = rowTotal > 0 ? `${EMPRESA.moneda} ${fmt(rowTotal)}` : '—';
    }
  });

  const total = subtotal + totalItbms;

  document.getElementById('subtotal-val').textContent = `${EMPRESA.moneda} ${fmt(subtotal)}`;
  document.getElementById('itbms-val').textContent = `${EMPRESA.moneda} ${fmt(totalItbms)}`;
  document.getElementById('total-val').textContent = `${EMPRESA.moneda} ${fmt(total)}`;
}

// ===== FORMAT NUMBER =====
function fmt(n) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ===== UPDATE BADGE =====
function updateBadge() {
  const num = document.getElementById('numero').value || '1';
  document.getElementById('badge-numero').textContent = `COT-${String(num).padStart(3, '0')}`;
}

// ===== BUILD INVOICE HTML =====
function buildInvoiceHTML() {
  const numero = document.getElementById('numero').value || '1';
  const fecha = document.getElementById('fecha').value;
  const cliente = document.getElementById('cliente').value || '—';
  const direccion = document.getElementById('direccion').value;
  const nota = document.getElementById('nota').value;

  // Format date nicely
  const fechaFmt = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-PA', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  // Build rows
  const filledItems = items.filter(i => i.cant || i.desc || i.precio);
  let rowsHTML = '';
  let subtotal = 0;
  let totalItbms = 0;

  filledItems.forEach((item, idx) => {
    const cantText = item.cant === undefined ? '' : String(item.cant).trim();
    const cant = cantText === '' ? 1 : (parseFloat(cantText) || 0);
    const precioText = item.precio === undefined ? '' : String(item.precio).trim();
    const precio = precioText === '' ? 0 : (parseFloat(precioText) || 0);
    const itbmsText = item.itbms === undefined ? '' : String(item.itbms).trim();
    const itbmsPct = itbmsText === '' ? 0 : (parseFloat(itbmsText) || 0);

    const rowBase = cant * precio;
    const rowItbms = rowBase * (itbmsPct / 100);
    const rowTotal = rowBase + rowItbms;

    subtotal += rowBase;
    totalItbms += rowItbms;

    let itbmsTag = itbmsPct > 0 ? ` <span style="font-size:10px; color:#888;">(ITBMS ${itbmsPct}%)</span>` : '';

    rowsHTML += `
      <tr>
        <td class="right">${item.cant || ''}</td>
        <td class="desc">${escapeHTML(item.desc || '')}${itbmsTag}</td>
        <td class="right">${precio > 0 ? EMPRESA.moneda + ' ' + fmt(precio) : ''}</td>
        <td class="right" style="font-weight:600;">${rowTotal > 0 ? EMPRESA.moneda + ' ' + fmt(rowTotal) : ''}</td>
      </tr>`;
  });

  const total = subtotal + totalItbms;

  const itbmsRow = totalItbms > 0 ? `
    <div class="inv-totals-row">
      <span>ITBMS</span>
      <span>${EMPRESA.moneda} ${fmt(totalItbms)}</span>
    </div>` : '';

  const notaHTML = nota ? `
    <div class="inv-note-box">
      <strong>Nota:</strong> ${escapeHTML(nota)}
    </div>` : '';

  const dirHTML = direccion
    ? `<div class="dir">📍 ${escapeHTML(direccion)}</div>`
    : '';

  // Logo Base64 string (Small 3.2KB image)

  const logoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAYABgAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABgAAAAAQAAAGAAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAFSgAwAEAAAAAQAAAFQAAAAA/+0AOFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAAOEJJTQQlAAAAAAAQ1B2M2Y8AsgTpgAmY7PhCfv/AABEIAFQAVAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAICAgICAgMCAgMFAwMDBQYFBQUFBggGBgYGBggKCAgICAgICgoKCgoKCgoMDAwMDAwODg4ODg8PDw8PDw8PDw//2wBDAQICAgQEBAcEBAcQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/3QAEAAb/2gAMAwEAAhEDEQA/AP38ooorPnAKKKQnFL2gC0mQOtYep+JtA0VC+q38NqB/z0cL+hryDXv2hfAmlkpZPLqEi8YiXC5/3mwK8HNuLcuwKvjK8YerV/u3PRwWT4rEu1Ck5eiPfAQelISBwTXN+FvEdr4n0K21y0BWO5XcFOCV9QcV5d4s/aB8AeEPF1v4S1O5Jml4llQZjgJ6Bz159uneuzEZ9hKVCGJqVUoStZt6O+xzLCVed0+V3W69D3aiqVjqFnqNrHeWUqzwyqGV0O5SD0IIq7XoxrKSutjBqwUUUVqhH//Q/fyiiisGAdKqG7gaVrdJFMi8lQwyAfUdaZqV9badp9xf3ciwwW0bSyOxwFRBuYn2AGa/n58e/HfxnrHxT1j4geGdXudLkurkiDyZWULbxnCBl6H5R3HU181xFxLTy6MHNXcnsvzPocg4eqZhKcYO3Kuv5H6RfH3w0+k+K/7YRN1vqA3ZPIDr1H9a+fck5B5GTXAWX7YmqeKdIh8L/FayW8WFg8epWaqtxHgYy0RKpID3wyH6122ialoPiqES+F9Rh1MEZKRnbcAH+9C2HB+gP1r+K/E/hudbMauPwEXKnP3n3i+qt/kfv/CmLeFwscNjXyzWl9bNdNf8z2PTvi/rngj4X3tjo8Ye6EwjSZjxAsv8WO5z0r5Iu/td9cyXl7IZppnLSO55LN1Jz1+te52UMVwLvRrs+XHfRNCQRkh+qHHqGGPxrwC6F3DcSW8x+aJijDpgg4xXFPOsXisBh6dSbaprlt2s/wDJny2c5bSoY2pKC+P3r+v/AAT3X4S/HHxJ8MrgadI51DRC2Xt2fOwE8mI/w/TpX6b+CPHGgePtCh17w9OJreThgeGRh1Vh2Ir8u/g38G9Y+KGqiV0Nto0DD7RcgEZA/gj9WPc9q/VPwv4Y0fwjo8GiaHbi3tbcAKoxk+pJ7k9zX9K+DH9ryoN4l/uPs33+XkfmPEyw6qfu/j62Oiooor94Plj/0f37Of4a+Y/2lv2hbb4BeG9Pv/sR1DUtYmNvaxsdsYYDJaRgDgD0HWvpC9aZLeR7cbpVVii5wC2OB+dfhtffH3W/i1dS+A/j3DFLo93ctC7xRiG40mfcU8yNuv7o8MGzkDmvk+Js6jhKfI3aU9E+ifmfo/hvwbPNcTKs6fPSo2lON7SlHtHu/uIfGH7Xvxy8ZW15p13q1vaabeK0b2sNnAYzG3BRjKjswI65NfP3/CSa2F2xTJEP+mUEUX/oCCrvxQ8Da/8ABfxM3hjxZ/pFrMvm2GoQrmK7tz91wBkhsfeHY/nXArrmmH/ltj6qw/pX895vUzGVVrESlJrz/I/v7hbK+GpYOFbLsPSUJK/wq/zum79Hc7L/AISfxJjA1S5QeiTOo/IEVYh8XeKLZxJb6zexOvRkuZVI+hDZrhG13Sh/y3H5N/hQuvaUefPGPo3+FeP7HE72Z9N9Ry21vZwt6R/yPSl+InjyOXzk8RagX65a6lY5H+8xq2vxN8Zl2kuLyO7ZuWM9tBKx+rMhb9a4q2tL2/0e58QWdpPLpdlzNciJvKTJxyxGM+w5rnH8QaWMCKUysxACKp3EnoOlCwOIS5XB6+R51TLcir8ylTpS5dH7sXby8j9Kf2ef2vfEFprOkeAvE2l2smn3Mi28UtnF5LxsxwCyDKsPU8Gv1mjbeob1r8GtE0Fv2f8AQ9M+IXiOKO88dayvmaZZOQYtMtyOJ5F/ilYfdB4FfqX+yv4w8ceO/hlD4k8dT/aLu4nk8p9gj3RDpwMCv37gbMqkP9gxEuaaV9FpFdmz+JPGThPAx/4WMopKnhm+Td+/K7u4R191Wte+u60Pp2iiiv0o/AD/0v35fpX51/tI/sSy/EDX7r4g/C29j0vWr357yznH+i3Ug/jBAyjt/Eeh68Hr+ixAIwaXHavJzHLaOKpulXjdHvcOcS43KcSsXgKjjNfiuzXVH4AeOPgt+1TYLofhzxfoD6pAkhs9NRLuOVA5UuUjLMCPlUnngYrmZP2d/wBouLI/4VtqBI/uvCw/9Cr9a/2pdJ1rxZf/AA68E+GdQudL1HUNcE73NnIYZobS3hc3DrIvKkqwQHnlqjtvgFod5cTWVt8WvF89zB/rY018s6f7wAyPxr5Kr4bYKpLmlKX3n7DgfpF5zh6fs4UqVv8ADbffZ9Wfkif2fv2h+h+Gmog/WH/4qvZfg7+yf418R6vJdfFTR5fDWj2BDyRyNGZ58c7RtLBV9SefSvpBr74XjxhqHhXwj8VPF/iLWfD0kRuof7ZnNtuLf6tnCqH5GGCt7ZzX2FffD67+IfhEadrF5faAt2FJaxuPKulAOc+btYjPfv71vhfDPLqc1UlzO3RvRmGbfSPz/E0JUKShByVuaKd16Xb1PhX47+B/i1r+iWngX4Q+A5n8Oqq/NG8UMbIvQAOwJLHkkivjTWv2f/j54ZWxuNb8Gf2al/dw2cMklzCc3Ex/dj5GJGSOtfr2f2U7MgD/AIWX444GONenH8hXg3xv+AGtfDyLwl430Hxj4m8QWWka7ZS6haarqs99Cbdn2+YI2OMxk5zg105nwRhcVW9tUb8ktEkeLwt405rlGD+p4SELNttyTcpN7ttvU8v8B/sO/Ffxhr0Gt/G/X0t7SPbut7eU3FzKqdEMr8IMccZ46V+q3h7w/pfhfSLTQNGgFtZ2UaxxRr0VV4FbUHlyIJV5Dcg+xqfAznvXuZVkeGwafsI6vd9X8z4vijjTMM3lF42peMfhilaK9EtBaKKK9c+VP//T/fyikOewzS1h1A+XP2iI/FniDVvB/wAOPCt8dATxTczRahq8WFuoLGBA8sNq5B2TT5ChuoAJHIr4q/aOtfhD4Pi0f4a/By0n0i/ttQgg17WtDDS3sNrcBo3tmkQmSe5uSw+TLMBlzgc1+qXinwd4W8c6VLoXjHSLbWdOlwXt7uJJ4mI6Ha4IyPWvjb45fsueLLrVvh54l/ZubRvCsvgC9luY9Klg+z6dcCdDHIStuvD7GIDbSfetwPKPhT4K8LeI/jLoeieIvCc/gDSvDFm0nh3SLqHyrjVPLI8y7uZlLBypwREWJUnLcmv1DQbUAr538GfDLx5qPjW1+JHxev7O61TS7aS206x05WW0tFn2mZ98h3yO+0DJAAAwB1r6Lptt7iSS2CoZreG4UpOgkU9mGR+RqaikMaqhBtHAFOoooAKKKKAP/9T9/KKKKLAFFFFABRRRQAUUUUAFFFFABRRRQB//2Q==";

  return `
  <style>
    @media print {
      .inv-table tr { page-break-inside: avoid; break-inside: avoid; }
      .inv-header, .inv-client-box, .inv-totals, .inv-note-box { page-break-inside: avoid; break-inside: avoid; }
      #invoice-print { padding: 0 !important; }
    }
  </style>
  <div id="invoice-print">
    <div class="inv-header">
      <div class="inv-header-left">
        <img src="${logoBase64}" class="inv-logo" alt="Logo" />
        <div class="inv-company">
          <h2>${EMPRESA.nombre}</h2>
          <div class="ruc">${EMPRESA.ruc}</div>
          <div class="tagline">${EMPRESA.tagline}</div>
          <div class="ruc" style="margin-top:8px;">${EMPRESA.celular} &nbsp;|&nbsp; ${EMPRESA.email}</div>
        </div>
      </div>
      <div class="inv-meta">
        <div class="cot-label">Cotización</div>
        <div class="cot-num">No. ${String(numero).padStart(3, '0')}</div>
        <div class="fecha">${fechaFmt}</div>
        <div class="fecha" style="margin-top:4px;color:#555;">Panamá</div>
      </div>
    </div>

    <div class="inv-client-box">
      <div class="lbl">Cliente</div>
      <div class="name">${escapeHTML(cliente)}</div>
      ${direccion ? `<div class="dir">${escapeHTML(direccion)}</div>` : ''}
    </div>

    <table class="inv-table">
      <thead>
        <tr>
          <th class="right" style="width:55px;">Cant.</th>
          <th>Descripción</th>
          <th class="right" style="width:110px;">Precio/U</th>
          <th class="right" style="width:110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px;">Sin artículos</td></tr>'}
      </tbody>
    </table>

    <div style="display:flex; justify-content:flex-end;">
      <div class="inv-totals">
        <div class="inv-totals-row">
          <span>Subtotal</span>
          <span>${EMPRESA.moneda} ${fmt(subtotal)}</span>
        </div>
        ${itbmsRow}
        <div class="inv-totals-row">
          <span>TOTAL</span>
          <span>${EMPRESA.moneda} ${fmt(total)}</span>
        </div>
      </div>
    </div>

    ${notaHTML}

    <div class="inv-footer" style="padding-top: 20px;">
      ${EMPRESA.nombre} &nbsp;·&nbsp; ${EMPRESA.celular} &nbsp;·&nbsp; ${EMPRESA.email}
    </div>
  </div>`;
}
// ===== SHOW PREVIEW =====
function showPreview() {
  console.log("Mostrando vista previa...");
  const cliente = document.getElementById('cliente').value;
  saveClient(cliente);
  document.getElementById('preview-area').innerHTML = buildInvoiceHTML();
  document.getElementById('modal-backdrop').classList.add('open');
}

// ===== CLOSE MODAL =====
function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
}

// ===== DOWNLOAD PDF (NATIVE PRINT - 100% FIABLE) =====
function downloadPDF() {
  triggerHaptic();
  console.log("Iniciando impresión nativa de PDF...");
  const numero = document.getElementById('numero').value || '1';
  let cliente = document.getElementById('cliente').value.trim() || 'Cliente';
  saveClient(cliente);

  const filename = `COT-${numero}-${cliente.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // 1. Ocultar la UI de la aplicación temporalmente
  const appHeader = document.querySelector('.app-header');
  const appContainer = document.querySelector('.container');
  const modales = document.querySelectorAll('.modal-backdrop');
  
  if (appHeader) appHeader.style.display = 'none';
  if (appContainer) appContainer.style.display = 'none';
  modales.forEach(m => m.classList.remove('open'));

  // 2. Inyectar el documento listo para imprimir en el body
  const printWrapper = document.createElement('div');
  printWrapper.id = 'native-print-wrapper';
  printWrapper.className = 'pdf-rendering-mode'; 
  printWrapper.style.width = '100%';
  printWrapper.style.maxWidth = '800px';
  printWrapper.style.margin = '0 auto';
  printWrapper.style.backgroundColor = '#ffffff';
  printWrapper.style.minHeight = '100vh';
  printWrapper.innerHTML = buildInvoiceHTML();
  
  document.body.appendChild(printWrapper);
  const oldBg = document.body.style.background;
  document.body.style.background = '#ffffff';

  // 3. Cambiar nombre del documento para que el PDF se guarde con ese título exacto
  const originalTitle = document.title;
  document.title = filename;

  // 4. Invocar el diálogo de impresión nativo del sistema
  // Esto pausa la ejecución hasta que el usuario imprima o cancele en su Mac/PC.
  setTimeout(() => {
    window.print();
    
    // 5. Restaurar todo inmediatamente al regresar
    document.title = originalTitle;
    document.body.removeChild(printWrapper);
    document.body.style.background = oldBg;
    
    if (appHeader) appHeader.style.display = '';
    if (appContainer) appContainer.style.display = '';
  }, 100);
}

// ===== NUEVA COTIZACION =====
function newCotizacion() {
  triggerHaptic();
  if (!confirm('¿Estás seguro de iniciar una nueva cotización? Se borrarán los datos actuales.')) return;

  // Increment number
  const numInput = document.getElementById('numero');
  numInput.value = +numInput.value + 1;
  saveInvoiceNumber();

  // Clear fields
  document.getElementById('cliente').value = '';
  document.getElementById('direccion').value = '';
  document.getElementById('nota').value = '';
  document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

  // Clear items
  items = [];
  nextId = 1;
  document.getElementById('items-body').innerHTML = '';
  addItem();

  updateBadge();
  recalcTotals();
}

// ===== ESCAPE HTML =====
function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

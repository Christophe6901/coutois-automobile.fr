/* ============================================
   GARAGE SITE — App.js
   Chargement véhicules, affichage catalogue,
   navigation, interactions
   ============================================ */

const App = {
  vehicles: [],
  allVehicles: [],

  SOLD_DISPLAY_DAYS: 7,

  async init() {
    await this.loadVehicles();
    this.setupNavToggle();
    this.highlightCurrentNav();
  },

  async loadVehicles() {
    let data = [];
    try {
      const response = await fetch('data/vehicles.json');
      if (!response.ok) throw new Error('Fichier non trouvé');
      data = await response.json();
    } catch (e) {
      const stored = localStorage.getItem('garage_vehicles');
      if (stored) data = JSON.parse(stored);
    }

    // Ensure every vehicle has an ID (Decap CMS files may not have one)
    data.forEach(function(v, i) {
      if (!v.id) {
        v.id = (v.reference || v.brand + '-' + v.model + '-' + v.year).toLowerCase().replace(/[^a-z0-9]/g, '-');
      }
    });

    const now = new Date();

    // Keep: all "sale" + "sold" within 7 days
    this.allVehicles = data.filter(v => {
      if (v.status === 'sale') return true;
      if (v.status === 'sold' && v.soldDate) {
        const diff = (now - new Date(v.soldDate)) / (1000 * 60 * 60 * 24);
        return diff <= this.SOLD_DISPLAY_DAYS;
      }
      return false;
    });

    this.vehicles = this.allVehicles.filter(v => v.status === 'sale');
  },

  renderVehicleGrid(containerId, limit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Homepage: sale only. Catalogue: sale + recently sold
    const isHomepage = limit !== undefined;
    const source = isHomepage ? this.vehicles : this.allVehicles;
    
    // Sort: sale first, sold last
    const sorted = source.slice().sort(function(a, b) {
      if (a.status === 'sale' && b.status !== 'sale') return -1;
      if (a.status !== 'sale' && b.status === 'sale') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    const items = limit ? sorted.slice(0, limit) : sorted;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="icon">🚗</div>
          <h3>Aucun véhicule disponible</h3>
          <p>De nouveaux véhicules arrivent régulièrement, revenez bientôt !</p>
        </div>`;
      return;
    }

    container.innerHTML = items.map((v, i) => {
      const isSold = v.status === 'sold';
      return `
      <a href="vehicule.html?id=${v.id}" class="vehicle-card anim-scale delay-${Math.min(i % 4 + 1, 4)}">
        <div class="vehicle-card-img">
          <img src="${v.photos && v.photos[0] ? v.photos[0] : 'https://via.placeholder.com/600x400?text=Photo'}" 
               alt="${v.brand} ${v.model}" loading="lazy"
               ${isSold ? 'style="filter: brightness(0.65) grayscale(0.3);"' : ''}>
          ${isSold 
            ? '<div class="vehicle-card-sold-banner">VENDU</div>' 
            : `<div class="vehicle-card-price">${App.formatPrice(v.price)}</div>`}
        </div>
        <div class="vehicle-card-body">
          <h3>${isSold ? '<span style="color:var(--grey);">' + v.brand + ' ' + v.model + '</span>' : v.brand + ' ' + v.model}</h3>
          <div class="vehicle-tags">
            <span class="tag tag-primary">${v.year}</span>
            <span class="tag">${App.formatKm(v.km)}</span>
            <span class="tag">${v.fuel}</span>
            <span class="tag">${v.gearbox}</span>
          </div>
        </div>
      </a>`;
    }).join('');
  },

  renderVehicleDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    const v = this.allVehicles.find(x => x.id === id);
    if (!v) {
      const dc = document.getElementById('vehicle-detail');
      if (dc) {
        dc.innerHTML = `
          <div class="empty-state">
            <div class="icon">🔍</div>
            <h3>Véhicule non trouvé</h3>
            <p>Ce véhicule n'est plus disponible ou l'adresse est incorrecte.</p>
            <a href="vehicules.html" class="btn btn-accent" style="margin-top:20px;">Voir nos véhicules</a>
          </div>`;
      }
      return;
    }

    const isSold = v.status === 'sold';

    // Title
    const titleEl = document.getElementById('detail-title');
    if (titleEl) titleEl.textContent = `${v.brand} ${v.model}`;

    document.title = `${v.brand} ${v.model} — Coutois Automobile`;

    // Main image
    const mainImg = document.getElementById('detail-main-image');
    if (mainImg && v.photos && v.photos[0]) {
      mainImg.src = v.photos[0];
      mainImg.alt = `${v.brand} ${v.model}`;
    }

    // VENDU overlay on main image
    if (isSold) {
      const imgContainer = document.querySelector('.detail-main-img');
      if (imgContainer) {
        imgContainer.style.position = 'relative';
        const banner = document.createElement('div');
        banner.className = 'detail-sold-overlay';
        banner.textContent = 'VENDU';
        imgContainer.appendChild(banner);
      }
    }

    // Thumbnails
    const thumbsContainer = document.getElementById('detail-thumbs');
    if (thumbsContainer && v.photos) {
      thumbsContainer.innerHTML = v.photos.map((p, i) => `
        <img src="${p}" alt="Photo ${i+1}" class="${i === 0 ? 'active' : ''}"
             onclick="App.switchDetailPhoto('${p}', this)">`).join('');
    }

    // Specs
    const specs = [
      { label: 'Prix', value: isSold ? 'VENDU' : App.formatPrice(v.price), highlight: true, isPrice: !isSold, isSold },
      { label: 'Année', value: v.year },
      { label: 'Kilométrage', value: App.formatKm(v.km) },
      { label: 'Carburant', value: v.fuel },
      { label: 'Boîte de vitesse', value: v.gearbox },
      { label: 'Puissance', value: v.power || '—' },
      { label: 'Puissance fiscale', value: v.fiscal || '—' },
      { label: 'Couleur', value: v.color || '—' },
      { label: 'Mise en circulation', value: v.registration || '—' },
      { label: 'Référence', value: v.reference || '—' },
    ];

    const specsContainer = document.getElementById('detail-specs');
    if (specsContainer) {
      specsContainer.innerHTML = specs.map(s => `
        <div class="detail-spec-row ${s.highlight ? 'highlight' : ''}">
          <span class="detail-spec-label">${s.label}</span>
          <span class="detail-spec-value ${s.isPrice ? 'price' : ''} ${s.isSold ? 'sold-text' : ''}">${s.value}</span>
        </div>`).join('');
    }

    // Guarantee bar
    const guaranteeEl = document.getElementById('detail-guarantee');
    if (guaranteeEl) {
      if (isSold) {
        guaranteeEl.textContent = 'CE VÉHICULE A ÉTÉ VENDU';
        guaranteeEl.style.background = 'var(--grey-dark)';
      } else if (v.guarantee) {
        guaranteeEl.textContent = `GARANTIE ${v.guarantee.toUpperCase()} INCLUSE`;
      }
    }

    // Description
    const descEl = document.getElementById('detail-description');
    if (descEl && v.description) descEl.textContent = v.description;

    // Equipment
    const equipContainer = document.getElementById('detail-equipment');
    if (equipContainer && v.equipment) {
      equipContainer.innerHTML = v.equipment.map(eq => `
        <div class="detail-equipment-item">
          <span class="check">✓</span> ${eq}
        </div>`).join('');
    }
  },

  switchDetailPhoto(src, thumbEl) {
    const mainImg = document.getElementById('detail-main-image');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('#detail-thumbs img').forEach(img => img.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  },

  formatPrice(p) { return new Intl.NumberFormat('fr-FR').format(p) + ' €'; },
  formatKm(k) { return new Intl.NumberFormat('fr-FR').format(k) + ' km'; },

  setupNavToggle() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
    }
  },

  highlightCurrentNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());

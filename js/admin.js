/* ============================================
   GARAGE SITE — Admin.js
   Back-office gestion des véhicules
   localStorage + export JSON
   ============================================ */

const Admin = {
  vehicles: [],
  editingId: null,
  photoFiles: [],

  // --- Init ---
  init() {
    try {
      this.loadVehicles();
      this.renderList();
      this.setupForm();
      this.setupPhotoUpload();
      this.setupExport();
      this.setupImport();
      this.updateStats();
      console.log('[Admin] Initialisé. ' + this.vehicles.length + ' véhicule(s) en mémoire.');
    } catch (err) {
      console.error('[Admin] Erreur init:', err);
      alert('Erreur d\'initialisation: ' + err.message);
    }
  },

  // --- Storage ---
  loadVehicles() {
    try {
      const stored = localStorage.getItem('garage_vehicles');
      if (stored) {
        this.vehicles = JSON.parse(stored);
      } else {
        this.vehicles = [];
      }
      this.autoCleanSold();
    } catch (err) {
      console.error('[Admin] Erreur chargement:', err);
      this.vehicles = [];
    }
  },

  saveVehicles() {
    try {
      var json = JSON.stringify(this.vehicles);
      // Check size before saving (localStorage limit ~5MB)
      var sizeKB = Math.round(json.length / 1024);
      console.log('[Admin] Taille données: ' + sizeKB + ' Ko');
      if (sizeKB > 4500) {
        this.toast('Attention: les données approchent la limite. Réduisez le nombre de photos.', 'error');
      }
      localStorage.setItem('garage_vehicles', json);
      this.renderList();
      this.updateStats();
    } catch (err) {
      console.error('[Admin] Erreur sauvegarde:', err);
      if (err.name === 'QuotaExceededError' || err.message.indexOf('quota') !== -1 || err.message.indexOf('Quota') !== -1) {
        this.toast('Espace de stockage plein ! Supprimez des véhicules ou des photos.', 'error');
        // Try to help: show current storage usage
        var total = 0;
        for (var key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            total += localStorage.getItem(key).length;
          }
        }
        console.log('[Admin] Stockage utilisé: ' + Math.round(total / 1024) + ' Ko');
      } else {
        this.toast('Erreur de sauvegarde: ' + err.message, 'error');
      }
    }
  },

  // --- Auto-clean sold vehicles (7 days) ---
  autoCleanSold() {
    const DAYS_BEFORE_REMOVAL = 7;
    const now = new Date();
    let changed = false;
    this.vehicles = this.vehicles.filter(function(v) {
      if (v.status === 'sold' && v.soldDate) {
        var soldDate = new Date(v.soldDate);
        var diffDays = (now - soldDate) / (1000 * 60 * 60 * 24);
        if (diffDays > DAYS_BEFORE_REMOVAL) {
          changed = true;
          return false;
        }
      }
      return true;
    });
    if (changed) this.saveVehicles();
  },

  // --- Stats ---
  updateStats() {
    var onSale = this.vehicles.filter(function(v) { return v.status === 'sale'; }).length;
    var sold = this.vehicles.filter(function(v) { return v.status === 'sold'; }).length;
    var total = this.vehicles.length;
    var el = document.getElementById('admin-stats');
    if (el) {
      el.innerHTML = '<span style="color:#10b981;font-weight:700;">' + onSale + ' en vente</span> · ' +
        '<span style="color:#92400e;font-weight:700;">' + sold + ' vendu(s)</span> · ' +
        total + ' total';
    }
  },

  // --- Render vehicle list ---
  renderList() {
    var container = document.getElementById('admin-vehicle-list');
    if (!container) return;

    if (this.vehicles.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:40px 20px;">' +
        '<div class="icon">📋</div>' +
        '<h3>Aucun véhicule</h3>' +
        '<p>Utilisez le formulaire pour ajouter votre premier véhicule.</p>' +
        '</div>';
      return;
    }

    var sorted = this.vehicles.slice().sort(function(a, b) {
      if (a.status === 'sale' && b.status !== 'sale') return -1;
      if (a.status !== 'sale' && b.status === 'sale') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var v = sorted[i];
      html += '<div class="admin-vehicle-item" data-id="' + v.id + '">' +
        '<div class="admin-vehicle-info">' +
        '<h4>' + v.brand + ' ' + v.model +
        ' <span class="admin-status ' + (v.status === 'sale' ? 'admin-status-sale' : 'admin-status-sold') + '">' +
        (v.status === 'sale' ? 'En vente' : 'Vendu') + '</span></h4>' +
        '<div class="meta">' + Admin.formatPrice(v.price) + ' · ' + v.year + ' · ' + Admin.formatKm(v.km) + ' · ' + v.fuel +
        (v.status === 'sold' && v.soldDate ? ' · Vendu le ' + new Date(v.soldDate).toLocaleDateString('fr-FR') : '') +
        '</div></div>' +
        '<div class="admin-vehicle-actions">';

      if (v.status === 'sale') {
        html += '<button class="admin-btn admin-btn-edit" onclick="Admin.editVehicle(\'' + v.id + '\')">Modifier</button>' +
          '<button class="admin-btn admin-btn-sold" onclick="Admin.markSold(\'' + v.id + '\')">Vendu ✓</button>';
      } else {
        html += '<button class="admin-btn admin-btn-edit" onclick="Admin.markOnSale(\'' + v.id + '\')">Remettre en vente</button>';
      }
      html += '<button class="admin-btn admin-btn-delete" onclick="Admin.deleteVehicle(\'' + v.id + '\')">Supprimer</button>' +
        '</div></div>';
    }
    container.innerHTML = html;
  },

  // --- Form setup ---
  setupForm() {
    // Use CLICK on submit button instead of form submit event (more reliable in file:// mode)
    var submitBtn = document.getElementById('admin-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        Admin.saveVehicleFromForm();
      });
      console.log('[Admin] Bouton submit connecté.');
    } else {
      console.error('[Admin] Bouton admin-submit-btn non trouvé !');
    }

    // Also prevent default form submission
    var form = document.getElementById('admin-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        Admin.saveVehicleFromForm();
      });
    }

    // Cancel edit button
    var cancelBtn = document.getElementById('admin-cancel-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        Admin.resetForm();
      });
    }
  },

  // --- Save vehicle from form ---
  saveVehicleFromForm() {
    console.log('[Admin] saveVehicleFromForm appelé.');

    var brand = (document.getElementById('f-brand').value || '').trim();
    var model = (document.getElementById('f-model').value || '').trim();
    var price = parseInt(document.getElementById('f-price').value) || 0;
    var year = parseInt(document.getElementById('f-year').value) || new Date().getFullYear();
    var km = parseInt(document.getElementById('f-km').value) || 0;
    var fuel = document.getElementById('f-fuel').value || 'Diesel';
    var gearbox = document.getElementById('f-gearbox').value || 'Manuelle';
    var power = (document.getElementById('f-power').value || '').trim();
    var fiscal = (document.getElementById('f-fiscal').value || '').trim();
    var color = (document.getElementById('f-color').value || '').trim();
    var registration = (document.getElementById('f-registration').value || '').trim();
    var guarantee = (document.getElementById('f-guarantee').value || '3 mois').trim();
    var description = (document.getElementById('f-description').value || '').trim();
    var equipmentRaw = (document.getElementById('f-equipment').value || '').trim();
    var equipment = equipmentRaw ? equipmentRaw.split('\n').map(function(e) { return e.trim(); }).filter(Boolean) : [];

    console.log('[Admin] Données:', brand, model, price);

    if (!brand || !model || !price) {
      this.toast('Veuillez remplir au minimum : Marque, Modèle, Prix', 'error');
      return;
    }

    // Photos
    var photos = this.photoFiles.map(function(p) { return p.dataUrl; });

    if (this.editingId) {
      // Update existing
      for (var i = 0; i < this.vehicles.length; i++) {
        if (this.vehicles[i].id === this.editingId) {
          var existing = this.vehicles[i];
          this.vehicles[i] = {
            id: existing.id,
            brand: brand, model: model, price: price, year: year, km: km,
            fuel: fuel, gearbox: gearbox, power: power, fiscal: fiscal,
            color: color, registration: registration, guarantee: guarantee,
            description: description, equipment: equipment,
            photos: photos.length > 0 ? photos : existing.photos,
            reference: existing.reference,
            status: existing.status,
            soldDate: existing.soldDate,
            createdAt: existing.createdAt
          };
          break;
        }
      }
      this.toast(brand + ' ' + model + ' mis à jour !', 'success');
      this.editingId = null;
    } else {
      // New vehicle
      var newVehicle = {
        id: 'v' + Date.now(),
        brand: brand, model: model, price: price, year: year, km: km,
        fuel: fuel, gearbox: gearbox, power: power, fiscal: fiscal,
        color: color, registration: registration,
        reference: 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        guarantee: guarantee,
        description: description, equipment: equipment,
        photos: photos,
        status: 'sale',
        soldDate: null,
        createdAt: new Date().toISOString().split('T')[0]
      };
      this.vehicles.unshift(newVehicle);
      this.toast(brand + ' ' + model + ' ajouté !', 'success');
      console.log('[Admin] Véhicule ajouté:', newVehicle.id);
    }

    this.saveVehicles();
    this.resetForm();
  },

  // --- Edit vehicle ---
  editVehicle(id) {
    var v = null;
    for (var i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].id === id) { v = this.vehicles[i]; break; }
    }
    if (!v) return;

    this.editingId = id;
    this.photoFiles = (v.photos || []).map(function(p, i) { return { name: 'photo-' + i, dataUrl: p }; });

    document.getElementById('f-brand').value = v.brand || '';
    document.getElementById('f-model').value = v.model || '';
    document.getElementById('f-price').value = v.price || '';
    document.getElementById('f-year').value = v.year || '';
    document.getElementById('f-km').value = v.km || '';
    document.getElementById('f-fuel').value = v.fuel || 'Diesel';
    document.getElementById('f-gearbox').value = v.gearbox || 'Manuelle';
    document.getElementById('f-power').value = v.power || '';
    document.getElementById('f-fiscal').value = v.fiscal || '';
    document.getElementById('f-color').value = v.color || '';
    document.getElementById('f-registration').value = v.registration || '';
    document.getElementById('f-guarantee').value = v.guarantee || '';
    document.getElementById('f-description').value = v.description || '';
    document.getElementById('f-equipment').value = (v.equipment || []).join('\n');

    this.renderPhotoPreview();

    document.getElementById('admin-form-title').textContent = 'Modifier le véhicule';
    document.getElementById('admin-submit-btn').textContent = 'METTRE À JOUR';
    document.getElementById('admin-cancel-edit').style.display = 'inline-block';

    document.getElementById('admin-form').scrollIntoView({ behavior: 'smooth' });
  },

  // --- Mark as sold ---
  markSold(id) {
    var v = null;
    for (var i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].id === id) { v = this.vehicles[i]; break; }
    }
    if (!v) return;
    if (!confirm('Marquer "' + v.brand + ' ' + v.model + '" comme VENDU ?\n\nIl restera visible sur le site avec un bandeau VENDU pendant 7 jours, puis sera retiré automatiquement.')) return;

    v.status = 'sold';
    v.soldDate = new Date().toISOString().split('T')[0];
    this.saveVehicles();
    this.toast(v.brand + ' ' + v.model + ' marqué comme vendu', 'success');
  },

  // --- Mark back on sale ---
  markOnSale(id) {
    var v = null;
    for (var i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].id === id) { v = this.vehicles[i]; break; }
    }
    if (!v) return;
    v.status = 'sale';
    v.soldDate = null;
    this.saveVehicles();
    this.toast(v.brand + ' ' + v.model + ' remis en vente', 'success');
  },

  // --- Delete vehicle ---
  deleteVehicle(id) {
    var v = null;
    for (var i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].id === id) { v = this.vehicles[i]; break; }
    }
    if (!v) return;
    if (!confirm('Supprimer définitivement "' + v.brand + ' ' + v.model + '" ?')) return;

    this.vehicles = this.vehicles.filter(function(x) { return x.id !== id; });
    this.saveVehicles();
    this.toast('Véhicule supprimé', 'success');
  },

  // --- Reset form ---
  resetForm() {
    var form = document.getElementById('admin-form');
    if (form) form.reset();
    // Manually clear fields that reset() might not handle
    document.getElementById('f-guarantee').value = '3 mois';
    this.editingId = null;
    this.photoFiles = [];
    this.renderPhotoPreview();
    document.getElementById('admin-form-title').textContent = 'Ajouter un véhicule';
    document.getElementById('admin-submit-btn').textContent = 'AJOUTER LE VÉHICULE';
    document.getElementById('admin-cancel-edit').style.display = 'none';
  },

  // --- Photo upload with compression ---
  setupPhotoUpload() {
    var input = document.getElementById('f-photos');
    var area = document.getElementById('photo-upload-area');
    if (!input || !area) return;

    area.addEventListener('click', function() { input.click(); });

    input.addEventListener('change', function(e) {
      var files = Array.from(e.target.files);
      files.forEach(function(file) {
        if (!file.type.startsWith('image/')) return;
        Admin.compressImage(file, function(compressedDataUrl) {
          Admin.photoFiles.push({ name: file.name, dataUrl: compressedDataUrl });
          Admin.renderPhotoPreview();
        });
      });
      // Reset input so same file can be re-added
      input.value = '';
    });
  },

  // Compress image: max 800px wide, JPEG 70% quality
  compressImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var MAX_WIDTH = 800;
        var MAX_HEIGHT = 600;
        var width = img.width;
        var height = img.height;

        // Scale down if needed
        if (width > MAX_WIDTH) {
          height = Math.round(height * MAX_WIDTH / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round(width * MAX_HEIGHT / height);
          height = MAX_HEIGHT;
        }

        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG 70%
        var compressed = canvas.toDataURL('image/jpeg', 0.7);
        console.log('[Admin] Photo compressée: ' + file.name + ' → ' + Math.round(compressed.length / 1024) + ' Ko');
        callback(compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },

  renderPhotoPreview() {
    var container = document.getElementById('photo-preview');
    if (!container) return;

    if (this.photoFiles.length === 0) {
      container.innerHTML = '';
      return;
    }

    var html = '';
    for (var i = 0; i < this.photoFiles.length; i++) {
      html += '<div class="photo-preview-item">' +
        '<img src="' + this.photoFiles[i].dataUrl + '" alt="' + this.photoFiles[i].name + '">' +
        '<button class="photo-preview-remove" onclick="Admin.removePhoto(' + i + ')" title="Supprimer">×</button>' +
        '</div>';
    }
    container.innerHTML = html;
  },

  removePhoto(index) {
    this.photoFiles.splice(index, 1);
    this.renderPhotoPreview();
  },

  // --- Export JSON ---
  setupExport() {
    var btn = document.getElementById('admin-export-btn');
    if (btn) {
      btn.addEventListener('click', function() {
        var now = new Date();
        var publicData = Admin.vehicles.filter(function(v) {
          if (v.status === 'sale') return true;
          if (v.status === 'sold' && v.soldDate) {
            var diff = (now - new Date(v.soldDate)) / (1000 * 60 * 60 * 24);
            return diff <= 7;
          }
          return false;
        });
        var json = JSON.stringify(publicData, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'vehicles.json';
        a.click();
        URL.revokeObjectURL(url);
        Admin.toast('Fichier vehicles.json exporté !', 'success');
      });
    }

    var btnAll = document.getElementById('admin-export-all-btn');
    if (btnAll) {
      btnAll.addEventListener('click', function() {
        var json = JSON.stringify(Admin.vehicles, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'vehicles-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        Admin.toast('Sauvegarde complète exportée !', 'success');
      });
    }
  },

  // --- Import JSON ---
  setupImport() {
    var input = document.getElementById('admin-import-input');
    var btn = document.getElementById('admin-import-btn');
    if (!input || !btn) return;

    btn.addEventListener('click', function() { input.click(); });

    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (!Array.isArray(data)) throw new Error('Format invalide');
          if (!confirm('Importer ' + data.length + ' véhicule(s) ? Les données actuelles seront remplacées.')) return;
          Admin.vehicles = data;
          Admin.saveVehicles();
          Admin.toast(data.length + ' véhicule(s) importé(s) !', 'success');
        } catch (err) {
          Admin.toast('Erreur : fichier JSON invalide', 'error');
        }
      };
      reader.readAsText(file);
    });
  },

  // --- Toast notification ---
  toast(message, type) {
    type = type || 'success';
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() { toast.remove(); }, 4000);
  },

  // --- Helpers ---
  formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price) + ' €';
  },

  formatKm(km) {
    return new Intl.NumberFormat('fr-FR').format(km) + ' km';
  }
};

// --- Auto-init ---
document.addEventListener('DOMContentLoaded', function() {
  Admin.init();
});

// Fallback if DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(function() { Admin.init(); }, 100);
}

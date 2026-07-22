/**
 * TOP CAR VISSENBJERG - Application Controller
 * Handles client-side interactivity, catalog filtering, valuation wizard, form bookings, and dealer admin CRUD.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================================
    // 1. STATE INITIALIZATION
    // ==========================================================================
    let cars = [];
    let isAdmin = false;
    
    // Load cars from localStorage or default database from cars.js
    function initInventory() {
        const storedInventory = localStorage.getItem("topcar_inventory");
        const dbVersion = localStorage.getItem("topcar_db_version");
        const currentVersion = "1.8"; // Force upgrade to load fresh sold states and cache-bust localStorage
        
        if (storedInventory && dbVersion === currentVersion) {
            try {
                cars = JSON.parse(storedInventory);
            } catch (e) {
                console.error("Fejl ved indlæsning af lager fra localStorage, genindlæser standarder", e);
                cars = [...window.defaultCars];
                saveInventoryToStorage();
            }
        } else {
            cars = [...window.defaultCars];
            saveInventoryToStorage();
            localStorage.setItem("topcar_db_version", currentVersion);
        }
    }

    function saveInventoryToStorage() {
        localStorage.setItem("topcar_inventory", JSON.stringify(cars));
    }

    // Load admin state
    function initAdminState() {
        isAdmin = sessionStorage.getItem("topcar_admin") === "true";
        updateAdminUI();
    }

    // Active filters state
    const filters = {
        search: "",
        brand: "",
        model: "",
        fuel: ""
    };

    // ==========================================================================
    // 2. DOM ELEMENTS CACHE
    // ==========================================================================
    // Header & Theme
    const themeToggleBtn = document.getElementById("theme-toggle");
    const themeIcon = themeToggleBtn.querySelector(".theme-icon");
    const header = document.querySelector(".main-header");
    const adminIndicator = document.getElementById("admin-indicator");
    const adminActionsBar = document.getElementById("admin-actions-bar");
    const addCarBtn = document.getElementById("add-car-btn");
    const adminLoginToggle = document.getElementById("admin-login-toggle");

    // Drawer Menu (Mobile)
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const mobileDrawer = document.getElementById("mobile-drawer");
    const mobileDrawerClose = document.getElementById("mobile-drawer-close");
    const drawerOverlay = document.getElementById("drawer-overlay");

    // Inventory & Filters
    const carsGrid = document.getElementById("cars-grid");
    const searchInputHero = document.getElementById("search-input-hero");
    const filterBrand = document.getElementById("filter-brand");
    const filterModel = document.getElementById("filter-model");
    const filterFuel = document.getElementById("filter-fuel");
    const searchStockBtn = document.getElementById("search-stock-btn");
    const searchBtnCountText = document.getElementById("search-btn-count-text");
    const resultsCount = document.getElementById("results-count");
    const resetFiltersBtn = document.getElementById("reset-filters-btn");
    const emptyState = document.getElementById("empty-state");
    const emptyResetBtn = document.getElementById("empty-reset-btn");

    // Modals & Overlays
    const modalOverlay = document.getElementById("modal-overlay");
    const carDetailModal = document.getElementById("car-detail-modal");
    const carDetailModalClose = document.getElementById("detail-modal-close");
    const carDetailModalBody = carDetailModal.querySelector(".detail-modal-body");

    const testDriveModal = document.getElementById("test-drive-modal");
    const testDriveModalClose = document.getElementById("td-modal-close");
    const testDriveModalCancel = document.getElementById("td-cancel");
    const testDriveForm = document.getElementById("test-drive-form");
    const tdCarOverlay = document.getElementById("td-modal-overlay");

    const adminCarModal = document.getElementById("admin-car-modal");
    const adminCarModalClose = document.getElementById("admin-modal-close");
    const adminCarModalCancel = document.getElementById("admin-car-cancel");
    const adminCarForm = document.getElementById("admin-car-form");
    const adminModalOverlay = document.getElementById("admin-modal-overlay");

    // Valuation Wizard
    const valuationForm = document.getElementById("valuation-form");
    const valSteps = document.querySelectorAll(".wizard-step");
    const stepItems = document.querySelectorAll(".step-item");
    const nextStepBtns = document.querySelectorAll(".next-step-btn");
    const prevStepBtns = document.querySelectorAll(".prev-step-btn");
    const valuationResultBox = document.getElementById("valuation-result-box");
    const estPriceRangeLabel = document.getElementById("est-price-range");
    const valLastPrevBtn = document.getElementById("val-last-prev-btn");

    // Contact Forms
    const contactMessageForm = document.getElementById("contact-message-form");
    const toastContainer = document.getElementById("toast-container");

    // Set test drive default date to tomorrow
    const tdDateInput = document.getElementById("td-date");
    if (tdDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tdDateInput.min = tomorrow.toISOString().split("T")[0];
    }

    // ==========================================================================
    // 3. TOAST NOTIFICATION ENGINE
    // ==========================================================================
    function showToast(title, message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        let iconName = "info";
        if (type === "success") iconName = "check_circle";
        if (type === "error") iconName = "error";
        
        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">${iconName}</span>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-10px)";
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    // ==========================================================================
    // 4. THEME CONTROL
    // ==========================================================================
    function initTheme() {
        const storedTheme = localStorage.getItem("topcar_theme");
        
        if (storedTheme === "dark") {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            themeIcon.textContent = "light_mode";
        } else {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            themeIcon.textContent = "dark_mode";
        }
    }

    themeToggleBtn.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            themeIcon.textContent = "dark_mode";
            localStorage.setItem("topcar_theme", "light");
            showToast("Tema ændret", "Du har skiftet til lyst tema.", "info");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            themeIcon.textContent = "light_mode";
            localStorage.setItem("topcar_theme", "dark");
            showToast("Tema ændret", "Du har skiftet til mørkt tema.", "info");
        }
    });

    initTheme();

    // Scroll effect on Header
    window.addEventListener("scroll", () => {
        if (window.scrollY > 30) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });

    // ==========================================================================
    // 5. MOBILE NAVIGATION DRAWER
    // ==========================================================================
    function openDrawer() {
        mobileDrawer.classList.add("open");
        drawerOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
        mobileDrawer.classList.remove("open");
        drawerOverlay.classList.remove("open");
        document.body.style.overflow = "";
    }

    mobileMenuToggle.addEventListener("click", openDrawer);
    mobileDrawerClose.addEventListener("click", closeDrawer);
    drawerOverlay.addEventListener("click", closeDrawer);

    // Close drawer when link clicked
    document.querySelectorAll(".drawer-link").forEach(link => {
        link.addEventListener("click", closeDrawer);
    });

    // ==========================================================================
    // 6. INVENTORY FILTERING & RENDERING
    // ==========================================================================
    
    // Populates brand dropdown based on unique brands in active inventory
    function populateBrandDropdown() {
        const currentSelected = filterBrand.value;
        const uniqueBrands = [...new Set(cars.map(car => car.brand))].sort();
        
        filterBrand.innerHTML = `<option value="">Alle mærker</option>`;
        uniqueBrands.forEach(brand => {
            const option = document.createElement("option");
            option.value = brand;
            option.textContent = brand;
            filterBrand.appendChild(option);
        });
        
        if (uniqueBrands.includes(currentSelected)) {
            filterBrand.value = currentSelected;
        }
    }

    // Render Car Cards
    function renderInventory() {
        carsGrid.innerHTML = "";
        
        const filteredCars = cars.filter(car => {
            // Text search matches brand, model, variant, tags, or description
            const searchStr = `${car.brand} ${car.model} ${car.variant} ${car.fuelType} ${car.tags ? car.tags.join(" ") : ""} ${car.description}`.toLowerCase();
            const matchesSearch = !filters.search || searchStr.includes(filters.search.toLowerCase());
            
            // Brand matching
            const matchesBrand = !filters.brand || car.brand === filters.brand;
            
            // Model matching
            const matchesModel = !filters.model || car.model === filters.model;
            
            // Fuel type matching
            const matchesFuel = !filters.fuel || car.fuelType === filters.fuel;
            
            return matchesSearch && matchesBrand && matchesModel && matchesFuel;
        });

        // Update Results Count
        if (searchBtnCountText) {
            searchBtnCountText.textContent = `Vis ${filteredCars.length} ${filteredCars.length === 1 ? "bil" : "biler"}`;
        }
        resultsCount.textContent = `Viser ${filteredCars.length} ${filteredCars.length === 1 ? "bil" : "biler"}`;

        if (filteredCars.length === 0) {
            emptyState.classList.remove("hidden");
            carsGrid.classList.add("hidden");
        } else {
            emptyState.classList.add("hidden");
            carsGrid.classList.remove("hidden");

            // Sort so featured / unsold comes first
            const sortedCars = [...filteredCars].sort((a, b) => {
                if (a.sold !== b.sold) return a.sold ? 1 : -1; // unsold first
                if (a.featured !== b.featured) return b.featured ? 1 : -a.featured ? 1 : -1; // featured first
                return b.year - a.year; // newest year first
            });

            sortedCars.forEach(car => {
                const card = document.createElement("div");
                card.className = `card car-card ${car.sold ? "sold-car" : ""}`;
                card.dataset.id = car.id;

                // Sold Badge
                let badgeHTML = "";
                if (car.sold) {
                    badgeHTML = `<span class="badge badge-sold">Solgt</span>`;
                } else if (car.tags && car.tags.length > 0) {
                    const isNew = car.tags.includes("Nyhed");
                    const isEl = car.fuelType === "El" || car.tags.includes("Elektrisk");
                    if (isEl) {
                        badgeHTML = `<span class="badge badge-elbil">ELBIL</span>`;
                    } else {
                        badgeHTML = `<span class="badge ${isNew ? "badge-primary" : "badge-accent"}">${car.tags[0]}</span>`;
                    }
                }

                // Admin Controls HTML
                let adminControlsHTML = "";
                if (isAdmin) {
                    adminControlsHTML = `
                        <div class="admin-card-actions">
                            <button class="admin-btn admin-btn-edit" title="Rediger bil" data-id="${car.id}">
                                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                            </button>
                            <button class="admin-btn admin-btn-delete" title="Fjern bil" data-id="${car.id}">
                                <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                            </button>
                        </div>
                    `;
                }

                card.innerHTML = `
                    ${adminControlsHTML}
                    <div class="car-img-wrapper">
                        <img src="${car.image}" alt="${car.brand} ${car.model} ${car.variant}" onerror="this.src='https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'" />
                        <div class="card-badges">${badgeHTML}</div>
                        ${car.sold ? '<div class="sold-overlay"></div>' : ''}
                    </div>
                    <div class="car-card-content">
                        <h3 class="car-card-title">${car.brand} ${car.model}</h3>
                        <p class="car-card-subtitle">${car.variant}</p>
                        <p class="car-card-meta">Modelår: ${car.year} &nbsp;•&nbsp; ${car.mileage.toLocaleString("da-DK")} km</p>
                        <div class="car-card-price-container">
                            <span class="car-card-price">${car.price.toLocaleString("da-DK")} kr.</span>
                            <span class="car-card-price-label">Kontantpris</span>
                        </div>
                    </div>
                `;
                
                carsGrid.appendChild(card);
            });
        }
    }

    // Dynamically update Model dropdown based on selected Brand
    function updateModelDropdown() {
        const brand = filterBrand.value;
        filterModel.innerHTML = `<option value="">Alle modeller</option>`;
        
        if (!brand) {
            filterModel.value = "";
            filterModel.disabled = true;
            filters.model = "";
            return;
        }

        // Get unique models for this brand
        const models = [...new Set(cars.filter(c => c.brand === brand).map(c => c.model))].sort();
        models.forEach(model => {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model;
            filterModel.appendChild(option);
        });
        
        filterModel.disabled = false;
        filters.model = ""; // Reset active filter model when brand changes
    }

    // Filter event listeners
    if (searchInputHero) {
        searchInputHero.addEventListener("input", (e) => {
            filters.search = e.target.value;
            renderInventory();
        });
    }

    filterBrand.addEventListener("change", (e) => {
        filters.brand = e.target.value;
        updateModelDropdown();
        renderInventory();
    });

    filterModel.addEventListener("change", (e) => {
        filters.model = e.target.value;
        renderInventory();
    });

    if (filterFuel) {
        filterFuel.addEventListener("change", (e) => {
            filters.fuel = e.target.value;
            renderInventory();
        });
    }

    // Search Stock Button (applies filters and scrolls smoothly to the catalog grid)
    searchStockBtn.addEventListener("click", () => {
        renderInventory();
        const gridEl = document.getElementById("inventory");
        if (gridEl) {
            gridEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        showToast("Lagersøgning opdateret", "Udstillingen viser matchende biler.", "success");
    });

    function resetFilters() {
        if (searchInputHero) searchInputHero.value = "";
        filterBrand.value = "";
        updateModelDropdown();
        if (filterFuel) filterFuel.value = "";
        
        filters.search = "";
        filters.brand = "";
        filters.model = "";
        filters.fuel = "";
        
        renderInventory();
        showToast("Filtre nulstillet", "Udstillingen viser alle ledige biler.", "info");
    }

    resetFiltersBtn.addEventListener("click", resetFilters);
    emptyResetBtn.addEventListener("click", resetFilters);

    // Initial population & rendering
    initInventory();
    initAdminState();
    populateBrandDropdown();
    renderInventory();

    // ==========================================================================
    // 7. DETAIL DRAWERS & TEST DRIVE MODALS
    // ==========================================================================
    
    // Open Details Panel
    function openCarDetails(carId) {
        const car = cars.find(c => c.id === carId);
        if (!car) return;

        // Render full details contents
        const soldBadgeHTML = car.sold ? `<span class="badge badge-sold">Solgt</span>` : "";
        const ctaButtonsHTML = car.sold 
            ? `<div class="detail-actions-box">
                <p class="text-center font-bold text-muted" style="color: var(--text-secondary); margin-bottom: 8px;">Denne bil er solgt</p>
                <a href="#about-contact" id="detail-alt-contact" class="btn btn-outline w-full justify-center">Forhør om lignende bil</a>
               </div>`
            : `<div class="detail-actions-box">
                <button class="btn btn-primary w-full justify-center" id="detail-book-btn" data-id="${car.id}">
                    Book prøvetur
                    <span class="material-symbols-outlined">directions_car</span>
                </button>
                <a href="#about-contact" id="detail-contact-btn" class="btn btn-outline w-full justify-center">Stil et spørgsmål</a>
               </div>`;

        carDetailModalBody.innerHTML = `
            <div class="detail-gallery-container">
                <div class="detail-gallery-main-wrapper">
                    <img class="detail-gallery-active-img" src="${car.image}" alt="${car.brand} ${car.model}" onerror="this.src='https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'" />
                    <div class="detail-hero-gradient"></div>
                    ${soldBadgeHTML}
                    
                    <!-- Navigation Arrows (only if multiple images) -->
                    ${car.images && car.images.length > 1 ? `
                        <button class="gallery-nav-btn gallery-prev-btn" title="Forrige billede">
                            <span class="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button class="gallery-nav-btn gallery-next-btn" title="Næste billede">
                            <span class="material-symbols-outlined">chevron_right</span>
                        </button>
                        <span class="gallery-counter">1 / ${car.images.length}</span>
                    ` : ''}
                </div>
                
                <!-- Thumbnails Strip -->
                ${car.images && car.images.length > 1 ? `
                    <div class="detail-gallery-thumbs-strip">
                        ${car.images.map((img, index) => `
                            <div class="gallery-thumb-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <img src="${img}" alt="Billede ${index + 1}" onerror="this.src='https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=150&q=80'" />
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="detail-content-wrap">
                <div class="detail-header">
                    <h2 class="detail-car-title">${car.brand} ${car.model}</h2>
                    <p class="detail-car-subtitle">${car.variant}</p>
                </div>

                <!-- Blue Action Bar -->
                <div class="detail-action-blue-bar">
                    <div class="action-blue-top">
                        <div>
                            <div class="action-price-value">${car.price.toLocaleString("da-DK")} kr.</div>
                            <div class="action-price-label">Kontantpris</div>
                        </div>
                        <span class="material-symbols-outlined action-info-icon" title="Prisen er kontantpris inkl. leveringsomkostninger">info</span>
                    </div>
                    
                    <div class="action-blue-buttons">
                        <button class="action-blue-btn" id="detail-book-btn" data-id="${car.id}">
                            <span class="material-symbols-outlined">vpn_key</span>
                            Prøvetur
                        </button>
                        <a href="#about-contact" id="detail-contact-btn" class="action-blue-btn" style="text-decoration: none;">
                            <span class="material-symbols-outlined">contact_mail</span>
                            Spørgsmål
                        </a>
                    </div>
                </div>

                <!-- Technical Specs New Grid -->
                <div class="detail-specs-new-grid">
                    <div class="spec-new-item">
                        <span class="spec-new-label">Første indregistreringsår</span>
                        <span class="spec-new-value">${car.year}</span>
                    </div>
                    <div class="spec-new-item">
                        <span class="spec-new-label">Farve</span>
                        <span class="spec-new-value">${car.color || '-'}</span>
                    </div>
                    <div class="spec-new-item">
                        <span class="spec-new-label">Km</span>
                        <span class="spec-new-value">${car.mileage.toLocaleString("da-DK")}</span>
                    </div>
                    <div class="spec-new-item">
                        <span class="spec-new-label">Geartype</span>
                        <span class="spec-new-value">${car.transmission}</span>
                    </div>
                    <div class="spec-new-item">
                        <span class="spec-new-label">Drivmiddel</span>
                        <span class="spec-new-value">${car.fuelType}</span>
                    </div>
                    <div class="spec-new-item">
                        <span class="spec-new-label">Forbrug</span>
                        <span class="spec-new-value">${car.consumption || '-'}</span>
                    </div>
                </div>

                <!-- Description Box -->
                <div class="desc-section">
                    <h3 class="detail-section-title" style="margin-bottom: 12px; font-size: 15px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--accent);">description</span> 
                        Beskrivelse
                    </h3>
                    <div class="detail-desc-box" style="line-height: 1.6; font-size: 14.5px; color: var(--text-secondary); background: var(--bg-surface-alt); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border); white-space: pre-wrap;">${car.description}</div>
                </div>

                <!-- Contact Strip -->
                <div class="detail-contact-strip">
                    <a href="tel:64473800" class="contact-strip-btn">
                        <div class="contact-strip-icon-circle">
                            <span class="material-symbols-outlined">call</span>
                        </div>
                        <span>Ring op</span>
                    </a>
                    <a href="mailto:info@topcar.dk" class="contact-strip-btn">
                        <div class="contact-strip-icon-circle">
                            <span class="material-symbols-outlined">mail</span>
                        </div>
                        <span>Skriv til os</span>
                    </a>
                    <a href="#about-contact" id="detail-alt-contact" class="contact-strip-btn">
                        <div class="contact-strip-icon-circle">
                            <span class="material-symbols-outlined">phone_callback</span>
                        </div>
                        <span>Bliv ringet op</span>
                    </a>
                </div>
            </div>
        `;

        carDetailModal.classList.add("open");
        modalOverlay.classList.add("open");
        document.body.style.overflow = "hidden";

        // Bind gallery navigation
        if (car.images && car.images.length > 1) {
            let activeImgIndex = 0;
            const activeImg = carDetailModalBody.querySelector(".detail-gallery-active-img");
            const counter = carDetailModalBody.querySelector(".gallery-counter");
            const thumbs = carDetailModalBody.querySelectorAll(".gallery-thumb-item");
            const prevBtn = carDetailModalBody.querySelector(".gallery-prev-btn");
            const nextBtn = carDetailModalBody.querySelector(".gallery-next-btn");
            
            function updateActiveImage(index) {
                activeImgIndex = (index + car.images.length) % car.images.length;
                activeImg.src = car.images[activeImgIndex];
                if (counter) {
                    counter.textContent = `${activeImgIndex + 1} / ${car.images.length}`;
                }
                
                thumbs.forEach((thumb, idx) => {
                    if (idx === activeImgIndex) {
                        thumb.classList.add("active");
                        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    } else {
                        thumb.classList.remove("active");
                    }
                });
            }
            
            if (prevBtn) {
                prevBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    updateActiveImage(activeImgIndex - 1);
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    updateActiveImage(activeImgIndex + 1);
                });
            }
            
            thumbs.forEach(thumb => {
                thumb.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const index = parseInt(thumb.dataset.index);
                    updateActiveImage(index);
                });
            });
        }

        // Bind inner detail modal buttons
        const detailBookBtn = document.getElementById("detail-book-btn");
        if (detailBookBtn) {
            detailBookBtn.addEventListener("click", () => {
                closeCarDetails();
                setTimeout(() => openTestDriveModal(car.id), 250);
            });
        }
        
        const detailContactBtn = document.getElementById("detail-contact-btn");
        if (detailContactBtn) {
            detailContactBtn.addEventListener("click", () => {
                closeCarDetails();
                // Prepopulate contact message subject
                const subjectInput = document.getElementById("contact-subject");
                if (subjectInput) {
                    subjectInput.value = `Vedrørende: ${car.brand} ${car.model} (${car.year})`;
                }
            });
        }
        
        const detailAltContact = document.getElementById("detail-alt-contact");
        if (detailAltContact) {
            detailAltContact.addEventListener("click", () => {
                closeCarDetails();
                const subjectInput = document.getElementById("contact-subject");
                if (subjectInput) {
                    subjectInput.value = `Søger lignende bil som: ${car.brand} ${car.model}`;
                }
            });
        }
    }

    function closeCarDetails() {
        carDetailModal.classList.remove("open");
        modalOverlay.classList.remove("open");
        document.body.style.overflow = "";
    }

    // Grid click listener for delegation (handles dynamically created cards)
    carsGrid.addEventListener("click", (e) => {
        // Exclude clicking on admin buttons
        if (e.target.closest(".admin-btn")) return;
        
        const viewBtn = e.target.closest(".view-details-btn");
        const card = e.target.closest(".car-card");
        
        if (viewBtn) {
            openCarDetails(viewBtn.dataset.id);
        } else if (card) {
            openCarDetails(card.dataset.id);
        }
    });

    carDetailModalClose.addEventListener("click", closeCarDetails);
    modalOverlay.addEventListener("click", closeCarDetails);

    // Test Drive Booking Dialog
    function openTestDriveModal(carId) {
        const car = cars.find(c => c.id === carId);
        if (!car || car.sold) return;

        document.getElementById("td-car-id").value = car.id;
        document.getElementById("td-car-img").src = car.image;
        document.getElementById("td-car-title").textContent = `${car.brand} ${car.model} ${car.variant}`;
        document.getElementById("td-car-price").textContent = `${car.price.toLocaleString("da-DK")} kr.`;

        testDriveModal.classList.add("open");
        tdCarOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeTestDriveModal() {
        testDriveModal.classList.remove("open");
        tdCarOverlay.classList.remove("open");
        document.body.style.overflow = "";
        testDriveForm.reset();
    }

    testDriveModalClose.addEventListener("click", closeTestDriveModal);
    testDriveModalCancel.addEventListener("click", closeTestDriveModal);
    tdCarOverlay.addEventListener("click", closeTestDriveModal);

    testDriveForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const carId = document.getElementById("td-car-id").value;
        const car = cars.find(c => c.id === carId);
        const name = document.getElementById("td-name").value;
        const phone = document.getElementById("td-phone").value;
        const dateVal = document.getElementById("td-date").value;
        const timeVal = document.getElementById("td-time").value;

        showToast(
            "Booking bekræftet!",
            `Tak ${name}. Vi har reserveret en prøvetur i din valgte ${car.brand} ${car.model} d. ${dateVal} kl. ${timeVal}. Vi ringer til dig på ${phone} for bekræftelse.`,
            "success"
        );
        closeTestDriveModal();
    });

    // ==========================================================================
    // 8. VALUATION CALCULATOR WIZARD ("BYT BIL")
    // ==========================================================================
    let currentStep = 1;
    let computedTradeInValue = 0;

    function updateStepUI() {
        valSteps.forEach(step => {
            step.classList.remove("active");
            if (parseInt(step.dataset.step) === currentStep) {
                step.classList.add("active");
            }
        });

        stepItems.forEach(item => {
            const stepNum = parseInt(item.dataset.step);
            item.classList.remove("active", "completed");
            
            if (stepNum === currentStep) {
                item.classList.add("active");
            } else if (stepNum < currentStep) {
                item.classList.add("completed");
            }
        });
    }

    // Step navigation
    nextStepBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (currentStep === 1) {
                // Validate step 1 fields manually
                const brandInput = document.getElementById("val-brand");
                const yearInput = document.getElementById("val-year");
                const kmInput = document.getElementById("val-km");
                const fuelInput = document.getElementById("val-fuel");

                if (!brandInput.value || !yearInput.value || !kmInput.value || !fuelInput.value) {
                    showToast("Mangler information", "Venligst udfyld alle felter markeret med *", "error");
                    return;
                }
                
                const year = parseInt(yearInput.value);
                const km = parseInt(kmInput.value);
                
                if (year < 1980 || year > 2026) {
                    showToast("Ugyldig årgang", "Indtast venligst en gyldig årgang (1980-2026)", "error");
                    return;
                }

                if (km < 0 || km > 600000) {
                    showToast("Ugyldigt kilometertal", "Indtast et kilometertal mellem 0 og 600.000 km.", "error");
                    return;
                }
            }

            if (currentStep === 2) {
                // Trigger computation
                calculateMockValuation();
            }

            currentStep++;
            updateStepUI();
        });
    });

    prevStepBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            currentStep--;
            updateStepUI();
        });
    });

    function calculateMockValuation() {
        const year = parseInt(document.getElementById("val-year").value);
        const km = parseInt(document.getElementById("val-km").value);
        const condition = document.querySelector('input[name="val-condition"]:checked').value;

        // Base car price standard in Vissenbjerg
        let baseValue = 185000;

        // Age depreciation (e.g. 7.5% per year from 2026)
        const age = 2026 - year;
        const ageDepreciation = Math.min(0.85, age * 0.08); // Max 85% age depreciation
        baseValue = baseValue * (1 - ageDepreciation);

        // Mileage depreciation (e.g. 0.35 kr per kilometer)
        const mileageDepreciation = Math.min(baseValue * 0.7, km * 0.35); // max 70% value deduction
        baseValue = Math.max(5000, baseValue - mileageDepreciation);

        // Condition multiplier
        let conditionMult = 1.0;
        if (condition === "perfekt") conditionMult = 1.1;
        if (condition === "slidt") conditionMult = 0.65;

        baseValue = baseValue * conditionMult;
        
        // Final sanity bounds
        const finalEstValue = Math.max(8000, Math.round(baseValue / 500) * 500);
        computedTradeInValue = finalEstValue;

        // Create range +/- 6%
        const minVal = Math.round((finalEstValue * 0.94) / 500) * 500;
        const maxVal = Math.round((finalEstValue * 1.06) / 500) * 500;

        estPriceRangeLabel.textContent = `${minVal.toLocaleString("da-DK")} - ${maxVal.toLocaleString("da-DK")} kr.`;
        valuationResultBox.classList.remove("hidden");
    }

    // Wizard Final Submit
    valuationForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const name = document.getElementById("val-name").value;
        const phone = document.getElementById("val-phone").value;
        const email = document.getElementById("val-email").value;
        const brand = document.getElementById("val-brand").value;

        showToast(
            "Anmodning modtaget",
            `Tak ${name}! Vi har registreret din bil (${brand}) og din byttepris på ca. ${computedTradeInValue.toLocaleString("da-DK")} kr. Vi ringer dig op på ${phone} inden for 24 timer for besigtigelse.`,
            "success"
        );

        // Reset wizard state
        valuationForm.reset();
        valuationResultBox.classList.add("hidden");
        currentStep = 1;
        updateStepUI();
    });

    // ==========================================================================
    // 9. CONTACT FORM ANCHOR
    // ==========================================================================

    if (contactMessageForm) {
        contactMessageForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("contact-name").value;
            const email = document.getElementById("contact-email").value;

            showToast(
                "Besked sendt",
                `Tak for din henvendelse, ${name}. Vi har sendt en bekræftelse til ${email} og svarer dig hurtigst muligt.`,
                "success"
            );
            contactMessageForm.reset();
        });
    }

    // ==========================================================================
    // 10. DEALER ADMIN PORTAL (CRUD INVENTORY MANAGEMENT)
    // ==========================================================================
    
    // Toggle Admin Mode via Footer Button (prompts for simple passcode "admin")
    adminLoginToggle.addEventListener("click", () => {
        if (isAdmin) {
            const logout = confirm("Vil du logge ud af forhandlerportalen?");
            if (logout) {
                isAdmin = false;
                sessionStorage.setItem("topcar_admin", "false");
                updateAdminUI();
                renderInventory();
                showToast("Logget ud", "Du er nu logget ud af forhandlerportalen.", "info");
            }
        } else {
            const pass = prompt("Indtast administrator adgangskode (Standard er 'admin'):");
            if (pass === "admin") {
                isAdmin = true;
                sessionStorage.setItem("topcar_admin", "true");
                updateAdminUI();
                renderInventory();
                showToast("Login godkendt", "Velkommen til Top Car Vissenbjerg portalen. Du kan nu tilføje, redigere og slette biler.", "success");
            } else if (pass !== null) {
                showToast("Forkert adgangskode", "Den indtastede adgangskode er ugyldig.", "error");
            }
        }
    });

    // Handle Admin indicator click to logout easily
    adminIndicator.addEventListener("click", () => {
        const logout = confirm("Vil du logge ud af admin mode?");
        if (logout) {
            isAdmin = false;
            sessionStorage.setItem("topcar_admin", "false");
            updateAdminUI();
            renderInventory();
            showToast("Logget ud", "Admin mode deaktiveret.", "info");
        }
    });

    function updateAdminUI() {
        if (isAdmin) {
            adminIndicator.classList.remove("hidden");
            adminActionsBar.classList.remove("hidden");
            adminLoginToggle.innerHTML = `<span class="material-symbols-outlined">lock_open</span> Log ud af Portal`;
        } else {
            adminIndicator.classList.add("hidden");
            adminActionsBar.classList.add("hidden");
            adminLoginToggle.innerHTML = `<span class="material-symbols-outlined">lock</span> Forhandler Portal`;
        }
    }

    // Modal Control: Create / Edit Car Dialog
    function openAdminCarModal(carId = null) {
        const titleEl = document.getElementById("admin-modal-title");
        const form = adminCarForm;
        form.reset();
        
        if (carId) {
            // Edit Mode
            const car = cars.find(c => c.id === carId);
            if (!car) return;

            titleEl.textContent = "Rediger bil på lager";
            document.getElementById("admin-car-id").value = car.id;
            document.getElementById("ac-brand").value = car.brand;
            document.getElementById("ac-model").value = car.model;
            document.getElementById("ac-variant").value = car.variant;
            document.getElementById("ac-price").value = car.price;
            document.getElementById("ac-year").value = car.year;
            document.getElementById("ac-km").value = car.mileage;
            document.getElementById("ac-fuel").value = car.fuelType;
            document.getElementById("ac-trans").value = car.transmission;
            document.getElementById("ac-engine").value = car.engine || "";
            document.getElementById("ac-color").value = car.color || "";
            document.getElementById("ac-consumption").value = car.consumption || "";
            document.getElementById("ac-tax").value = car.tax || "";
            document.getElementById("ac-image").value = car.image;
            document.getElementById("ac-tags").value = car.tags ? car.tags.join(", ") : "";
            document.getElementById("ac-desc").value = car.description;
            document.getElementById("ac-sold").checked = car.sold;
        } else {
            // New Car Mode
            titleEl.textContent = "Tilføj ny bil til lager";
            document.getElementById("admin-car-id").value = "";
            document.getElementById("ac-fuel").value = "Benzin";
            document.getElementById("ac-trans").value = "Manuel";
            document.getElementById("ac-sold").checked = false;
        }

        adminCarModal.classList.add("open");
        adminModalOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeAdminCarModal() {
        adminCarModal.classList.remove("open");
        adminModalOverlay.classList.remove("open");
        document.body.style.overflow = "";
    }

    addCarBtn.addEventListener("click", () => openAdminCarModal());
    adminCarModalClose.addEventListener("click", closeAdminCarModal);
    adminCarModalCancel.addEventListener("click", closeAdminCarModal);
    adminModalOverlay.addEventListener("click", closeAdminCarModal);

    // Save Car (Form submit)
    adminCarForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const carId = document.getElementById("admin-car-id").value;
        const brand = document.getElementById("ac-brand").value.trim();
        const model = document.getElementById("ac-model").value.trim();
        const variant = document.getElementById("ac-variant").value.trim();
        const price = parseInt(document.getElementById("ac-price").value);
        const year = parseInt(document.getElementById("ac-year").value);
        const mileage = parseInt(document.getElementById("ac-km").value);
        const fuelType = document.getElementById("ac-fuel").value;
        const transmission = document.getElementById("ac-trans").value;
        const engine = document.getElementById("ac-engine").value.trim();
        const color = document.getElementById("ac-color").value.trim();
        const consumption = document.getElementById("ac-consumption").value.trim();
        const tax = document.getElementById("ac-tax").value.trim();
        const image = document.getElementById("ac-image").value.trim();
        const tagsInput = document.getElementById("ac-tags").value.trim();
        const description = document.getElementById("ac-desc").value.trim();
        const sold = document.getElementById("ac-sold").checked;

        // Parse tags
        const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(t => t.length > 0) : [];

        if (carId) {
            // Edit existing
            const carIdx = cars.findIndex(c => c.id === carId);
            if (carIdx !== -1) {
                cars[carIdx] = {
                    ...cars[carIdx],
                    brand, model, variant, price, year, mileage, fuelType, transmission,
                    engine, color, consumption, tax, image, tags, description, sold
                };
                showToast("Bil opdateret", `${brand} ${model} er blevet opdateret på lager.`, "success");
            }
        } else {
            // Add new
            const newCar = {
                id: `car-${Date.now()}`,
                brand, model, variant, price, year, mileage, fuelType, transmission,
                engine, color, consumption, tax, image, tags, description, sold,
                featured: false
            };
            cars.push(newCar);
            showToast("Bil tilføjet", `${brand} ${model} er nu tilføjet til udstillingen.`, "success");
        }

        saveInventoryToStorage();
        populateBrandDropdown();
        renderInventory();
        closeAdminCarModal();
    });

    // Delegation for edit / delete inside cards
    carsGrid.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".admin-btn-edit");
        const deleteBtn = e.target.closest(".admin-btn-delete");

        if (editBtn) {
            openAdminCarModal(editBtn.dataset.id);
        }

        if (deleteBtn) {
            const carId = deleteBtn.dataset.id;
            const car = cars.find(c => c.id === carId);
            if (!car) return;

            const confirmDel = confirm(`Er du sikker på, at du vil slette ${car.brand} ${car.model} fra systemet?`);
            if (confirmDel) {
                cars = cars.filter(c => c.id !== carId);
                saveInventoryToStorage();
                populateBrandDropdown();
                renderInventory();
                showToast("Bil slettet", `${car.brand} ${car.model} er fjernet fra databasen.`, "error");
            }
        }
    });
});


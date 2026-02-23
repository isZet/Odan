const serviceData = {
    prototyping: {
        title: "Prototyping & UI/UX Design (Figma)",
        description: "I specialize in translating abstract ideas into tangible...",
        tech: "Figma, User Story Mapping, Design Thinking Principles.",
        works: []
    },
    website: {
        title: "Front-End Website Development",
        description: "I build responsive, modern, and high-performing websites...",
        tech: "HTML5, CSS3/SCSS, JavaScript (ES6+), Responsive Design.",
        works: []
    },
    system: {
        title: "Information System Solutions",
        description: "My contribution to information systems focuses entirely...",
        tech: "UI/UX for Dashboards, Data Visualization.",
        works: []
    },
    application: {
        title: "Mobile/Web Application Concepts",
        description: "This service involves designing and constructing...",
        tech: "Mobile-First Design, Frameworks.",
        works: []
    }
};

// ==================== FIREBASE REVIEWS LOGIC ====================

// Helper function to format display name (mask email if provided, keep plain name as is)
function formatDisplayName(input) {
    const trimmedInput = input.trim();
    
    // Check if it looks like an email (contains @ and . after @)
    if (trimmedInput.includes('@')) {
        const [localPart, domain] = trimmedInput.split('@');
        // Basic email validation
        if (localPart && domain && domain.includes('.')) {
            // Mask email for privacy
            const maskedLocal = localPart.length > 5 ? '*****' + localPart.slice(5) : '*****';
            return `${maskedLocal}@${domain}`;
        }
    }
    
    // If not a valid email, return as-is (plain name)
    return trimmedInput;
}

// Function to save a new review to Firebase
function saveReviewToFirebase(reviewerInput, reviewMessage) {
    // If Firebase isn't initialized, fall back to localStorage
    if (typeof window.db === 'undefined') {
        console.warn("Firebase not initialized. Using localStorage fallback.");
        return saveReviewToLocalStorage(reviewerInput, reviewMessage);
    }
    
    const reviewsRef = window.db.ref('reviews');
    const newReviewRef = reviewsRef.push();
    const displayName = formatDisplayName(reviewerInput);
    
    newReviewRef.set({
        name: displayName,
        originalInput: reviewerInput, // Store original for admin reference
        message: reviewMessage,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        isEmail: reviewerInput.includes('@') // Flag to identify if it was an email
    }).then(() => {
        console.log("Review saved successfully to Firebase!");
        // Reload reviews from Firebase to show the new one
        if (window.currentReviewsGallery) {
            loadReviewsFromFirebase(window.currentReviewsGallery);
        }
    }).catch((error) => {
        console.error("Error saving review to Firebase: ", error);
        // Fallback to localStorage if Firebase fails
        saveReviewToLocalStorage(reviewerInput, reviewMessage);
    });
}

// Function to load reviews from Firebase and display them
function loadReviewsFromFirebase(reviewsGallery) {
    // If Firebase isn't initialized, load from localStorage
    if (typeof window.db === 'undefined') {
        console.warn("Firebase not initialized. Loading from localStorage.");
        return loadReviewsFromLocalStorage(reviewsGallery);
    }
    
    const reviewsRef = window.db.ref('reviews');
    
    reviewsRef.orderByChild('timestamp').on('value', (snapshot) => {
        reviewsGallery.innerHTML = '';
        
        const staticReviews = [
            {
                message: "Jordan delivered an excellent website for our veterinary clinic. The design is clean and user-friendly.",
                name: "Dr. Sarah Lee, Vet Clinic",
                isEmail: false
            },
            {
                message: "Very professional and easy to work with. He understood the requirements for the karaoke system immediately.",
                name: "Tech Lead, NextGenPH",
                isEmail: false
            },
            {
                message: "Great attention to detail on the UI/UX design. The interface is intuitive and looks modern.",
                name: "Mark Davis, Designer",
                isEmail: false
            },
            {
                message: "The Front-End development skills are top notch. Highly recommended for responsive web projects.",
                name: "Alex Johnson, Developer",
                isEmail: false
            }
        ];
        
        const reviewsData = snapshot.val();
        let hasFirebaseReviews = false;

        if (reviewsData) {
            // Convert object to array and sort by timestamp (newest first)
            const reviewsArray = Object.entries(reviewsData)
                .map(([reviewId, review]) => ({ ...review, id: reviewId }))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            // Display Firebase reviews first
            reviewsArray.forEach((review) => {
                const reviewCard = createReviewCard(review.message, review.name, review.id, true);
                reviewsGallery.appendChild(reviewCard);
            });
            hasFirebaseReviews = true;
        }
        
        // If no Firebase reviews, show static ones
        if (!hasFirebaseReviews || (reviewsData && Object.keys(reviewsData).length < 4)) {
            staticReviews.forEach((review, index) => {
                const reviewCard = createReviewCard(review.message, review.name, `static-${index}`, false);
                reviewsGallery.appendChild(reviewCard);
            });
        }
        
        // Re-initialize the gallery scroll functionality
        if (typeof setupReviewsGallery === 'function') {
            setupReviewsGallery();
        }
        
    }, (error) => {
        console.error("Error loading reviews from Firebase: ", error);
        loadReviewsFromLocalStorage(reviewsGallery);
    });
}

// Function to delete a review from Firebase
function deleteReviewFromFirebase(reviewId) {
    if (typeof window.db === 'undefined') return;
    
    const reviewRef = window.db.ref('reviews/' + reviewId);
    reviewRef.remove()
        .then(() => {
            console.log("Review deleted successfully from Firebase!");
            // Reload reviews after deletion
            if (window.currentReviewsGallery) {
                loadReviewsFromFirebase(window.currentReviewsGallery);
            }
        })
        .catch((error) => {
            console.error("Error deleting review from Firebase: ", error);
        });
}

// Helper function to create review card
function createReviewCard(message, name, id, isFirebaseReview = false) {
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card';
    if (isFirebaseReview) {
        reviewCard.dataset.reviewId = id;
        reviewCard.title = "Double-click to delete (admin)";
        reviewCard.style.cursor = 'pointer';
    }
    
    // Format the message with quotes if not already
    const formattedMessage = message.startsWith('"') && message.endsWith('"') ? 
        message : `"${message}"`;
    
    reviewCard.innerHTML = `<p>${formattedMessage}</p><h4>- ${name}</h4>`;
    
    // Add double-click to delete functionality for Firebase reviews only
    if (isFirebaseReview) {
        reviewCard.addEventListener('dblclick', function(event) {
            if (confirm("Delete this review? (Admin action)")) {
                deleteReviewFromFirebase(id);
            }
        });
    }
    
    return reviewCard;
}

// ==================== LOCALSTORAGE FALLBACK LOGIC ====================

function saveReviewToLocalStorage(reviewerInput, reviewMessage) {
    const storedReviews = JSON.parse(localStorage.getItem('reviews')) || [];
    const displayName = formatDisplayName(reviewerInput);
    
    storedReviews.push({ 
        name: displayName, 
        originalInput: reviewerInput,
        message: reviewMessage,
        timestamp: Date.now(),
        isEmail: reviewerInput.includes('@')
    });
    
    localStorage.setItem('reviews', JSON.stringify(storedReviews));
    console.log("Review saved to localStorage.");
    
    // Update the display
    if (window.currentReviewsGallery) {
        loadReviewsFromLocalStorage(window.currentReviewsGallery);
    }
}

function loadReviewsFromLocalStorage(reviewsGallery) {
    const storedReviews = JSON.parse(localStorage.getItem('reviews')) || [];
    
    // Clear gallery but keep static cards if no localStorage reviews
    if (storedReviews.length === 0) {
        const staticReviews = [
            {
                message: "Jordan delivered an excellent website for our veterinary clinic. The design is clean and user-friendly.",
                name: "Dr. Sarah Lee, Vet Clinic"
            },
            {
                message: "Very professional and easy to work with. He understood the requirements for the karaoke system immediately.",
                name: "Tech Lead, NextGenPH"
            },
            {
                message: "Great attention to detail on the UI/UX design. The interface is intuitive and looks modern.",
                name: "Mark Davis, Designer"
            },
            {
                message: "The Front-End development skills are top notch. Highly recommended for responsive web projects.",
                name: "Alex Johnson, Developer"
            }
        ];
        
        staticReviews.forEach((review, index) => {
            const reviewCard = createReviewCard(review.message, review.name, `static-${index}`, false);
            reviewsGallery.appendChild(reviewCard);
        });
        return;
    }
    
    // Sort by timestamp (newest first)
    storedReviews.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Display localStorage reviews
    storedReviews.forEach((review) => {
        const reviewCard = createReviewCard(review.message, review.name, `local-${Date.now()}`, false);
        reviewsGallery.appendChild(reviewCard);
    });
}

// ==================== UPDATED REVIEWS INITIALIZATION ====================

function initializeReviews(reviewsGallery) {
    if (!reviewsGallery) return;
    
    // Store reference globally for Firebase callbacks
    window.currentReviewsGallery = reviewsGallery;
    
    const reviewForm = document.getElementById('review-form');
    const leftBtnReviews = document.getElementById('reviews-scroll-left');
    const rightBtnReviews = document.getElementById('reviews-scroll-right');
    const REVIEW_SCROLL_DISTANCE = 324;

    // Load reviews (Firebase with localStorage fallback)
    loadReviewsFromFirebase(reviewsGallery);

    // Form submission handler
    if (reviewForm) {
        reviewForm.addEventListener('submit', e => {
            e.preventDefault();
            const userInput = document.getElementById('reviewer-name').value.trim();
            const message = document.getElementById('review-message').value.trim();

            if (!message || !userInput) {
                alert('Please fill in both your name/email and review message.');
                return;
            }
            
            // Validate input (at least 2 characters for name, or valid email format)
            if (userInput.length < 2) {
                alert('Please enter a valid name (at least 2 characters) or email address.');
                return;
            }
            
            // If it looks like an email but is invalid
            if (userInput.includes('@')) {
                const [localPart, domain] = userInput.split('@');
                if (!localPart || !domain || !domain.includes('.')) {
                    if (!confirm('This doesn\'t look like a valid email address. Do you want to submit it as a name instead?')) {
                        return;
                    }
                }
            }
            
            // Save to Firebase (with localStorage fallback)
            saveReviewToFirebase(userInput, message);
            
            // Clear the form
            reviewForm.reset();
            alert("Thank you for your review! It has been submitted successfully.");
        });
    }

    // Scroll buttons functionality
    if (leftBtnReviews) {
        leftBtnReviews.addEventListener('click', () => {
            reviewsGallery.scrollBy({ left: -REVIEW_SCROLL_DISTANCE, behavior: 'smooth' });
        });
    }
    
    if (rightBtnReviews) {
        rightBtnReviews.addEventListener('click', () => {
            reviewsGallery.scrollBy({ left: REVIEW_SCROLL_DISTANCE, behavior: 'smooth' });
        });
    }
    
    // Auto-scroll functionality (optional)
    let scrollSpeed = 0.5;
    let autoScrollActive = false;
    
    function autoScrollReviews() {
        if(reviewsGallery && autoScrollActive) {
            reviewsGallery.scrollLeft += scrollSpeed;
            if (reviewsGallery.scrollLeft >= reviewsGallery.scrollWidth - reviewsGallery.clientWidth) {
                reviewsGallery.scrollLeft = 0;
            }
            requestAnimationFrame(autoScrollReviews);
        }
    }
    
    // Toggle auto-scroll on hover
    reviewsGallery.addEventListener('mouseenter', () => {
        autoScrollActive = false;
    });
    
    reviewsGallery.addEventListener('mouseleave', () => {
        autoScrollActive = true;
        if (autoScrollActive) {
            autoScrollReviews();
        }
    });
    
    // Start auto-scroll
    autoScrollActive = true;
    autoScrollReviews();
}

// Setup gallery scroll functionality
function setupReviewsGallery() {
    // This function would contain any additional gallery setup needed
}

// ==================== EXISTING GALLERY FUNCTION ====================

function initializeGallery(gallery) {
    const items = Array.from(gallery.querySelectorAll('.image-item'));
    const leftBtnGallery = document.getElementById('gallery-scroll-left');
    const rightBtnGallery = document.getElementById('gallery-scroll-right');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.querySelector('.lightbox-img');
    const closeBtn = document.querySelector('.lightbox .close');

    if (items.length === 0) return;

    const totalOriginalItems = items.length;
    const GALLERY_SCROLL_DISTANCE = 316; 

    items.forEach(item => {
        const clone = item.cloneNode(true);
        gallery.appendChild(clone);
    });

    const allItems = Array.from(gallery.querySelectorAll('.image-item'));
    let currentIndex = 1;

    function centerImage(index) {
        const item = allItems[index];
        if (!item) return;
        const galleryCenter = gallery.offsetWidth / 2;
        const scrollLeft = item.offsetLeft + item.offsetWidth / 2 - galleryCenter;
        gallery.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }

    function updateActiveImage() {
        const galleryCenter = gallery.scrollLeft + gallery.offsetWidth / 2;
        
        allItems.forEach(item => {
            const itemCenter = item.offsetLeft + item.offsetWidth / 2;
            if (Math.abs(galleryCenter - itemCenter) < item.offsetWidth / 2) {
                item.classList.add('active');
                item.classList.remove('inactive');
            } else {
                item.classList.remove('active');
                item.classList.add('inactive');
            }
        });

        const firstDuplicatedItemOffset = allItems[totalOriginalItems].offsetLeft;
        if (gallery.scrollLeft >= firstDuplicatedItemOffset) {
            gallery.style.scrollBehavior = 'auto';
            gallery.scrollLeft -= firstDuplicatedItemOffset;
            requestAnimationFrame(() => {
                gallery.style.scrollBehavior = 'smooth';
            });
        }
    }

    if (rightBtnGallery) rightBtnGallery.addEventListener('click', () => gallery.scrollBy({ left: GALLERY_SCROLL_DISTANCE, behavior: 'smooth' }));
    if (leftBtnGallery) leftBtnGallery.addEventListener('click', () => gallery.scrollBy({ left: -GALLERY_SCROLL_DISTANCE, behavior: 'smooth' }));

    if (lightbox) {
        allItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if(img && lightboxImg) {
                    lightboxImg.src = img.src;
                    lightbox.style.display = 'flex';
                }
            });
        });
        if (closeBtn) closeBtn.addEventListener('click', () => lightbox.style.display = 'none');
        lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.style.display = 'none'; });
    }

    setTimeout(() => centerImage(currentIndex), 100);
    gallery.addEventListener('scroll', updateActiveImage);
}

// ==================== EMAILJS INTEGRATION ====================

(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("q8O9sDeK7Ja0qeE-e");
    }
})();

window.onload = function() {
    const form = document.getElementById('contact-inquiry-form');

    if (form) { 
        form.addEventListener('submit', function(event) {
            event.preventDefault(); 

            emailjs.sendForm('service_ewn5d1y', 'template_oegi0bj', this)
                .then(function() {
                    alert('SUCCESS! Your message has been sent.');
                    form.reset(); 
                }, function(error) {
                    alert('FAILED to send message: ' + error);
                });
        });
    }
}

// ==================== MAIN DOMContentLoaded BLOCK ====================

document.addEventListener('DOMContentLoaded', () => {
    const serviceCards = document.querySelectorAll('.service-card');
    const servicePane = document.getElementById('serviceDetailsPane');
    const allDetailPanes = document.querySelectorAll('.service-details-pane .content-detail');

    function displayServiceDetails(serviceId) {
        const targetId = serviceId + '-details';
        
        allDetailPanes.forEach(pane => {
            pane.classList.remove('active');
        });

        const targetPane = document.getElementById(targetId);
        if (targetPane) {
            targetPane.classList.add('active');
        }
    }

    /*1. GLOBAL: SCROLL REVEAL ANIMATION*/
    function reveal() {
        var reveals = document.querySelectorAll('.reveal:not(.service-card)');
        var serviceCardReveals = document.querySelectorAll('.service-card.reveal');

        for (var i = 0; i < reveals.length; i++) {
            var windowheight = window.innerHeight;
            var revealtop = reveals[i].getBoundingClientRect().top;
            var revealpoint = 150; 

            if (revealtop < windowheight - revealpoint) {
                reveals[i].classList.add('active');
            } 
        }
        
        serviceCardReveals.forEach(card => {
            if (!card.classList.contains('active')) {
                var windowheight = window.innerHeight;
                var revealtop = card.getBoundingClientRect().top;
                var revealpoint = 150; 
                if (revealtop < windowheight - revealpoint) {
                    card.classList.add('active');
                } 
            }
        });
    }
    window.addEventListener('scroll', reveal);
    reveal();

    /*2. NAVIGATION ACTIVE LINK LOGIC */
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-bar ul li a"); 
    const isIndexPage = window.location.pathname.endsWith('index.html') || 
                         window.location.pathname === '/' || 
                         window.location.pathname === '';
    const scrollOffset = 250; 

    if (isIndexPage && sections.length > 0 && navLinks.length > 0) {
        window.addEventListener("scroll", () => {
            let current = "";
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const sectionTop = section.offsetTop;
                if (window.pageYOffset >= sectionTop - scrollOffset) {
                    current = section.getAttribute("id");
                    break; 
                }
            }
            if (window.pageYOffset <= 10) { current = "home"; }

            navLinks.forEach((a) => {
                a.classList.remove("active");
                if (current && a.getAttribute("href").includes("#" + current)) {
                    a.classList.add("active");
                }
            });
        });
    }

    function setActiveLinkOnLoad() {
        const currentPath = window.location.pathname;
        let currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        if (currentFile === "" || currentFile === "/") { currentFile = 'index.html'; }

        navLinks.forEach(a => {
            a.classList.remove("active"); 
            const linkFile = a.getAttribute('href').split('#')[0].substring(a.getAttribute('href').split('#')[0].lastIndexOf('/') + 1);
            if (currentFile === linkFile) { a.classList.add("active"); }
        });
    }
    setTimeout(setActiveLinkOnLoad, 100); 

    /*3. GALLERY/REVIEWS/CONTACT INIT */
    const gallery = document.querySelector('.image-gallery');
    if (gallery) { initializeGallery(gallery); }

    const reviewsGallery = document.querySelector('.reviews-gallery');
    if (reviewsGallery) { 
        initializeReviews(reviewsGallery); 
    }

    const contactForm = document.getElementById('contact-inquiry-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }

    /*6. SERVICES PAGE LOGIC (FIXED: Uses .selected for highlight)*/
    if (serviceCards.length > 0) { 
        serviceCards.forEach(card => {
            card.addEventListener('click', () => {
                const serviceId = card.getAttribute('data-service');

                serviceCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                displayServiceDetails(serviceId); 
            });
        });

        const initialServiceId = serviceCards[0].getAttribute('data-service');
        
        setTimeout(() => {
            serviceCards[0].classList.add('selected');
            serviceCards[0].classList.add('active'); 
            
            displayServiceDetails(initialServiceId); 
        }, 100); 
    }
});
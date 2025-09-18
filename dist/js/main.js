// Responsive navigation toggle example
document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function () {
      navMenu.classList.toggle('active');
    });
  }
});

// Responsive font size adjustment
function adjustFontSize() {
  const baseSize = 16;
  const width = window.innerWidth;
  let newSize = baseSize;

  if (width < 600) {
    newSize = 12;
  } else if (width < 900) {
    newSize = 14;
  }

  document.documentElement.style.fontSize = `${newSize}px`;
}

window.addEventListener('resize', adjustFontSize);
window.addEventListener('DOMContentLoaded', adjustFontSize);

// Contact form validation (safe: checks presence before attaching)
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  function clearErrors() {
    form.querySelectorAll('.field-error').forEach(e => e.remove());
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.field-success').forEach(el => el.remove());
  }

  function showError(input, message) {
    if (!input) return;
    input.classList.add('is-invalid');
    const err = document.createElement('div');
    err.className = 'field-error text-danger small mt-1';
    err.textContent = message;
    // place error after input's parent so Bootstrap spacing stays consistent
    input.parentNode.appendChild(err);
  }

  function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    const name = form.querySelector('input[name="name"]');
    const email = form.querySelector('input[name="email"]');
    const message = form.querySelector('textarea[name="message"]');

    let valid = true;

    if (!name || name.value.trim().length < 2) {
      valid = false;
      showError(name, 'Please enter your name (min 2 characters).');
    }

    if (!email || !isEmailValid(email.value.trim())) {
      valid = false;
      showError(email, 'Please enter a valid email address.');
    }

    if (!message || message.value.trim().length < 10) {
      valid = false;
      showError(message, 'Please enter a message (min 10 characters).');
    }

    if (!valid) return;

    // disable submit while "sending"
    const submitBtn = form.querySelector('.ezy__contact9-btn');
    if (submitBtn) submitBtn.disabled = true;

    // simulate submit (replace with real fetch/XHR when ready)
    setTimeout(() => {
      form.reset();
      if (submitBtn) submitBtn.disabled = false;

      const success = document.createElement('div');
      success.className = 'field-success alert alert-success mt-3';
      success.textContent = 'Thank you — your message has been sent.';
      form.appendChild(success);

      setTimeout(() => success.remove(), 5000);
    }, 1000);
  });
});

// Sidebar scrollspy: mark sidebar link active when its section is in view
document.addEventListener('DOMContentLoaded', function () {
  const links = Array.from(document.querySelectorAll('.vertical-sidebar .sidebar__link[href^="#"]'));
  if (!links.length) return;

  const idToLink = new Map();
  const sections = [];

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const id = href.slice(1);
    const section = document.getElementById(id);
    if (section) {
      idToLink.set(id, link);
      sections.push(section);
    }
  });

  if (!sections.length) return;

  // Use IntersectionObserver to toggle .active when a section is mostly visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        const link = idToLink.get(id);
        if (!link) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // clear others
          idToLink.forEach((l) => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    },
    { root: null, threshold: [0.5] }
  );

  sections.forEach((s) => observer.observe(s));

  // Fallback: ensure a link is active on scroll if observer thresholds aren't met
  const throttle = (fn, wait) => {
    let last = 0;
    return function () {
      const now = Date.now();
      if (now - last > wait) {
        last = now;
        fn();
      }
    };
  };

  const updateClosest = () => {
    let closest = null;
    let closestDist = Infinity;
    sections.forEach((s) => {
      const rect = s.getBoundingClientRect();
      const dist = Math.abs(rect.top);
      if (dist < closestDist) {
        closestDist = dist;
        closest = s;
      }
    });
    if (closest) {
      const link = idToLink.get(closest.id);
      if (link && !link.classList.contains('active')) {
        idToLink.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      }
    }
  };

  window.addEventListener('scroll', throttle(updateClosest, 150), { passive: true });
  window.addEventListener('resize', throttle(updateClosest, 200));
  // initial run
  updateClosest();
});

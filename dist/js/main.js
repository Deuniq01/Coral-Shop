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
    newSize = 14;
  } else if (width < 900) {
    newSize = 15;
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

// Ensure the body gets a class when the sidebar toggle is checked so CSS can push content
document.addEventListener('DOMContentLoaded', function () {
  const sidebarCheckbox = document.querySelector('.vertical-sidebar input[type="checkbox"]');
  if (!sidebarCheckbox) return;

  // initialize class from current state
  document.body.classList.toggle('sidebar-expanded', sidebarCheckbox.checked);

  sidebarCheckbox.addEventListener('change', function () {
    document.body.classList.toggle('sidebar-expanded', sidebarCheckbox.checked);
  });
});

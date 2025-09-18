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

document.querySelector('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    e.target.elements.name.value = '';
    e.target.elements.email.value = '';
    e.target.elements.message.value = '';
  });

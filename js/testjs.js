document.querySelectorAll('.floor-image').forEach(image => {
    image.addEventListener('click', function() {
        const section = document.getElementById('section');
        const description = document.getElementById('description');
        const title = document.getElementById('title');

        // Animacija nestajanja
        description.classList.add('fade-out');
        title.classList.add('fade-out');

        setTimeout(() => {
            section.style.backgroundImage = `url(${this.dataset.bg})`;
            description.textContent = this.dataset.text;

            // Animacija pojavljivanja
            description.classList.remove('fade-out');
            description.classList.add('fade-in');

            title.classList.remove('fade-out');
            title.classList.add('fade-in');
        }, 500); // Čeka 500ms pre promene teksta i pozadine
    });
});

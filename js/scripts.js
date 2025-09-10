document.addEventListener("DOMContentLoaded", function () {
  const sekcija = document.getElementById("pocetna");
  const heroImage = document.getElementById("heroImage");
  const thumbnails = document.querySelectorAll('.images img:not(#heroImage)');
  const title = document.querySelector('.naslov');
  const description = document.querySelector('.opis');

  const contentMap = {
    dekingMini: {
      title: "Deking",
      description: "Dekorativni drveni podovi koji donose prirodnu lepotu u vaš prostor.",
      background: "url('/images/deking.jpg')"
    },
    laminatMin: {
      title: "Laminat",
      description: "Naš laminat je savršen izbor za svaki dom, pružajući izvanrednu otpornost i estetiku.",
      background: "url('/images/laminat.jpg')"
    },
    tepihMin: {
      title: "Tepih",
      description: "Tepih donosi toplinu i udobnost u svaki prostor, savršen za stvaranje prijatne atmosfere.",
      background: "url('/images/tepih.jpg')"
    },
    travaMin: {
      title: "Veštačka trava",
      description: "Veštačka trava je idealna za stvaranje zelenih površina bez brige o održavanju.",
      background: "url('/images/vestackaTrava.jpg')"
    },
    vinil: {
      title: "Pletni vinil",
      description: "Pletni vinil je savršen izbor za unutrašnje i spoljašnje prostore, pružajući otpornost i stil.",
      background: "url('/images/pletniVinil.jpg')"
    }
  };

  function getFileKey(src) {
    return src.split('/').pop().split('.')[0]; // npr. "dekingMini"
  }

  function promeniPozadinu(novaSlika) {
    sekcija.classList.remove("pokazi-fade");
    sekcija.classList.add("fade-out");

    setTimeout(() => {
      sekcija.style.setProperty("--bg-slika", novaSlika);
      sekcija.classList.remove("fade-out");
      sekcija.classList.add("pokazi-fade");
    }, 250); // pola trajanja animacije
}


  // Klik na thumbnail slike
  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      // Zamena hero slike i alt-a
      const oldSrc = heroImage.src;
      const oldAlt = heroImage.alt;

      heroImage.src = thumb.src;
      heroImage.alt = thumb.alt;

      thumb.src = oldSrc;
      thumb.alt = oldAlt;

      const fileKey = getFileKey(heroImage.src);
      const content = contentMap[fileKey];

      if (content) {
        title.textContent = content.title;
        description.textContent = content.description;
        if (content.background) {
          promeniPozadinu(content.background);
        }
      }
    });
  });

  // Postavljanje početnog sadržaja i pozadine
  const initialKey = getFileKey(heroImage.src);
  const initialContent = contentMap[initialKey];

  if (initialContent) {
    title.textContent = initialContent.title;
    description.textContent = initialContent.description;
    if (initialContent.background) {
      promeniPozadinu(initialContent.background);
    }
  }

  // jQuery deo za navigaciju i meni
  $(document).ready(function () {
    $('.nav-menu a').on('click', function (e) {
      e.preventDefault();
      const target = $(this).attr('href');
      if ($(target).length) {
        $('html, body').animate({ scrollTop: $(target).offset().top }, 200);
      }
    });

    $('.hamburger').on('click', function () {
      $('.nav-menu').toggleClass('active');
    });

    $('.nav-menu a').on('click', function () {
      $('.nav-menu').removeClass('active');
    });
  });
});
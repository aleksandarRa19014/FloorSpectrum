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
    }, 550); // pola trajanja animacije
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


  const ticker = document.getElementById('ticker');

  // Niz sa slikama za ticker
  const tickerImages = [
    { src: 'images/travaMin.png', alt: 'Proizvod 1' },
    { src: 'images/travaMin.png', alt: 'Proizvod 2' },
    { src: 'images/specijalnePonude.png', alt: 'Proizvod 3' },
    { src: 'images/travaMin.png', alt: 'Proizvod 4' }
  ];

  // Generiši slike tri puta za beskonačan loop
  const generateTickerItems = () => {
    const tickerContainer = document.getElementById('ticker');
    tickerContainer.innerHTML = '';
    
    // Dodaj zadnju sliku na početak za seamless prelazak
    const lastImage = tickerImages[tickerImages.length - 1];
    const firstItem = document.createElement('div');
    firstItem.className = 'ticker__item';
    
    const firstLink = document.createElement('a');
    firstLink.href = '#';
    firstLink.style.display = 'block';
    firstLink.style.height = '100%';
    
    const firstImg = document.createElement('img');
    firstImg.src = lastImage.src;
    firstImg.alt = lastImage.alt;
    
    firstLink.appendChild(firstImg);
    firstItem.appendChild(firstLink);
    tickerContainer.appendChild(firstItem);
    
    // Triput dodaj sve slike
    for (let repeat = 0; repeat < 3; repeat++) {
      tickerImages.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'ticker__item';
        
        const link = document.createElement('a');
        link.href = '#'; // Korisnik može da prosledi sa vlastitim linkovima
        link.style.display = 'block';
        link.style.height = '100%';
        
        const img = document.createElement('img');
        img.src = image.src;
        img.alt = image.alt;
        
        link.appendChild(img);
        item.appendChild(link);
        tickerContainer.appendChild(item);
      });
    }
  };

  // Inicijalizuj ticker slike
  generateTickerItems();

  // Kontinuirani scroll animacija sa JavaScript - beskonačan loop
  let position = 0;
  const speed = 0.5; // piksel po frame-u
  let isRunning = true;
  let firstItemWidth = 0;
  let oneSetWidth = 0;

  // Čekaj da se DOM učita pa izračunaj širin
  setTimeout(() => {
    const firstItem = ticker.children[0];
    const secondItem = ticker.children[1];
    
    if (firstItem && secondItem) {
      firstItemWidth = firstItem.offsetWidth + parseInt(window.getComputedStyle(firstItem).marginRight) + parseInt(window.getComputedStyle(firstItem).marginLeft);
      
      // Širin jednog seta od 4 slike
      oneSetWidth = firstItemWidth * 4;
    }
  }, 100);

  const animate = () => {
    if (isRunning) {
      position -= speed;
      ticker.style.transform = `translate3d(${position}px, 0, 0)`;

      // Glatko resetuj animaciju kada dođe do kraja
      if (oneSetWidth > 0 && Math.abs(position) >= oneSetWidth) {
        position = -firstItemWidth; // Resetuj na poziciju gde je zadnja slika vidljiva
      }
    }
    requestAnimationFrame(animate);
  };

  animate();

  // Pause/Resume na hover (desktop)
  ticker.addEventListener('mouseenter', () => {
    isRunning = false;
  });

  ticker.addEventListener('mouseleave', () => {
    isRunning = true;
  });

  // Pause/Resume na touch (mobilni uređaj)
  ticker.addEventListener('touchstart', () => {
    isRunning = false;
  });

  ticker.addEventListener('touchend', () => {
    isRunning = true;
  });

  // Sakrij splash screen posle 3.2 sekunde i onda prikaži stranicu
  const splashScreen = document.getElementById('splashScreen');
  const pageContent = document.getElementById('pageContent');

  if (splashScreen) {
    setTimeout(() => {
      splashScreen.classList.add('hidden');
      if (pageContent) {
        pageContent.classList.add('visible');
      }
      setTimeout(() => {
        splashScreen.remove();
      }, 600);
    }, 3200);
  }

})
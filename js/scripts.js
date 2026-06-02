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

  // Automatska rotacija svakih 5 sekundi
  let currentThumbIndex = 0;
  setInterval(() => {
    thumbnails[currentThumbIndex].click();
    currentThumbIndex = (currentThumbIndex + 1) % thumbnails.length;
  }, 5000);

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
    { src: 'images/travaMin.png', alt: 'Proizvod 1', href: 'https://www.facebook.com' },
    { src: 'images/travaMin.png', alt: 'Proizvod 2', href: 'https://www.instagram.com' },
    { src: 'images/specijalnePonude.png', alt: 'Proizvod 3', href: 'https://www.twitter.com' },
    { src: 'images/travaMin.png', alt: 'Proizvod 4', href: 'https://www.linkedin.com' }
  ];

  // Seamless loop: original + original (bez "lastImage na početak" trika)
  const renderTicker = () => {
    const tickerContainer = document.getElementById('ticker');
    tickerContainer.innerHTML = '';

    // Pravimo original set = renderujemo dovoljno itema da "first" i "last" ivica
    // budu realno vidljive u layout-u, a zatim dupliramo taj original set.
    // Važno: dupliranje mora biti nad istim setom čija se širina meri (oneSetWidth).
    const originalItems = [];
    const reps = 5;
    for (let r = 0; r < reps; r++) {
      tickerImages.forEach((image) => originalItems.push(image));
    }


    const buildItem = (image) => {
      const item = document.createElement('div');
      item.className = 'ticker__item';

      const link = document.createElement('a');
      link.href = image.href;
      link.style.display = 'block';
      link.style.height = '100%';

      const img = document.createElement('img');
      img.src = image.src;
      img.alt = image.alt;

      link.appendChild(img);
      item.appendChild(link);
      return item;
    };

    // original
    originalItems.forEach((img) => tickerContainer.appendChild(buildItem(img)));
    // original + original
    originalItems.forEach((img) => tickerContainer.appendChild(buildItem(img)));

    return { originalCount: originalItems.length };
  };

  // Kontinuirani scroll animacija sa JavaScript - beskonačan loop
  const speed = 0.5; // piksel po frame-u
  let isRunning = true;
  let position = 0;
  let oneSetWidth = 0;
  let rafId = null;

  const measureAndStart = () => {
    const { originalCount } = renderTicker();

    // Izmeri tačnu širinu samo prvih originalCount itema
    const children = ticker.children;
    if (!children || children.length < originalCount) return;

    // Udaljenost od leve ivice prvog do desne ivice poslednjeg original itema
    const first = children[0];
    const lastOriginal = children[originalCount - 1];

    const firstRect = first.getBoundingClientRect();
    const lastRect = lastOriginal.getBoundingClientRect();
    oneSetWidth = lastRect.right - firstRect.left;

    position = 0;
    ticker.style.transform = `translate3d(${position}px, 0, 0)`;

    const animate = () => {
      if (isRunning && oneSetWidth > 0) {
        position -= speed;
        // seamless reset bez skoka: pomeraj modulo dužine jednog original seta
        if (position <= -oneSetWidth) {
          position += oneSetWidth;
        }
        ticker.style.transform = `translate3d(${position}px, 0, 0)`;
      }
      rafId = requestAnimationFrame(animate);
    };

    if (rafId) cancelAnimationFrame(rafId);
    animate();
  };

  measureAndStart();

  // Re-init na resize-u (širine zavise od viewport-a)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      measureAndStart();
    });
    ro.observe(ticker);
  } else {
    window.addEventListener('resize', () => measureAndStart(), { passive: true });
  }


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
  const siteHeader = document.getElementById('siteHeader');

  if (splashScreen) {
    setTimeout(() => {
      splashScreen.classList.add('hidden');
      if (pageContent && siteHeader) {
        pageContent.classList.add('visible');
        siteHeader.classList.add('visible');
      }
      setTimeout(() => {
        splashScreen.remove();
      }, 800);
    }, 3200);
  }

  // Slideshow za showRoom
  const slideshowImages = document.querySelectorAll('.slideshow-image');
  let currentIndex = 0;

  function showNextImage() {
    slideshowImages[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % slideshowImages.length;
    slideshowImages[currentIndex].classList.add('active');
  }

  // Postavi prvu sliku kao aktivnu
  if (slideshowImages.length > 0) {
    slideshowImages[0].classList.add('active');
    setInterval(showNextImage, 2500); // Menjaj svakih 2.5 sekundi
  }

})
document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const aboutSection = document.querySelector(".section.section--about");
  if (!aboutSection) return;

  const brandTrigger = aboutSection.querySelector(".brand-statement");
  const textAnimElements = aboutSection.querySelectorAll("[data-text-anim]");
  const icons = aboutSection.querySelectorAll(".brand-statement__icon");
  const ellipse = aboutSection.querySelector(".brand-statement__ellipse");

  if (brandTrigger && textAnimElements.length > 0 && ellipse) {
    const runBrandSplit = () => {
      const allAnimElements = [];

      textAnimElements.forEach((element) => {
        const isHighlight = element.classList.contains("is--highlight");

        if (!isHighlight) {
          const split = new SplitType(element, {
            types: "lines",
            lineClass: "split-line",
          });

          const lines = element.querySelectorAll(".split-line");

          const container = document.createElement("div");
          container.classList.add("split-lines-container");
          container.style.display = "flex";
          container.style.flexDirection = "column";

          lines.forEach((line) => {
            const wrapper = document.createElement("div");
            wrapper.classList.add("line-wrapper");
            wrapper.style.overflow = "hidden";
            wrapper.appendChild(line);
            container.appendChild(wrapper);
            allAnimElements.push(line);
          });

          element.innerHTML = "";
          element.appendChild(container);
        } else {
          allAnimElements.push(element);
        }
      });

      gsap.set(allAnimElements, {
        yPercent: 110,
        opacity: 0,
      });

      gsap.set(icons, {
        opacity: 0,
      });

      gsap.set(ellipse, {
        strokeDasharray: 4000,
        strokeDashoffset: 4000,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: brandTrigger,
          start: "center bottom",
          toggleActions: "play none none none",
        },
      });

      tl.to(allAnimElements, {
        yPercent: 0,
        opacity: 1,
        ease: "power3.out",
        duration: 1,
        stagger: 0.1,
      })
        .fromTo(
          ellipse,
          {
            strokeDashoffset: 4000,
          },
          {
            strokeDashoffset: 0,
            duration: 2,
            ease: "power3.out",
          },
          "-=0.2"
        )
        .to(
          icons,
          {
            opacity: 1,
            duration: 1,
            ease: "power3.out",
          },
          "<"
        )
        // ⬇️ Add text loop after all animations in brand-statement complete
        .call(() => {
          const highlightElements = Array.from(
            aboutSection.querySelectorAll(".text-size-large.is--highlight")
          );

          if (highlightElements.length < 2) return;

          let currentIndex = 0;
          const total = highlightElements.length;

          // Initial display setup
          highlightElements.forEach((el, index) => {
            el.style.display = index === 0 ? "block" : "none";
          });

          // Start loop
          setInterval(() => {
            const current = highlightElements[currentIndex];
            const nextIndex = (currentIndex + 1) % total;
            const next = highlightElements[nextIndex];

            current.style.display = "none";
            next.style.display = "block";

            currentIndex = nextIndex;
          }, 1000);
        });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(runBrandSplit);
    } else {
      runBrandSplit();
    }
  }

  const aboutTrigger = aboutSection.querySelector(".about__body");
  const description = aboutSection.querySelector(".about__description");
  const servicesParagraph = aboutSection.querySelector(".about__services p");
  const servicesListItems = aboutSection.querySelectorAll(
    ".about__services-list > *"
  );

  if (aboutTrigger && description && servicesParagraph && servicesListItems) {
    const runAboutSplit = () => {
      const split = new SplitType(description, {
        types: "lines",
        lineClass: "split-line",
      });

      const lines = description.querySelectorAll(".split-line");

      gsap.set(lines, {
        opacity: 0.2,
      });

      gsap.set(servicesParagraph, {
        opacity: 0.2,
      });

      gsap.set(servicesListItems, {
        opacity: 0.2,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: aboutTrigger,
          start: "center bottom",
          toggleActions: "play none none none",
        },
      });

      tl.to(lines, {
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.1,
      })
        .to(
          servicesParagraph,
          {
            opacity: 1,
            duration: 1,
            ease: "power3.out",
          },
          "<"
        )
        .to(
          servicesListItems,
          {
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            stagger: 0.2,
          },
          "<"
        );
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(runAboutSplit);
    } else {
      runAboutSplit();
    }
  }
});

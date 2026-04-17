/**
 * DATA MODEL: Valors extrets del document tècnic de l'ETAP.
 */
const etapLogic = {
    0: { turb: 100, gas: 100, path: 100, org: 100 },
    1: { turb: 100, gas: 100, path: 100, org: 100 },
    2: { turb: 100, gas: 100, path: 100, org: 100 },
    3: { turb: 100, gas: 10,  path: 100, org: 100 },
    4: { turb: 20,  gas: 10,  path: 100, org: 100 },
    5: { turb: 0,   gas: 5,   path: 90,  org: 100 },
    6: { turb: 0,   gas: 0,   path: 0,   org: 80  },
    7: { turb: 0,   gas: 0,   path: 0,   org: 0   }
};

// DOM Elements
const scene = document.getElementById('scene');
const pipeFlow = document.getElementById('pipe-flow');
const turbEl = document.getElementById('val-turb');
const gasEl = document.getElementById('val-gas');
const pathEl = document.getElementById('val-path');
const orgEl = document.getElementById('val-org');

/**
 * Funció d'animació suau per als números del Tracker (Smooth Counter)
 */
function animateValue(obj, targetValue, duration) {
    const currentValue = parseInt(obj.innerText.replace('%', '')) || 0;
    if (currentValue === targetValue) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // EaseOut Effect
        const easeOut = progress * (2 - progress);
        obj.innerHTML = Math.floor(easeOut * (targetValue - currentValue) + currentValue) + "%";
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = targetValue + "%";
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Intersection Observer (El motor de l'Scrollytelling)
 */
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const stepIndex = entry.target.getAttribute('data-step');
            const state = etapLogic[stepIndex];
            
            if (state) {
                // 1. Canviar classe geomètrica (Detona totes les variables de color CSS)
                scene.className = `scene escena-${stepIndex}`;
                
                // 2. Animar el flux de la canonada si el sistema està obert (> 0)
                if(stepIndex > 0) {
                    pipeFlow.style.transform = "translateX(0)";
                } else {
                    pipeFlow.style.transform = "translateX(-100%)";
                }

                // 3. Animar comptadors
                animateValue(turbEl, state.turb, 800);
                animateValue(gasEl, state.gas, 800);
                animateValue(pathEl, state.path, 800);
                animateValue(orgEl, state.org, 800);
            }
        }
    });
}, { threshold: 0.6 }); // Es dispara quan la caixa de text està ben entrada a la pantalla

// Iniciar l'observador per cada etapa de text
document.querySelectorAll('.step').forEach(s => observer.observe(s));
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

const scene = document.getElementById('scene');
const pipeFlow = document.getElementById('pipe-flow');
const turbEl = document.getElementById('val-turb');
const gasEl = document.getElementById('val-gas');
const pathEl = document.getElementById('val-path');
const orgEl = document.getElementById('val-org');
const steps = document.querySelectorAll('.step');

function animateValue(obj, targetValue, duration) {
    const currentValue = parseInt(obj.innerText.replace('%', '')) || 0;
    if (currentValue === targetValue) return;

    if(targetValue < 100) obj.style.color = "#1E88E5";
    else obj.style.color = "#0F172A";

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = progress * (2 - progress);
        obj.innerHTML = Math.floor(easeOut * (targetValue - currentValue) + currentValue) + "%";
        
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = targetValue + "%";
    };
    window.requestAnimationFrame(step);
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            
            // 1. Efecto Óptico (Opacidad / Escala)
            steps.forEach(s => s.classList.remove('active'));
            entry.target.classList.add('active');

            // 2. Lógica del Simulador
            const stepIndex = entry.target.getAttribute('data-step');
            const state = etapLogic[stepIndex];
            
            if (state) {
                scene.className = `scene escena-${stepIndex}`;
                
                if(stepIndex > 0) pipeFlow.style.transform = "translateX(0)";
                else pipeFlow.style.transform = "translateX(-100%)";

                animateValue(turbEl, state.turb, 600);
                animateValue(gasEl, state.gas, 600);
                animateValue(pathEl, state.path, 600);
                animateValue(orgEl, state.org, 600);
            }
        }
    });
}, { 
    // rootMargin dispara la activación solo cuando el elemento pasa por el 30% central
    root: document.getElementById('scroll-zone'),
    rootMargin: '-35% 0px -35% 0px', 
    threshold: 0 
});

steps.forEach(s => observer.observe(s));
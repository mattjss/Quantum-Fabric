document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Mouse coordinates and velocity tracking
    let mouse = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        prevX: window.innerWidth / 2,
        prevY: window.innerHeight / 2,
        velocity: 0,
        stillTime: 0
    };

    // Configuration object for all adjustable parameters
    const config = {
        gridSize: 25,
        particleSize: 1,
        glowIntensity: 10,
        auraSize: 1,
        auraSoftness: 0.5,
        mouseInfluence: 150,
        connectionOpacity: 0.05,
        animationSpeed: 0.3,
        particleColor: '#ffffff',
        connectionColor: '#87ceeb',
        floatIntensity: 0.1,
        returnSpeed: 20,
        connectionDistance: 1.5
    };
    
    // Aurora color palette function (matches Unicorn Studio shader)
    // Based on: a + b*cos(TAU*(c*t+d)) where d = vec3(0.56, 0.78, 0)
    function getAuroraPaletteColor(t) {
        const TAU = Math.PI * 2;
        const a = 0.5, b = 0.5, c = 1;
        const d = { r: 0.56, g: 0.78, b: 0 };
        
        return {
            r: Math.round(255 * (a + b * Math.cos(TAU * (c * t + d.r)))),
            g: Math.round(255 * (a + b * Math.cos(TAU * (c * t + d.g)))),
            b: Math.round(255 * (a + b * Math.cos(TAU * (c * t + d.b))))
        };
    }
    
    // Pre-calculate some aurora colors for reference
    const auroraColors = {
        primary: '#00d4aa',    // Teal/Cyan (t≈0.25)
        secondary: '#ff6090',  // Pink/Magenta (t≈0.5)
        tertiary: '#a855f7',   // Purple (t≈0.75)
        highlight: '#ffffff'   // White core
    };
    
    // Preset definitions
    const presets = {
        default: {
            gridSize: 25,
            particleSize: 1,
            glowIntensity: 10,
            auraSize: 1,
            auraSoftness: 0.5,
            mouseInfluence: 150,
            connectionOpacity: 0.05,
            animationSpeed: 0.3,
            particleColor: '#ffffff',
            connectionColor: '#87ceeb',
            floatIntensity: 0.1,
            returnSpeed: 20,
            connectionDistance: 1.5
        },
        gas: {
            gridSize: 40,
            particleSize: 1.5,
            glowIntensity: 10,
            auraSize: 1.2,
            auraSoftness: 0.6,
            mouseInfluence: 200,
            connectionOpacity: 0.02,
            animationSpeed: 0.8,
            particleColor: '#aaddff',
            connectionColor: '#4499cc',
            floatIntensity: 0.4,
            returnSpeed: 50,
            connectionDistance: 2.0
        },
        liquid: {
            gridSize: 20,
            particleSize: 2,
            glowIntensity: 15,
            auraSize: 1,
            auraSoftness: 0.7,
            mouseInfluence: 180,
            connectionOpacity: 0.12,
            animationSpeed: 0.4,
            particleColor: '#66ccff',
            connectionColor: '#0088cc',
            floatIntensity: 0.2,
            returnSpeed: 15,
            connectionDistance: 1.8
        },
        crystalline: {
            gridSize: 30,
            particleSize: 1.5,
            glowIntensity: 8,
            auraSize: 0.6,
            auraSoftness: 0.3,
            mouseInfluence: 80,
            connectionOpacity: 0.2,
            animationSpeed: 0.1,
            particleColor: '#ffffff',
            connectionColor: '#aaeeff',
            floatIntensity: 0.02,
            returnSpeed: 8,
            connectionDistance: 1.6
        },
        magnetic: {
            gridSize: 25,
            particleSize: 2,
            glowIntensity: 20,
            auraSize: 1,
            auraSoftness: 0.5,
            mouseInfluence: 250,
            connectionOpacity: 0.08,
            animationSpeed: 0.6,
            particleColor: '#ff6688',
            connectionColor: '#cc4466',
            floatIntensity: 0.15,
            returnSpeed: 12,
            connectionDistance: 1.4
        },
        cosmic: {
            gridSize: 35,
            particleSize: 1,
            glowIntensity: 12,
            auraSize: 1.3,
            auraSoftness: 0.8,
            mouseInfluence: 120,
            connectionOpacity: 0.03,
            animationSpeed: 0.15,
            particleColor: '#eeddff',
            connectionColor: '#8866cc',
            floatIntensity: 0.08,
            returnSpeed: 30,
            connectionDistance: 2.2
        }
    };
    
    let currentPreset = 'default';

    // Explosion settings
    let isExploding = false;
    const explosionForce = 15;
    const explosionDecay = 0.92;

    // Control panel functionality
    const controlsBtn = document.getElementById('controlsBtn');
    const controlPanel = document.getElementById('controlPanel');
    const closeBtn = document.getElementById('closeBtn');
    const panelBackdrop = document.getElementById('panelBackdrop');
    let isPanelOpen = false;
    let isAnimating = false;
    
    // Panel dimensions
    const PANEL_WIDTH = 300;
    const PANEL_PADDING = 20;
    const PANEL_TOP = 20;
    const PANEL_RIGHT = 20;
    let panelHeight = 0;
    
    // Animation timing
    const TRANSFORM_DURATION = 260;
    
    // Measure panel height once on load
    function measurePanelHeight() {
        // Temporarily show panel to measure
        controlPanel.style.cssText = `
            position: fixed;
            top: ${PANEL_TOP}px;
            right: ${PANEL_RIGHT}px;
            width: ${PANEL_WIDTH}px;
            padding: ${PANEL_PADDING}px;
            opacity: 0;
            pointer-events: none;
            height: auto;
        `;
        panelHeight = controlPanel.offsetHeight;
        controlPanel.style.cssText = '';
    }
    
    function setupPanelVariables() {
        const btnRect = controlsBtn.getBoundingClientRect();
        
        // Calculate button position from right edge
        const btnRight = window.innerWidth - btnRect.right;
        
        // Set CSS variables for start state (button position/size)
        controlPanel.style.setProperty('--start-top', `${btnRect.top}px`);
        controlPanel.style.setProperty('--start-right', `${btnRight}px`);
        controlPanel.style.setProperty('--start-width', `${btnRect.width}px`);
        controlPanel.style.setProperty('--start-height', `${btnRect.height}px`);
        controlPanel.style.setProperty('--start-padding', '0px');
        
        // Set CSS variables for end state (full panel)
        controlPanel.style.setProperty('--end-top', `${PANEL_TOP}px`);
        controlPanel.style.setProperty('--end-right', `${PANEL_RIGHT}px`);
        controlPanel.style.setProperty('--end-width', `${PANEL_WIDTH}px`);
        controlPanel.style.setProperty('--end-height', `${panelHeight}px`);
        controlPanel.style.setProperty('--end-padding', `${PANEL_PADDING}px`);
    }
    
    // Initialize
    measurePanelHeight();

    function openPanel() {
        if (isAnimating || isPanelOpen) return;
        isAnimating = true;
        
        // Setup positions based on current button location
        setupPanelVariables();
        
        // 1. Press feedback on button
        controlsBtn.classList.add('pressed');
        
        // 2. Start panel animation after brief press feedback
        setTimeout(() => {
            // Hide button
            controlsBtn.classList.add('hidden');
            controlsBtn.classList.remove('pressed');
            
            // Activate backdrop
            panelBackdrop.classList.add('active');
            
            // Start panel expansion
            controlPanel.classList.add('animating-open');
            
            // 3. After transform completes, set final state
            setTimeout(() => {
                controlPanel.classList.remove('animating-open');
                controlPanel.classList.add('open');
                isPanelOpen = true;
                isAnimating = false;
            }, TRANSFORM_DURATION);
            
        }, 50);
    }
    
    function closePanel() {
        if (isAnimating || !isPanelOpen) return;
        isAnimating = true;
        
        // Ensure we have the correct positions
        setupPanelVariables();
        
        // 1. Fade out content first (handled by CSS)
        controlPanel.classList.remove('open');
        controlPanel.classList.add('animating-close');
        
        // Deactivate backdrop
        panelBackdrop.classList.remove('active');
        
        // 2. After content fades, button starts appearing
        setTimeout(() => {
            controlsBtn.classList.remove('hidden');
            controlsBtn.classList.add('returning');
        }, 60);
        
        // 3. After transform completes, clean up
        setTimeout(() => {
            controlPanel.classList.remove('animating-close');
            controlsBtn.classList.remove('returning');
            isPanelOpen = false;
            isAnimating = false;
        }, TRANSFORM_DURATION);
    }

    controlsBtn.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);
    panelBackdrop.addEventListener('click', closePanel);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (isPanelOpen) {
            setupPanelVariables();
        }
    });

    // Control inputs
    const controls = {
        gridSize: document.getElementById('gridSize'),
        particleSize: document.getElementById('particleSize'),
        glowIntensity: document.getElementById('glowIntensity'),
        auraSize: document.getElementById('auraSize'),
        auraSoftness: document.getElementById('auraSoftness'),
        mouseInfluence: document.getElementById('mouseInfluence'),
        connectionOpacity: document.getElementById('connectionOpacity'),
        animationSpeed: document.getElementById('animationSpeed'),
        particleColor: document.getElementById('particleColor'),
        connectionColor: document.getElementById('connectionColor'),
        resetBtn: document.getElementById('resetBtn')
    };

    // Value display elements
    const valueDisplays = {
        gridSize: document.getElementById('gridSizeValue'),
        particleSize: document.getElementById('particleSizeValue'),
        glowIntensity: document.getElementById('glowIntensityValue'),
        auraSize: document.getElementById('auraSizeValue'),
        auraSoftness: document.getElementById('auraSoftnessValue'),
        mouseInfluence: document.getElementById('mouseInfluenceValue'),
        connectionOpacity: document.getElementById('connectionOpacityValue'),
        animationSpeed: document.getElementById('animationSpeedValue')
    };

    // Update configuration and display values
    function updateConfig(key, value) {
        config[key] = parseFloat(value);
        if (valueDisplays[key]) {
            valueDisplays[key].textContent = value;
        }
        
        // Reinitialize particles if grid size changed
        if (key === 'gridSize') {
            init();
        }
    }

    // Add event listeners for controls
    Object.keys(controls).forEach(key => {
        if (controls[key] && key !== 'resetBtn') {
            controls[key].addEventListener('input', (e) => {
                updateConfig(key, e.target.value);
            });
        }
    });

    // Preset selection
    const presetGrid = document.getElementById('presetGrid');
    const presetBtns = presetGrid.querySelectorAll('.preset-btn');
    
    function applyPreset(presetName, animate = true) {
        const preset = presets[presetName];
        if (!preset) return;
        
        currentPreset = presetName;
        
        // Update active button
        presetBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetName);
        });
        
        // Apply preset values to config and UI
        Object.keys(preset).forEach(key => {
            config[key] = preset[key];
            if (controls[key]) {
                controls[key].value = preset[key];
            }
            if (valueDisplays[key]) {
                valueDisplays[key].textContent = preset[key];
            }
        });
        
        // Reinitialize if grid size changed
        init();
    }
    
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
        });
    });

    // Reset button functionality
    controls.resetBtn.addEventListener('click', () => {
        applyPreset('default');
    });

    // Helper function to convert hex to rgba
    function hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // Helper to parse hex to RGB object
    function hexToRgb(hex) {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
        };
    }
    
    // Interpolate between two colors
    function lerpColor(color1, color2, t) {
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        return {
            r: Math.round(c1.r + (c2.r - c1.r) * t),
            g: Math.round(c1.g + (c2.g - c1.g) * t),
            b: Math.round(c1.b + (c2.b - c1.b) * t)
        };
    }
    
    // Get aurora color based on angle and time
    function getAuroraColor(angle, time, alpha = 1) {
        // Blend between aurora colors based on position
        const cycle = (Math.sin(angle + time) + 1) / 2;
        const cycle2 = (Math.sin(angle * 2 - time * 0.7) + 1) / 2;
        
        let color;
        if (cycle < 0.5) {
            color = lerpColor(auroraColors.primary, auroraColors.secondary, cycle * 2);
        } else {
            color = lerpColor(auroraColors.secondary, auroraColors.tertiary, (cycle - 0.5) * 2);
        }
        
        // Add some variation
        color.r = Math.min(255, color.r + Math.round(cycle2 * 30));
        color.g = Math.min(255, color.g + Math.round((1 - cycle2) * 20));
        
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }

    // Particle class
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.baseX = x;
            this.baseY = y;
            this.distance = 0;
            this.angle = Math.random() * Math.PI * 2;
            this.density = (Math.random() * 5) + 8;
            this.velocity = {
                x: 0,
                y: 0
            };
        }

        draw() {
            // Calculate proximity to mouse
            const proximityFactor = Math.max(0, 1 - (this.distance / config.mouseInfluence));
            
            // Aurora formation progress (0 to 1 over 4-5 seconds)
            const formationProgress = mouse.stillTime / AURORA_FORM_DURATION;
            
            // Color transition: dots moving toward center get aurora colors
            // Stronger effect as they get closer AND as aurora forms
            const colorBlend = proximityFactor * Math.min(1, formationProgress * 2) * (config.glowIntensity / 30);
            
            // Pick aurora color based on this particle's position angle
            const angleToMouse = Math.atan2(this.y - mouse.y, this.x - mouse.x);
            const colorPhase = (angleToMouse + Math.PI + auroraTime * 0.3) % (Math.PI * 2);
            const normalizedPhase = colorPhase / (Math.PI * 2);
            
            // Get aurora color from the same palette as the aurora effect
            const colorT = normalizedPhase * 0.55 + 0.5;
            const targetColor = getAuroraPaletteColor(colorT);
            
            // Blend from base color to aurora color as dot moves toward center
            const baseColor = hexToRgb(config.particleColor);
            const finalColor = {
                r: Math.round(baseColor.r + (targetColor.r - baseColor.r) * colorBlend),
                g: Math.round(baseColor.g + (targetColor.g - baseColor.g) * colorBlend),
                b: Math.round(baseColor.b + (targetColor.b - baseColor.b) * colorBlend)
            };
            
            // Particles in nucleus get glow that intensifies as aurora forms
            const inNucleus = proximityFactor > 0.3;
            const nucleusGlow = inNucleus ? (proximityFactor - 0.3) * config.glowIntensity * 0.6 * (0.3 + formationProgress * 0.7) : 0;
            
            if (nucleusGlow > 0) {
                ctx.shadowBlur = nucleusGlow;
                ctx.shadowColor = `rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`;
            }
            
            // Particle size grows as it approaches and as aurora forms
            const size = config.particleSize * (1 + proximityFactor * 0.4 * (0.5 + formationProgress * 0.5));
            
            // Create gradient for particle
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, size * 2
            );
            
            // Brighter as it approaches nucleus
            const alpha = 0.65 + proximityFactor * 0.35;
            const particleRgba = `rgba(${finalColor.r}, ${finalColor.g}, ${finalColor.b}, ${alpha})`;
            
            gradient.addColorStop(0, particleRgba);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            
            ctx.shadowBlur = 0;
        }

        explode() {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Particles closer to click point get more velocity
            const force = Math.max(0, 1 - (distance / 200)) * explosionForce;
            
            this.velocity.x = Math.cos(angle) * force;
            this.velocity.y = Math.sin(angle) * force;
        }

        update() {
            if (isExploding) {
                // Update position based on velocity
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                
                // Decay velocity
                this.velocity.x *= explosionDecay;
                this.velocity.y *= explosionDecay;
                
                // Gradually return to base position
                const dx = this.baseX - this.x;
                const dy = this.baseY - this.y;
                this.x += dx * 0.05;
                this.y += dy * 0.05;
                
                // Check if explosion is finished
                if (Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.y) < 0.1) {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
            } else {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                this.distance = distance;
                
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let maxDistance = config.mouseInfluence;
                let force = (maxDistance - distance) / maxDistance;
                
                if (force < 0) force = 0;
                
                // Apply animation speed multiplier
                let directionX = forceDirectionX * force * this.density * config.animationSpeed;
                let directionY = forceDirectionY * force * this.density * config.animationSpeed;

                if (distance < maxDistance) {
                    this.x += directionX;
                    this.y += directionY;
                } else {
                    // Smoother return to base position
                    if (this.x !== this.baseX) {
                        let dx = this.x - this.baseX;
                        this.x -= dx / config.returnSpeed;
                    }
                    if (this.y !== this.baseY) {
                        let dy = this.y - this.baseY;
                        this.y -= dy / config.returnSpeed;
                    }
                }
                
                // Add subtle floating motion
                this.angle += 0.02;
                this.x += Math.sin(this.angle) * config.floatIntensity;
                this.y += Math.cos(this.angle) * config.floatIntensity;
            }
        }
    }

    // Array to hold particles
    const particles = [];

    // Initialize particles in a grid
    function init() {
        particles.length = 0;
        
        const columns = Math.floor(window.innerWidth / config.gridSize);
        const rows = Math.floor(window.innerHeight / config.gridSize);
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
                particles.push(
                    new Particle(
                        x * config.gridSize + config.gridSize/2,
                        y * config.gridSize + config.gridSize/2
                    )
                );
            }
        }
    }

    function triggerExplosion() {
        isExploding = true;
        particles.forEach(particle => particle.explode());
        
        // Reset explosion state after a delay
        setTimeout(() => {
            isExploding = false;
        }, 1000);
    }

    // Aurora state (using Unicorn Studio embed)
    let auroraTime = 0;
    const auroraContainer = document.getElementById('auroraContainer');
    let auroraVisible = false;
    
    // Aurora timing: 4-5 seconds to fully form (270 frames at 60fps)
    const AURORA_FORM_DURATION = 270;
    
    function updateAurora() {
        auroraTime += 0.015;
        
        // Track stillness over full formation period
        mouse.stillTime = Math.min(mouse.stillTime + 1, AURORA_FORM_DURATION);
        
        // Aurora gradually forms over 4-5 seconds
        const formationProgress = mouse.stillTime / AURORA_FORM_DURATION;
        
        // Get aurora container size
        const auroraSize = 250;
        
        // Center aurora exactly at mouse position
        auroraContainer.style.left = (mouse.x - auroraSize / 2) + 'px';
        auroraContainer.style.top = (mouse.y - auroraSize / 2) + 'px';
        
        // Show/hide aurora based on stillness
        if (formationProgress > 0.3 && config.glowIntensity > 0) {
            if (!auroraVisible) {
                auroraContainer.classList.add('visible');
                auroraVisible = true;
            }
        } else {
            if (auroraVisible) {
                auroraContainer.classList.remove('visible');
                auroraVisible = false;
            }
        }
    }
    
    function collapseAurora() {
        // Fade out aurora
        auroraContainer.classList.remove('visible');
        auroraVisible = false;
        // Reset stillness so aurora has to rebuild
        mouse.stillTime = 0;
    }

    function drawConnections() {
        ctx.lineWidth = 0.5;
        const maxDist = config.gridSize * config.connectionDistance;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDist) {
                    const opacity = 1 - (distance / maxDist);
                    const connectionRgba = hexToRgba(config.connectionColor, opacity * config.connectionOpacity);
                    ctx.strokeStyle = connectionRgba;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update aurora position and visibility
        updateAurora();
        
        drawConnections();
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        init();
    });

    window.addEventListener('mousemove', (e) => {
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        
        // Calculate velocity
        const dx = mouse.x - mouse.prevX;
        const dy = mouse.y - mouse.prevY;
        mouse.velocity = Math.sqrt(dx * dx + dy * dy);
        
        // Reset still time when moving
        if (mouse.velocity > 2) {
            mouse.stillTime = 0;
        }
    });

    window.addEventListener('click', (e) => {
        // Don't trigger explosion if clicking on control panel or backdrop
        if (!controlPanel.contains(e.target) && !controlsBtn.contains(e.target) && !panelBackdrop.contains(e.target)) {
            // Collapse aurora into particles, then explode
            collapseAurora();
            triggerExplosion();
        }
    });

    resizeCanvas();
    init();
    animate();
});

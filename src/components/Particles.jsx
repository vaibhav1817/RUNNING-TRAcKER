import { useEffect, useRef } from 'react';

export default function Particles() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId; // Define at this scope

        // Set canvas to full screen
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Particle configuration
        const particlesArray = [];
        const numberOfParticles = 150; // Increased density for lush look

        class Particle {
            constructor() {
                // Initialize random position
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;

                // Depth/Size logic:
                // Size 0.5 - 3.0. 
                // Larger = Closer = Faster + More Opacity
                this.size = Math.random() * 2.5 + 0.5;

                // Speed correlated to size (Parallax effect)
                // Small (0.5) -> Speed ~0.5
                // Large (3.0) -> Speed ~1.5
                this.speedY = this.size * 0.4 + 0.2;
                this.speedX = 0; // Calculated per frame

                // Sway properties for "falling leaf" effect
                this.swayAngle = Math.random() * Math.PI * 2;
                this.swaySpeed = Math.random() * 0.02 + 0.005;
                this.swayAmplitude = Math.random() * 1.5 + 0.5;

                // Opacity: Larger is clearer
                this.opacity = (this.size / 3) * 0.8 + 0.1;
            }

            update() {
                // 1. Fall Down
                this.y += this.speedY;

                // 2. Sway (Sine wave)
                this.swayAngle += this.swaySpeed;
                this.speedX = Math.sin(this.swayAngle) * this.swayAmplitude;
                this.x += this.speedX;

                // 3. Reset to top if it goes off bottom
                if (this.y > canvas.height + 5) {
                    this.y = 0 - this.size;
                    this.x = Math.random() * canvas.width;
                    // Reset speeds occasionally for variety
                    this.speedY = this.size * 0.4 + 0.2;
                }

                // 4. Wrap around X (if wind blows it off)
                if (this.x > canvas.width + 5) this.x = -5;
                if (this.x < -5) this.x = canvas.width + 5;
            }

            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

                // Add soft glow to larger particles
                if (this.size > 2) {
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.fill();
                ctx.shadowBlur = 0; // Reset for next particle
            }
        }

        // Initialize
        const initParticles = () => {
            particlesArray.length = 0;
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }
        initParticles();

        // Animation Loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none', // Allow clicks to pass through
                zIndex: 0 // Just above background color, behind content
            }}
        />
    );
}

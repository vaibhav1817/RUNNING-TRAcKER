import { useState, useEffect } from "react";
import { Quote } from "lucide-react";

const quotes = [
    { text: "The miracle isn't that I finished. The miracle is that I had the courage to start.", author: "John Bingham" },
    { text: "Pain is inevitable. Suffering is optional.", author: "Haruki Murakami" },
    { text: "Your body can stand almost anything. It’s your mind that you have to convince.", author: "Unknown" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" },
    { text: "The only bad run is the one that didn't happen.", author: "Unknown" },
    { text: "Run when you can, walk if you have to, crawl if you must; just never give up.", author: "Dean Karnazes" },
    { text: "Success starts with self-discipline.", author: "Unknown" },
    { text: "It never gets easier, you just get better.", author: "Unknown" },
    { text: "If you run, you are a runner. It doesn't matter how fast or how far.", author: "John Bingham" },
    { text: "Run often. Run long. But never outrun your joy of running.", author: "Julie Isphording" },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { text: "A one hour run is 4% of your day. No excuses.", author: "Unknown" },
    { text: "Clear your mind of can't.", author: "Samuel Johnson" },
    { text: "Someone who is busier than you is running right now.", author: "Nike" },
    { text: "Running is the greatest metaphor for life, because you get out of it what you put into it.", author: "Oprah Winfrey" },
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
    { text: "You don't stop running because you get old, you get old because you stop running.", author: "Christopher McDougall" },
    { text: "The voice inside your head that says you can't do this is a liar.", author: "Unknown" },
    { text: "It's supposed to be hard. If it wasn't hard, everyone would do it. The hard... is what makes it great.", author: "Tom Hanks" }
];

export default function QuoteWidget() {
    const [quote, setQuote] = useState(quotes[0]);

    useEffect(() => {
        // Pick a random quote on mount (or could use day of year for consistency)
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setQuote(quotes[randomIndex]);
    }, []);

    return (
        <div style={{
            width: '100%',
            maxWidth: '100%',
            marginBottom: '24px',
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '0 12px 12px 0',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Quote size={20} color="#3b82f6" style={{ opacity: 0.6, transform: 'scaleX(-1)' }} />
                <p style={{
                    margin: 0,
                    fontSize: '16px', // Slightly smaller for standard font
                    fontFamily: 'inherit',
                    fontStyle: 'italic',
                    color: '#e2e8f0',
                    lineHeight: '1.5',
                    fontWeight: '400'
                }}>
                    {quote.text}
                </p>
            </div>
        </div>
    );
}

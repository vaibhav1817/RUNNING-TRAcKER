import { motion } from "framer-motion";

export default function Loader({ fullScreen = false }) {
    const spinner = (
        <motion.div
            style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(59, 130, 246, 0.3)",
                borderTop: "4px solid #3b82f6",
                borderRadius: "50%",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
    );

    if (fullScreen) {
        return (
            <div style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#020617', zIndex: 9999
            }}>
                {spinner}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            {spinner}
        </div>
    );
}
